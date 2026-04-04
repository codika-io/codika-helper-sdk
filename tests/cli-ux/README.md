# CLI UX Testing

Goal-based friction testing for the `codika` CLI. Instead of verifying commands produce correct output (that's `../cli-integration/`), this tests whether an agent or new user can **accomplish real tasks** using the CLI without hand-holding.

## How it differs from functional testing

| | Functional (`cli-integration/`) | UX (`cli-ux/`) |
|---|---|---|
| **Input** | Exact command to run | A goal to accomplish |
| **Output** | Pass/fail per command | Friction log per scenario |
| **Tests** | The code | The experience |
| **Fails when** | Wrong output or exit code | Agent struggles, retries, or gets stuck |
| **Example** | "Run `codika deploy use-case ./my-uc --json`, expect `success: true`" | "Deploy a use case to production. Figure it out." |

## Methodology

### 1. Give the agent a scenario

Each scenario file describes:
- **Starting state**: what exists (profiles, projects, files on disk)
- **Goal**: what the agent must accomplish, in plain language
- **No commands**: the agent must discover the right commands itself
- **Success criteria**: how to verify the goal was achieved

### 2. Observe, don't help

The agent uses `codika --help`, reads error messages, and figures it out. The tester (human or meta-agent) watches and records:
- Every command the agent ran
- Every error it encountered
- Whether it recovered on its own or got stuck
- How many attempts each step took
- What information was missing or misleading

### 3. Record a friction log

The output is a **friction log** — a timestamped narrative of what happened, annotated with friction levels:

| Level | Meaning | Example |
|-------|---------|---------|
| **None** | Agent got it right first try | Ran `codika list projects`, got the project ID |
| **Low** | One retry, recovered from error message | Missing `--project-id`, error message suggested `--path`, agent adapted |
| **Medium** | Multiple retries, had to use `--help` or guess | Tried 3 flag combinations before finding `--environment prod` |
| **High** | Got stuck, needed external help or gave up | Error said "403 Forbidden" with no hint about scopes |
| **Blocker** | Impossible without prior knowledge | No way to discover that `publish` requires a template ID from `project.json` |

### 4. Extract improvements

Each friction log entry maps to a potential CLI improvement:
- **High/Blocker friction** → error messages need more context, or a new command/flag is needed
- **Medium friction** → help text could be clearer, or flags could have better defaults
- **Low friction** → working as intended, error recovery is good

## Folder structure

```
tests/cli-ux/
  README.md              ← You are here
  CLAUDE.md              ← Agent instructions for running UX tests
  scenarios/             ← Goal-based test scenarios
    first-deployment.md
    debug-failed-execution.md
    setup-new-org.md
    add-integration.md
    ...
  friction-logs/         ← Dated observation logs
    YYYY-MM-DD-scenario-slug.md
```

## Scenario format

```markdown
# Scenario: <title>

## Starting state

- Profile `cli-test-owner-full` is configured
- Project "Test Project Owner" exists (ID: h8iCqSgTjSsKySyufq36)
- A use case folder exists at `/tmp/test-uc/` with config.ts and workflows/

## Goal

Deploy the use case and make it available in production.

## Constraints

- You may use `codika --help` and subcommand help
- You may read error messages and adapt
- You may NOT read the playbooks in `cli-integration/commands/`
- You may NOT read the skill definitions or documentation

## Success criteria

- [ ] Use case is deployed (version exists)
- [ ] Use case is published (prod instance exists and is active)
- [ ] Agent can trigger a workflow and get a result

## Notes for observer

Watch for:
- Does the agent discover the deploy → publish → trigger sequence?
- Does it figure out version management (patch/minor/major)?
- Does it know to pass `--profile` or does it rely on the active profile?
```

## Friction log format

```markdown
# Friction Log: <scenario> — YYYY-MM-DD

## Environment

- CLI version: X.Y.Z
- Executor: agent / human
- Scenario: <scenario-file>

## Timeline

### Step 1 — <what the agent tried to do>

**Command**: `codika deploy use-case ./my-uc --json`
**Result**: Exit 2 — "No project ID found"
**Friction**: Medium
**Recovery**: Agent ran `codika deploy use-case --help`, found `--project-id` flag, re-ran with it
**Improvement opportunity**: Error message could suggest "Use --project-id or create a project.json with `codika init`"

### Step 2 — ...

## Summary

| Metric | Value |
|--------|-------|
| Total commands run | 12 |
| Errors encountered | 4 |
| Self-recovered | 3 |
| Got stuck | 1 |
| Overall friction | Medium |

## Improvement suggestions

1. `deploy use-case` error for missing project ID should suggest `--path` or `codika init`
2. `publish` should accept a project ID, not just a template ID — the template ID is hard to discover
3. ...
```

## Scenario ideas

| Scenario | Tests | Key friction points to watch |
|----------|-------|------------------------------|
| **First deployment** | deploy → publish → trigger flow | Command sequencing, version management, template ID discovery |
| **Debug failed execution** | list executions → get execution → read error | Error detail depth, `--deep` flag discovery, sub-workflow tracing |
| **Setup new org** | org create → create key → create project → init → deploy | Key type requirements (`ckp_`), scope selection, profile management |
| **Add integration** | integration set with secrets | Secret format (`KEY=VALUE`), context type, OAuth vs CLI distinction |
| **Fetch and redeploy** | get use-case → modify → redeploy with params | Parameter override syntax, `--force` requirement, version preservation |
| **Multi-environment** | deploy to dev → publish to prod → toggle | Environment flag, auto-toggle behavior, instance state management |
| **Access control setup** | create keys with different scopes → verify isolation | Scope naming, which scopes are needed for what, member vs owner |
| **Recover from errors** | intentionally broken state → fix it | Error message quality, suggested next steps, diagnostic commands |
