# CLI Integration Tests

Declarative test guides for the `codika` CLI. Each file describes **what to run**, **what to expect**, and **why** — an agent or human executes the commands and verifies the results.

## How it works

```
tests/cli-integration/
  README.md              ← You are here
  setup.md               ← One-time environment setup (org, users, keys, resources)
  commands/              ← One file per CLI command
    list-projects.md
    get-project.md
    get-instance.md
    update-key.md
    ...
  security/              ← Cross-cutting security tests
    scope-enforcement.md
    cross-org-isolation.md
    role-access.md
  results/               ← Test run logs (dated)
    YYYY-MM-DD.md
```

## Running tests

1. **First time**: Follow `setup.md` to create the test environment
2. **Per command**: Open the command's `.md` file, run each command, verify the expected result
3. **Security sweep**: Run the files in `security/` to verify access control across all endpoints
4. **Log results**: Create a dated file in `results/` with pass/fail counts

## Test profiles

All tests use 4 profiles representing different access levels in the test organization:

| Profile | Role | Scopes | Tests |
|---|---|---|---|
| `cli-test-owner-full` | Owner | All 11 (incl. `projects:read`) | Happy path, admin operations |
| `cli-test-member` | Member | All 11 (incl. `projects:read`) | Member-level access filtering |
| `cli-test-limited` | Owner | `deploy:use-case` + `instances:read` | Scope enforcement |
| Cross-org key (inline) | Other org | Varies | Organization isolation |

## Test taxonomy

Each command file uses these tags:

- **[P] Positive** — command succeeds, output is correct
- **[N] Negative** — command fails with correct error for bad input
- **[S] Security** — access control, scope enforcement, org isolation

## Adding a new command test

1. Create `commands/<command-name>.md`
2. Follow the template: scope, prerequisites, then positive/negative/security test blocks
3. Each test = one `codika ...` command + expected outcome + why it matters
4. Add a row to the command index below

## Command index

| Command | File | Tests | Status |
|---|---|---|---|
| `list projects` | [commands/list-projects.md](commands/list-projects.md) | 10 | Tested 2026-03-31 |
| `get project` | [commands/get-project.md](commands/get-project.md) | 12 | Tested 2026-03-31 |
| `get instance` | [commands/get-instance.md](commands/get-instance.md) | 12 | Tested 2026-03-31 |
| `organization update-key` | [commands/update-key.md](commands/update-key.md) | 13 | Tested 2026-03-31 |
| `list instances` | [commands/list-instances.md](commands/list-instances.md) | — | Stub |
| `list executions` | [commands/list-executions.md](commands/list-executions.md) | — | Stub |
| `get execution` | [commands/get-execution.md](commands/get-execution.md) | — | Stub |
| `get use-case` | [commands/get-use-case.md](commands/get-use-case.md) | — | Stub |
| `get skills` | [commands/get-skills.md](commands/get-skills.md) | — | Stub |
| `project create` | [commands/project-create.md](commands/project-create.md) | — | Stub |
| `organization create` | [commands/organization-create.md](commands/organization-create.md) | — | Stub |
| `organization create-key` | [commands/organization-create-key.md](commands/organization-create-key.md) | — | Stub |
| `instance activate/deactivate` | [commands/instance-activate.md](commands/instance-activate.md) | — | Stub |
| `deploy use-case` | [commands/deploy-use-case.md](commands/deploy-use-case.md) | — | Stub |
| `deploy documents` | [commands/deploy-documents.md](commands/deploy-documents.md) | — | Stub |
| `deploy data-ingestion` | [commands/deploy-data-ingestion.md](commands/deploy-data-ingestion.md) | — | Stub |
| `publish` | [commands/publish.md](commands/publish.md) | — | Stub |
| `redeploy` | [commands/redeploy.md](commands/redeploy.md) | — | Stub |
| `trigger` | [commands/trigger.md](commands/trigger.md) | — | Stub |
| `integration set/list/delete` | [commands/integration.md](commands/integration.md) | — | Stub |
| `verify use-case/workflow` | [commands/verify.md](commands/verify.md) | — | Stub |
| `login/logout/whoami/use` | [commands/auth.md](commands/auth.md) | — | Stub |
| `config set/show/clear` | [commands/config.md](commands/config.md) | — | Stub |
| `init` | [commands/init.md](commands/init.md) | — | Stub |
| `status` | [commands/status.md](commands/status.md) | — | Stub |
