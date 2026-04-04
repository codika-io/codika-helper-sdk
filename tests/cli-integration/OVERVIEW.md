# CLI Integration Test Suite — Overview

## What this is

A declarative test suite for the `codika` CLI. Each command has a markdown playbook describing every test: the exact bash command, expected output, and why it matters. Tests are executed manually (copy-paste) or by an agent, not by an automated runner.

## How testing works

1. **Setup** (one-time): `setup.md` creates the test organization, 4 API key profiles, and seed resources (projects, instances). This was already done — the profiles and resources exist.
2. **Execution**: Open a playbook, run each test in order, verify the expected output. Tests within a playbook often depend on ordering (e.g. deploy before publish, activate before deactivate).
3. **Logging**: Record pass/fail counts in `results/YYYY-MM-DD.md`.

### Test profiles

| Profile | Role | Scopes | Purpose |
|---------|------|--------|---------|
| `cli-test-owner-full` | Owner | All 11 | Happy path, admin operations |
| `cli-test-owner` | Owner | All 11 | Alternate owner key (same permissions) |
| `cli-test-member` | Member | All 11 | Member-level data filtering |
| `cli-test-limited` | Owner | `deploy:use-case`, `instances:read` | Scope enforcement (missing scopes) |
| Cross-org key (inline) | Other org | Varies | Organization isolation |
| Invalid/garbage keys | — | — | Auth failure paths |

### Test taxonomy

- **[P] Positive** — command succeeds, output is correct
- **[N] Negative** — command fails with correct error for bad input
- **[S] Security** — access control, scope enforcement, org isolation

---

## Operation estimates

### Total test cases: ~684

| Category | Count | % |
|----------|-------|---|
| Read-only API calls | ~170 | 25% |
| State-changing API calls | ~160 | 23% |
| Local-only (no API) | ~120 | 18% |
| Expected failures (exit before API) | ~80 | 12% |
| Security tests (mix of read/write) | ~154 | 22% |

### State-changing operations by type

These are the operations that actually create or modify resources on the platform:

| Operation | Count | Risk | Notes |
|-----------|-------|------|-------|
| `deploy use-case` | ~17 | Medium | Deploys to n8n, bumps versions. Uses existing test project. |
| `redeploy` | ~16 | Medium | Redeploys existing instances with param changes. `--force` required. |
| `instance activate/deactivate` | ~22 | Low | Toggles instance state. Tests restore original state. |
| `integration set` | ~8 | Low | Creates test integrations. Cleaned up by delete tests. |
| `integration delete` | ~6 | Low | Removes integrations created by set tests. |
| `organization create` | ~10 | **High** | Creates real orgs. Requires personal key (`ckp_`). Needs manual cleanup. |
| `organization create-key` | ~12 | Medium | Creates real API keys in the test org. Keys persist. |
| `organization update-key` | ~6 | Low | Modifies test key scopes/name. Tests restore original values. |
| `project create` | ~15 | Medium | Creates real projects in the test org. Projects persist. |
| `publish` | ~8 | **High** | Publishes to production, creates prod instances. Hard to undo. |
| `trigger` | ~6 | Medium | Triggers real workflow executions on n8n. |
| `deploy documents` | ~5 | Low | Uploads markdown docs to a project. |
| `deploy data-ingestion` | ~6 | Medium | Deploys DI config, bumps versions. |
| `notes upsert` | ~7 | Low | Creates/updates project notes. |
| `login` (with verify) | ~6 | Low | Verifies key against API, saves to config file. |
| `init` (with project) | ~5 | Medium | Scaffolds folder + creates project via API. |

**Total state-changing: ~155 operations**

### Operations per profile

| Profile | Read-only | State-changing | Failures | Total |
|---------|-----------|---------------|----------|-------|
| `cli-test-owner-full` | ~130 | ~120 | ~10 | ~260 |
| `cli-test-owner` | ~10 | ~15 | ~2 | ~27 |
| `cli-test-member` | ~15 | ~5 | ~2 | ~22 |
| `cli-test-limited` | ~5 | ~2 | ~30 | ~37 |
| Cross-org key | ~5 | ~2 | ~18 | ~25 |
| Invalid/no key | 0 | 0 | ~45 | ~45 |
| Personal key (`ckp_`) | 0 | ~10 | ~2 | ~12 |
| Local-only (no profile) | 0 | 0 | ~120 | ~120 |

---

## Recommended execution batches

Tests are grouped into 6 batches by dependency order and risk level. Run them in sequence — later batches depend on resources created or validated by earlier ones.

### Batch 0 — Prerequisites check
> Verify the test environment is still intact before running anything.

| Action | Command | What it checks |
|--------|---------|---------------|
| Profiles exist | `codika use --json` | All 4 profiles listed |
| Owner identity | `codika whoami --profile cli-test-owner-full --json` | Correct org, 11 scopes |
| Test project exists | `codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json` | Project accessible |
| Test instance exists | `codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json` | Instance accessible |

**Operations: 4 read-only. Duration: ~1 min.**

---

### Batch 1 — Local-only commands (no API, zero risk)
> Safe to run anytime. No network calls.

| Playbook | Tests | Operations |
|----------|-------|------------|
| `verify.md` | 34 | 0 API calls — all local validation |
| `config.md` | 27 | ~8 config file writes (some verify against API) |
| `auth.md` (whoami/use/logout) | ~20 | ~9 whoami API calls, rest local |
| `status.md` | 35 | ~6 whoami calls, rest local |

**Total: ~116 tests. API calls: ~23 read-only. Duration: ~15 min.**

---

### Batch 2 — Read-only API commands (no state changes)
> All GET operations. Cannot break anything.

| Playbook | Tests | Operations |
|----------|-------|------------|
| `list-projects.md` | 14 | 14 list calls |
| `list-instances.md` | 24 | 24 list calls |
| `list-executions.md` | 22 | 22 list calls |
| `get-project.md` | 15 | 15 get calls |
| `get-instance.md` | 21 | 21 get calls |
| `get-execution.md` | 25 | ~20 get calls |
| `get-skills.md` | 22 | ~18 get calls |
| `get-use-case.md` | 23 | ~18 get calls |

**Total: ~166 tests. API calls: ~152 read-only. Duration: ~30 min.**

---

### Batch 3 — Low-risk write commands (easily reversible)
> Creates notes, toggles instances, manages integrations. All reversible within the test.

| Playbook | Tests | Creates | Cleans up? |
|----------|-------|---------|------------|
| `notes.md` | 43 | ~7 note versions | Notes accumulate but are harmless |
| `instance-activate.md` | 24 | 0 (toggles only) | Yes — tests restore original state |
| `integration.md` | 37 | ~8 integrations | Yes — delete tests clean up set tests |
| `update-key.md` | 19 | 0 (modifies only) | Yes — tests restore original scopes |

**Total: ~123 tests. State changes: ~37 (all reversible). Duration: ~25 min.**

---

### Batch 4 — Medium-risk write commands (deployment pipeline)
> Deploys workflows, triggers executions, creates projects. Resources persist.

| Playbook | Tests | Creates | Cleans up? |
|----------|-------|---------|------------|
| `init.md` | 33 | ~5 projects + scaffold dirs | Dirs cleaned up. Projects persist. |
| `project-create.md` | 19 | ~10 projects | **No** — projects persist in the org |
| `deploy-use-case.md` | 36 | ~17 deployments | **No** — versions accumulate |
| `deploy-documents.md` | 24 | ~5 document uploads | **No** — docs persist |
| `deploy-data-ingestion.md` | 25 | ~6 DI deployments | **No** — DI versions accumulate |
| `trigger.md` | 26 | ~6 workflow executions | Executions are read-only after creation |
| `redeploy.md` | 34 | ~16 redeploys | **No** — param changes persist |

**Total: ~197 tests. State changes: ~65. Duration: ~40 min.**

**Cleanup note**: After this batch, the test org will have ~10 extra projects and multiple deployment versions. This is fine for a test environment but should be noted.

---

### Batch 5 — High-risk write commands (org creation, publishing)
> Creates real organizations and publishes to production. Run last and with care.

| Playbook | Tests | Creates | Cleans up? |
|----------|-------|---------|------------|
| `organization-create.md` | 27 | ~10 organizations | **No** — orgs persist. Need manual cleanup. |
| `organization-create-key.md` | 25 | ~12 API keys | **No** — keys persist. Can be revoked later. |
| `publish.md` | 29 | ~8 prod instances | **No** — prod instances are hard to remove. |
| `auth.md` (login tests) | ~8 | ~6 profile saves | Config file only |

**Total: ~89 tests. State changes: ~36. Duration: ~20 min.**

**Cleanup needed after this batch:**
- Delete test organizations created by `organization-create.md` (via Firebase console or API)
- Revoke throwaway API keys created by `organization-create-key.md`
- Deactivate prod instances created by `publish.md`

---

## Full suite summary

| Batch | Tests | Read API | Write API | Local | Risk | Duration |
|-------|-------|----------|-----------|-------|------|----------|
| 0 — Prereqs | 4 | 4 | 0 | 0 | None | 1 min |
| 1 — Local | ~116 | ~23 | ~8 | ~85 | None | 15 min |
| 2 — Read-only | ~166 | ~152 | 0 | ~14 | None | 30 min |
| 3 — Reversible writes | ~123 | ~20 | ~37 | ~66 | Low | 25 min |
| 4 — Deployments | ~197 | ~15 | ~65 | ~117 | Medium | 40 min |
| 5 — Org/publish | ~89 | ~5 | ~36 | ~48 | High | 20 min |
| **Total** | **~695** | **~219** | **~146** | **~330** | | **~2h 10min** |

### Resources created by a full run

| Resource | Count | Persistent? | Cleanup method |
|----------|-------|-------------|---------------|
| Organizations | ~10 | Yes | Firebase console or admin API |
| API keys | ~12 | Yes | `organization update-key` or console |
| Projects | ~25 | Yes | Archive via console (no CLI delete yet) |
| Deployment versions | ~23 | Yes | Accumulate harmlessly |
| Prod instances | ~8 | Yes | `instance deactivate` then archive |
| Document uploads | ~5 | Yes | Overwritten on next deploy |
| Notes | ~7 | Yes | Accumulate harmlessly |
| Integrations | ~2 net | No | Created then deleted within batch |
| Workflow executions | ~6 | Yes (read-only) | Expire naturally |
| Temp directories | ~20 | No | Cleaned up inline |

### Personal key profile

`organization-create.md` requires a **personal key** (`ckp_` prefix). The profile `cli-test-personal` is configured with scopes `organizations:create` and `api-keys:manage`. Use `--profile cli-test-personal` for Batch 5's org creation and key creation tests.
