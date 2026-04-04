# CLI Integration Test Suite

Declarative integration tests for the `codika` CLI. Every CLI command has a markdown playbook describing the exact bash commands to run, the expected output, and why each test matters.

This is not automated unit testing — it's **procedural manual testing** designed to be executed by an agent or human, one command at a time, with results recorded in a dated log.

## Folder structure

```
tests/cli-integration/
  README.md                ← You are here — framework guide
  CLAUDE.md                ← Agent instructions for executing tests
  OVERVIEW.md              ← Operation estimates, risk levels, batch plan
  setup.md                 ← Test environment config (org, profiles, resources)

  commands/                ← One playbook per command (26 files, ~684 tests)
    auth.md                   login, logout, whoami, use
    config.md                 config set, show, clear
    status.md                 status
    init.md                   init (scaffold + project creation)
    verify.md                 verify use-case, verify workflow
    deploy-use-case.md        deploy use-case
    deploy-documents.md       deploy documents
    deploy-data-ingestion.md  deploy process-data-ingestion
    publish.md                publish
    redeploy.md               redeploy
    trigger.md                trigger
    project-create.md         project create
    organization-create.md    organization create
    organization-create-key.md  organization create-key
    update-key.md             organization update-key
    list-projects.md          list projects
    list-instances.md         list instances
    list-executions.md        list executions
    get-project.md            get project
    get-instance.md           get instance
    get-execution.md          get execution
    get-use-case.md           get use-case
    get-skills.md             get skills
    instance-activate.md      instance activate, instance deactivate
    integration.md            integration set, list, delete
    notes.md                  notes upsert, list, get

  security/                ← Cross-cutting security sweeps
    scope-enforcement.md      Verify every endpoint rejects insufficient scopes
    cross-org-isolation.md    Verify org data never leaks between organizations
    role-access.md            Verify owner/member/admin see the right data

  results/                 ← Dated test run logs
    2026-03-31.md             First partial run (63/63 pass — 4 commands)
    YYYY-MM-DD.md             One file per test session
```

## How a playbook works

Each playbook follows a consistent structure (using `list-projects.md` as the reference):

```markdown
# `codika <command>`

Description of what the command does.

**Scope required**: `<scope-name>`
**Method**: GET/POST
**Cloud Function**: `<functionName>`

---

## [P] Happy path — Owner lists all projects          ← Test tag + title

\`\`\`bash
codika list projects --profile cli-test-owner-full --json
\`\`\`

**Expect**: `success: true`, `data.projects` is an array...  ← What to verify
**Why**: Confirms the basic flow works...                     ← Why this test exists

---

## [N] Invalid API key                                 ← Negative test

\`\`\`bash
codika list projects --api-key "cko_garbage_key" --json
\`\`\`

**Expect**: Exit code 1, `success: false`...
**Why**: Verifies auth middleware rejects...

---

## Last tested

2026-03-31 — 10/10 PASS
```

### Test tags

- **[P] Positive** — command succeeds, output matches expectations
- **[N] Negative** — command fails correctly for bad input (wrong args, missing flags, invalid data)
- **[S] Security** — access control works (wrong scope rejected, other org's data invisible, member sees subset)

### Exit code conventions

| Code | Meaning | When |
|------|---------|------|
| 0 | Success | Command completed normally |
| 1 | API/runtime error | Server rejected request, network failure, unexpected error |
| 2 | CLI validation error | Missing required flag, invalid argument format, file not found |

Tests that check error paths use `2>&1; echo "EXIT:$?"` to capture and verify exit codes.

## Test profiles

All tests use 5 named profiles + 1 inline key, representing different access levels:

| Profile | Key prefix | Role | Scopes | Purpose |
|---------|-----------|------|--------|---------|
| `cli-test-owner-full` | `cko_` | Owner | All 11 | Happy path, admin operations |
| `cli-test-owner` | `cko_` | Owner | All 11 | Alternate owner (same perms, different key) |
| `cli-test-member` | `cko_` | Member | All 11 | Member-level data filtering |
| `cli-test-limited` | `cko_` | Owner | 2 scopes | Scope enforcement (should be rejected) |
| `cli-test-personal` | `ckp_` | Personal | `organizations:create`, `api-keys:manage` | Org creation tests |
| Cross-org key (inline) | `cko_` | Other org | Varies | Organization isolation |

The test organization is `l0gM8nHm2o2lpupMpm5x`. See `setup.md` for full details (user IDs, resource IDs, how profiles were created).

## Testing procedure

### Step 1 — Verify the environment

Before any test run, confirm the test environment is intact:

```bash
codika whoami --profile cli-test-owner-full --json   # Should show 11 scopes
codika whoami --profile cli-test-member --json        # Should show member role
codika use --json                                     # Should list all 5 profiles
```

If profiles are missing, re-run the setup steps in `setup.md`.

### Step 2 — Pick your batch

Tests are organized in 6 batches by risk level (see `OVERVIEW.md` for full details):

| Batch | What | Risk | Tests | Duration |
|-------|------|------|-------|----------|
| 0 | Environment check | None | 4 | 1 min |
| 1 | Local-only commands (verify, config, auth, status) | None | ~116 | 15 min |
| 2 | Read-only API commands (list, get) | None | ~166 | 30 min |
| 3 | Reversible writes (notes, integrations, activate, update-key) | Low | ~123 | 25 min |
| 4 | Deployments (init, project, deploy, trigger, redeploy) | Medium | ~197 | 40 min |
| 5 | Org creation & publishing | High | ~89 | 20 min |

You can run a single playbook, a single batch, or the full suite. Batches are independent except:
- Batch 4 needs existing test projects/instances (created during setup)
- Batch 5 creates new orgs that need manual cleanup afterward

### Step 3 — Run a playbook

Open the playbook file. For each test:

1. **Run the command** exactly as written (copy-paste the bash block)
2. **Compare the output** against the **Expect** section
3. **Record the result**: PASS or FAIL
4. If FAIL, note what differed (wrong output, wrong exit code, unexpected error)
5. If a test has a **Cleanup** section, run it before the next test

### Step 4 — Log the results

Create a file in `results/` named with today's date:

```
results/YYYY-MM-DD.md
```

Use this structure:

```markdown
# Test Run — YYYY-MM-DD

## Environment

- CLI version: `codika --version`
- Node: `node --version`
- Active profile: cli-test-owner-full
- Test org: l0gM8nHm2o2lpupMpm5x

## Results

| Playbook | Tests | Pass | Fail | Notes |
|----------|-------|------|------|-------|
| verify.md | 34 | 34 | 0 | |
| config.md | 27 | 26 | 1 | #3 — config show missing base URL field |
| ... | | | | |
| **Total** | **X** | **Y** | **Z** | |

## Failures

### config.md #3 — [P] Shows custom base URL when configured

**Expected**: Profile row shows `https://custom.example.com`
**Actual**: Base URL field is absent from output
**Root cause**: TBD / Bug filed / Fixed in commit abc123

## Issues Discovered

(Infrastructure problems found during testing — missing indexes, stale deployments, etc.)

## Cleanup Performed

(Resources created during this run that were cleaned up — orgs deleted, keys revoked, etc.)
```

### Step 5 — Handle failures

When a test fails:

1. **Re-read the playbook** — is the expected output still accurate? (CLI may have changed)
2. **Check the environment** — is the test profile still configured? Is the test resource still there?
3. **Reproduce** — run the command again. Transient failures (network, rate limits) happen.
4. **Classify**:
   - **Playbook bug**: the test expectation is wrong → fix the playbook
   - **CLI bug**: the CLI behaves incorrectly → file a bug, note it in results
   - **Environment issue**: missing resource, stale deployment → fix and re-run
5. **Log it** in the Failures section of the results file regardless of cause

## Adding a new command test

When a new CLI command is added:

1. Create `commands/<command-name>.md` following the playbook format above
2. Include [P], [N], and [S] tests (security tests only for commands that call the API)
3. Cover every `.option()` flag with at least one [P] test
4. Test both `--json` and human-readable output
5. Test every `exitWithError()` path with a [N] test
6. Add a row to the command index below
7. Update `OVERVIEW.md` batch assignments if the command creates resources

## Command index

| Command | File | Tests | Last status |
|---|---|---|---|
| `login/logout/whoami/use` | [commands/auth.md](commands/auth.md) | 36 | Updated 2026-04-04 |
| `config set/show/clear` | [commands/config.md](commands/config.md) | 27 | Updated 2026-04-04 |
| `status` | [commands/status.md](commands/status.md) | 35 | Updated 2026-04-04 |
| `init` | [commands/init.md](commands/init.md) | 33 | Updated 2026-04-04 |
| `verify use-case/workflow` | [commands/verify.md](commands/verify.md) | 34 | Updated 2026-04-04 |
| `deploy use-case` | [commands/deploy-use-case.md](commands/deploy-use-case.md) | 36 | Updated 2026-04-04 |
| `deploy documents` | [commands/deploy-documents.md](commands/deploy-documents.md) | 24 | Updated 2026-04-04 |
| `deploy data-ingestion` | [commands/deploy-data-ingestion.md](commands/deploy-data-ingestion.md) | 25 | Updated 2026-04-04 |
| `publish` | [commands/publish.md](commands/publish.md) | 29 | Updated 2026-04-04 |
| `redeploy` | [commands/redeploy.md](commands/redeploy.md) | 34 | Updated 2026-04-04 |
| `trigger` | [commands/trigger.md](commands/trigger.md) | 26 | Updated 2026-04-04 |
| `project create` | [commands/project-create.md](commands/project-create.md) | 19 | Updated 2026-04-04 |
| `organization create` | [commands/organization-create.md](commands/organization-create.md) | 27 | Updated 2026-04-04 |
| `organization create-key` | [commands/organization-create-key.md](commands/organization-create-key.md) | 25 | Updated 2026-04-04 |
| `organization update-key` | [commands/update-key.md](commands/update-key.md) | 19 | Updated 2026-04-04 |
| `list projects` | [commands/list-projects.md](commands/list-projects.md) | 14 | Updated 2026-04-04 |
| `list instances` | [commands/list-instances.md](commands/list-instances.md) | 24 | Updated 2026-04-04 |
| `list executions` | [commands/list-executions.md](commands/list-executions.md) | 22 | Updated 2026-04-04 |
| `get project` | [commands/get-project.md](commands/get-project.md) | 15 | Updated 2026-04-04 |
| `get instance` | [commands/get-instance.md](commands/get-instance.md) | 21 | Updated 2026-04-04 |
| `get execution` | [commands/get-execution.md](commands/get-execution.md) | 25 | Updated 2026-04-04 |
| `get use-case` | [commands/get-use-case.md](commands/get-use-case.md) | 23 | Updated 2026-04-04 |
| `get skills` | [commands/get-skills.md](commands/get-skills.md) | 22 | Updated 2026-04-04 |
| `instance activate/deactivate` | [commands/instance-activate.md](commands/instance-activate.md) | 24 | Updated 2026-04-04 |
| `integration set/list/delete` | [commands/integration.md](commands/integration.md) | 37 | Updated 2026-04-04 |
| `notes upsert\|list\|get` | [commands/notes.md](commands/notes.md) | 43 | Updated 2026-04-04 |
| `completion` | — | — | Excluded (local-only, no API) |
