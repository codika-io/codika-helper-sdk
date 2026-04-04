# CLI Integration Test Suite — Agent Instructions

You are in the Codika CLI integration test directory. This folder contains declarative test playbooks for every `codika` CLI command.

## Your role

You execute tests by running the bash commands in the playbook files, comparing the output against expected results, and recording pass/fail in a results log.

## Before you start

1. Read `README.md` for the full framework guide (folder structure, procedure, result format)
2. Read `setup.md` for test profile names, org IDs, and resource IDs you'll reference
3. Read `OVERVIEW.md` for batch ordering and risk levels

## Executing a playbook

For each test in a playbook:

1. **Run the bash command** exactly as written
2. **Compare output** against the **Expect** section:
   - For `--json` tests: check the JSON fields and values
   - For human-readable tests: check the formatted output structure
   - For error tests: check the exit code (`echo $?`) and error message
3. **Record**: PASS if output matches, FAIL if it doesn't
4. **If FAIL**: capture the actual output for the results log
5. **If Cleanup section exists**: run it before the next test

## Result logging

Create or append to `results/YYYY-MM-DD.md` using the template in `README.md` Step 4. Always include:
- Environment info (CLI version, node version)
- Per-playbook pass/fail counts
- Full details for every failure (expected vs actual)
- Issues discovered (infrastructure problems, missing indexes, etc.)
- Cleanup performed (resources created that were cleaned up)

## Key rules

- **Never skip [S] security tests** — they verify access control. A passing [P] test means nothing if [S] tests aren't run.
- **Run tests in playbook order** — some tests depend on state from earlier tests (e.g. deploy before publish, set before delete).
- **Always restore state** — if a test modifies a key's scopes or toggles an instance, the cleanup step must undo it.
- **Use exact profile names** — `cli-test-owner-full`, `cli-test-owner`, `cli-test-member`, `cli-test-limited`, `cli-test-personal`. Don't use `--api-key` with raw keys unless the test specifically says to.
- **Cross-org key is inline** — the cross-org key is `cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs` (from `setup.md`). Always use `--api-key` for cross-org tests.
- **Exit code verification** — for [N] and [S] tests, always verify exit codes. Use `command 2>&1; echo "EXIT:$?"` if the playbook doesn't already include it.
- **Clean up temp files** — delete any `/tmp/` directories or files created during testing. Don't leave artifacts.

## Batch execution order

If running the full suite, follow this order (lower batches are safer):

| Batch | Playbooks | Risk |
|-------|-----------|------|
| 0 | Environment check (see README) | None |
| 1 | verify, config, auth, status | None |
| 2 | list-projects, list-instances, list-executions, get-project, get-instance, get-execution, get-use-case, get-skills | None |
| 3 | notes, instance-activate, integration, update-key | Low |
| 4 | init, project-create, deploy-use-case, deploy-documents, deploy-data-ingestion, trigger, redeploy | Medium |
| 5 | organization-create, organization-create-key, publish, auth (login tests) | High |

## When a test fails

1. **Don't immediately mark the playbook as failing** — re-run once to rule out transient issues
2. **Check if the playbook expectation is outdated** — the CLI may have changed since the playbook was written
3. **Classify the failure**:
   - **Playbook bug** → the expected output is wrong → note it, suggest a fix
   - **CLI bug** → the CLI behaves incorrectly → log it as a real failure
   - **Environment issue** → missing profile, stale resource → fix the environment and re-run
4. **Always log the failure** in the results file with expected vs actual output

## Scope of these tests

These tests cover the `codika` CLI tool (npm package `codika`). They do NOT test:
- The SvelteKit frontend
- Cloud Functions directly (only indirectly through CLI calls)
- n8n workflow execution logic
- The cova-gateway or agent framework

The CLI source code is at `../../src/cli/commands/`. Skill definitions are at `../../../../agents/codika-marketplace/plugins/codika/skills/`. Documentation is at `../../../docs/operations/`.
