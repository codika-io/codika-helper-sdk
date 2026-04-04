# CLI Integration Tests — Roadmap

Improvements discovered during testing, split into two tracks: the **test framework** itself and the **CLI** being tested.

For skipped tests specifically, see [SKIPS.md](SKIPS.md).

---

## Done

| Item | Track | When |
|------|-------|------|
| `config show --json` flag | CLI | 2026-04-04 |
| `update-key --scopes ""` validation | CLI | 2026-04-04 |
| `status --profile` flag | CLI | 2026-04-04 |
| `--environment` validation (`.choices(['dev', 'prod'])`) | CLI | 2026-04-04 |
| `init --project-id` writes organizationId | CLI | 2026-04-04 |
| `getExecutionDetailsPublic` scope fix (`executions:read`) | Cloud Function | 2026-04-04 |
| Playbook expectations updated (17 fixes across 9 files) | Framework | 2026-04-04 |
| Fresh test org for create-key tests (20-key limit) | Framework | 2026-04-04 |

---

## CLI Improvements

### Quick wins

**`--no-profile` flag for auth-bypass testing**
Several commands need to test "no API key" state. The workaround is `--profile nonexistent-profile-name`. A dedicated `--no-profile` flag would be cleaner. Partially resolved: `status` now supports `--profile`, but other commands could benefit from an explicit no-auth mode.

**`CODIKA_CONFIG_DIR` env var**
Allow overriding the config directory (`~/.config/codika/`) via environment variable. Unblocks 5 destructive tests that need an empty config file. Also useful for CI pipelines that need isolated config.

### UX improvements

**Exit code 2 for `verify` with bad paths**
`codika verify use-case /nonexistent` exits 1 (same as "violations found"). Exit 2 would distinguish CLI validation errors from verification results, consistent with every other command.

**`get use-case --target-version` for nonexistent versions**
Returns `success: true` with empty documents. Could return 404 or add a warning. Debatable: empty result is valid REST, but confusing UX.

### Flag consistency gaps

Found during the 2026-04-04 audit. Not bugs, but users expect these flags when they exist on similar commands.

| Command | Missing flag | Impact |
|---------|-------------|--------|
| `trigger` | `--environment` | Can't target dev vs prod without knowing the instance ID |
| `deploy use-case` | `--environment` | Same |
| `deploy documents` | `--environment` | Same |
| `deploy data-ingestion` | `--environment` | Same |
| `publish` | `--environment` | Same |
| `config show` | `--profile` | Can't inspect a specific profile without switching |
| `config set` | `--profile` | Can't set config for a non-active profile |
| `logout` | `--json` | Can't script logout operations |
| `use` | `--json` for switch action | `codika use <name> --json` doesn't output JSON confirmation |

---

## Test Framework Improvements

### Phase 1: Make playbooks executable (~1 day)

**Stable test IDs**
Replace positional references ("config.md #3") with stable IDs: `{#CF-03}`. Convention: 2-letter prefix + number. Makes results stable across playbook edits.

**Assert blocks**
Each test gets an executable `assert` fenced block alongside the prose `Expect`:
```markdown
## [P] Owner lists all projects {#LP-01}

```bash
codika list projects --profile cli-test-owner-full --json
```

```assert
codika list projects --profile cli-test-owner-full --json \
  | jq -e '.success == true and (.data.projects | length) == .data.count'
```
```

Turns "compare output visually" into "run and check exit code."

**Test fixtures directory**
Centralize test resources:
```
fixtures/
  valid-use-case/          config.ts + workflows/ that pass verify
  invalid-use-case/        missing Codika Init
  invalid-workflow.json    malformed JSON
  project-staging.json     alternative project file
  test-payload.json        trigger payload
  test-document.md         deploy documents input
  test-extra.md            --additional-file input
```
Unblocks 21 skipped tests (see SKIPS.md Category 1).

### Phase 2: Runner script (~half day)

A ~50 line bash script:
```bash
./run.sh commands/list-projects.md          # single playbook
./run.sh --batch 2                          # full batch
./run.sh --all                              # full suite
```
Parses `assert` blocks, runs them, prints PASS/FAIL, writes `results/YYYY-MM-DD.md`.

### Phase 3: Reproducibility (~half day)

**Snapshot/baseline mechanism**
First run captures golden JSON outputs. Subsequent runs diff against them. Use `jq -S` for key sorting. Update with `./run.sh --update-snapshot LP-01`.

**Playbook prerequisite headers**
```markdown
---
requires-profiles: [cli-test-owner-full, cli-test-member]
requires-resources: [test-project, dev-instance]
depends-on: [deploy-use-case]
---
```

### Phase 4: Long-term tracking (~half day)

**Regression diff**
```bash
./diff-results.sh results/2026-04-04.md results/2026-04-15.md
# Output: REGRESSION: LP-03, FIXED: CF-07, NEW: LP-11
```

**Staleness detection**
```markdown
<!-- covers: src/cli/commands/list/projects.ts -->
<!-- last verified against: commit abc1234 -->
```
Script flags playbooks where the covered source file changed since last verification.

### Phase 5: Full re-runnability (~1 day)

**Idempotent state-changing tests**
Use throwaway projects per run or assert relative conditions ("version higher than before") instead of absolute ones ("version is 1.1.0").
