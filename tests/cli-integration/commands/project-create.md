# `codika project create --name <name>`

Creates a new project on the Codika platform via API key. Optionally writes a `project.json` file to a specified directory containing `projectId` and `organizationId`. The organization ID is derived from the API key's org or from the `--organization-id` flag.

**Scope required**: `projects:create`
**Method**: POST (body: `{ name, description?, templateId?, organizationId? }`)
**Cloud Function**: `createProjectViaApiKey`

---

## [P] Happy path -- create project with JSON output

```bash
codika project create --name "CLI Test Project $(date +%s)" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.projectId` is a non-empty string, `requestId` present. Exit code 0. No `projectJsonPath` key (no `--path` given).

```bash
codika project create --name "CLI Test Project $(date +%s)" --profile cli-test-owner-full --json | jq '{success: .success, hasProjectId: (.data.projectId | length > 0), hasRequestId: (.requestId | length > 0), hasJsonPath: (has("projectJsonPath"))}'
```

**Expect**: `{"success": true, "hasProjectId": true, "hasRequestId": true, "hasJsonPath": false}`

**Why**: Core happy path -- verifies project creation via org API key and confirms the response shape matches `CreateProjectSuccessResponse`.

**Cleanup**: Delete the created project via Firestore console or API.

---

## [P] Human-readable output

```bash
codika project create --name "CLI Test Human $(date +%s)" --profile cli-test-owner-full
```

**Expect**: Output contains `Creating project "CLI Test Human ..."...`, then `✓ Project Created Successfully` with `Project ID:` and `Request ID:` lines. No `Wrote project.json` line (no `--path`).

**Why**: Verifies the non-JSON output path (lines 104-111 of `create.ts`). The `Creating project...` message only appears when `--json` is absent (line 72).

**Cleanup**: Delete the created project.

---

## [P] `--description` flag

```bash
codika project create --name "CLI Test Desc $(date +%s)" --description "Test project created by CLI integration tests" --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: The `description` field is conditionally added to the request body in `project-client.ts` (line 93: `if (description)`). This verifies the optional field passes through correctly.

**Cleanup**: Delete the created project.

---

## [P] `--template-id` flag

```bash
codika project create --name "CLI Test Template $(date +%s)" --template-id "two_stage" --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: The `templateId` field is conditionally added to the request body in `project-client.ts` (line 97: `if (templateId)`). The default template is `two_stage`, but explicitly passing it verifies the parameter is forwarded. The API should accept it without error.

**Cleanup**: Delete the created project.

---

## [P] `--organization-id` flag

```bash
codika project create --name "CLI Test Org $(date +%s)" --organization-id l0gM8nHm2o2lpupMpm5x --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: For org-scoped keys, `--organization-id` is optional (the Cloud Function derives it from the key). For admin/personal keys, it is required. This test verifies the flag is passed through to the API body (line 101 of `project-client.ts`).

**Cleanup**: Delete the created project.

---

## [P] `--path` writes project.json

```bash
DIR="/tmp/cli-test-pc-path-$(date +%s)" && mkdir -p "$DIR" && codika project create --name "CLI Test Path $(date +%s)" --path "$DIR" --profile cli-test-owner-full --json > /tmp/cli-test-pc-result.json && cat /tmp/cli-test-pc-result.json | jq '{success: .success, hasJsonPath: (.projectJsonPath | length > 0)}' && cat "$DIR/project.json" | jq 'keys'
```

**Expect**:
1. JSON output: `{"success": true, "hasJsonPath": true}`
2. `projectJsonPath` in output points to `$DIR/project.json`
3. File contents: keys are `["organizationId", "projectId"]` -- both non-empty strings

```bash
cat "$DIR/project.json" | jq '{hasProjectId: (.projectId | length > 0), hasOrgId: (.organizationId | length > 0)}'
```

**Expect**: `{"hasProjectId": true, "hasOrgId": true}`

**Why**: The `--path` flag triggers `writeProjectJson` (line 86-97 of `create.ts`). The `organizationId` comes from `--organization-id` flag first, then falls back to the active profile's `organizationId` (line 91: `getActiveProfile()?.profile.organizationId`). The `projectJsonPath` is appended to the JSON response (line 102).

**Cleanup**: `rm -rf "$DIR" /tmp/cli-test-pc-result.json` and delete the created project.

---

## [P] `--path` with `--project-file` writes custom filename

```bash
DIR="/tmp/cli-test-pc-file-$(date +%s)" && mkdir -p "$DIR" && codika project create --name "CLI Test Custom File $(date +%s)" --path "$DIR" --project-file project-staging.json --profile cli-test-owner-full --json > /tmp/cli-test-pc-file.json && cat /tmp/cli-test-pc-file.json | jq '.projectJsonPath' && ls "$DIR"
```

**Expect**:
1. `projectJsonPath` ends with `/project-staging.json` (not `project.json`)
2. `ls` output shows `project-staging.json` (no `project.json`)
3. File content has `projectId` and `organizationId` keys

**Why**: `--project-file` is passed to `writeProjectJson(dirPath, projectData, options.projectFile)` (line 96). The `resolveProjectFilePath` utility in `project-json.ts` uses the custom name instead of the default `project.json`. This enables multi-environment setups (e.g., `project-staging.json`, `project-client-a.json`).

**Cleanup**: `rm -rf "$DIR" /tmp/cli-test-pc-file.json` and delete the created project.

---

## [P] `--path` with `--organization-id` writes orgId from flag

When both `--path` and `--organization-id` are provided, the project.json should contain the org ID from the flag, not the profile.

```bash
DIR="/tmp/cli-test-pc-orgflag-$(date +%s)" && mkdir -p "$DIR" && codika project create --name "CLI Test OrgFlag $(date +%s)" --path "$DIR" --organization-id l0gM8nHm2o2lpupMpm5x --profile cli-test-owner-full --json > /dev/null && cat "$DIR/project.json" | jq '.organizationId'
```

**Expect**: `"l0gM8nHm2o2lpupMpm5x"`

**Why**: Line 91 of `create.ts`: `const orgId = options.organizationId || getActiveProfile()?.profile.organizationId`. The `--organization-id` flag takes priority over the profile's org. This matters for admin keys that span multiple organizations.

**Cleanup**: `rm -rf "$DIR"` and delete the created project.

---

## [P] Human-readable output with `--path`

```bash
DIR="/tmp/cli-test-pc-human-$(date +%s)" && mkdir -p "$DIR" && codika project create --name "CLI Test Human Path $(date +%s)" --path "$DIR" --profile cli-test-owner-full
```

**Expect**: Output includes `Wrote project.json to /tmp/cli-test-pc-human-.../project.json` line (line 112 of `create.ts`).

**Why**: Verifies the `projectJsonPath` message appears in human-readable mode, not just in JSON mode.

**Cleanup**: `rm -rf "$DIR"` and delete the created project.

---

## [P] `--api-key` flag overrides profile

```bash
codika project create --name "CLI Test ApiKey $(date +%s)" --api-key "$(codika config show --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --json | jq '.success'
```

**Expect**: `true`

**Why**: The `--api-key` flag is the highest priority in the resolution chain (`resolveApiKey` in `config.ts`). This verifies inline key usage works without a profile, which is the CI/CD pattern.

**Cleanup**: Delete the created project.

---

## [N] Missing `--name` (required option)

```bash
codika project create --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error about required option `--name` missing. The process exits before making any API call. Exit code is non-zero.

**Why**: `--name` is declared with `.requiredOption()` in Commander (line 20). Commander catches this before the action handler runs, so no HTTP request is made.

---

## [N] Empty name

```bash
codika project create --name "" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Either Commander error for empty required option, or API-level error about invalid name. Exit code non-zero.

**Why**: Edge case -- Commander's `requiredOption` checks presence of the flag, but an empty string may pass through to the API. Either the CLI or the Cloud Function should reject it.

---

## [N] Missing API key -- no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
env -u CODIKA_API_KEY codika project create --name "CLI Test NoKey" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key" (the `API_KEY_MISSING_MESSAGE` constant). Exit code `2` (CLI validation error, not `1`). The `--json` flag is irrelevant here because `exitWithError` writes to stderr and calls `process.exit(2)` directly (line 130-133 of `create.ts`).

**Why**: Verifies the early-exit guard (line 67-69) before any HTTP call. Exit code 2 distinguishes CLI validation errors from API errors (exit code 1).

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read` but NOT `projects:create`.

```bash
codika project create --name "CLI Test Scope $(date +%s)" --profile cli-test-limited --json | jq '{success: .success, error: .error.message}'
```

**Expect**: `success: false`, error message contains `projects:create`. Exit code 1.

**Why**: The Cloud Function requires `hasScope('projects:create')`. The limited key authenticates successfully but is rejected at the scope check layer.

---

## [S] Member can create projects

```bash
codika project create --name "CLI Test Member $(date +%s)" --profile cli-test-member --json | jq '.success'
```

**Expect**: `true`

**Why**: Project creation is scope-based, not role-based. Any key with `projects:create` scope can create projects. The member key has all 11 scopes (see setup.md). The created project's `createdBy` field is set to the member's userId (`rILcnT0NfogoBEXbSTHPqxvTEEA2`).

**Cleanup**: Delete the created project.

---

## [S] Cross-org key cannot create in test org

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not be able to create projects in the test org (`l0gM8nHm2o2lpupMpm5x`).

```bash
codika project create --name "CLI Test CrossOrg $(date +%s)" --organization-id l0gM8nHm2o2lpupMpm5x --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq '{success: .success, error: .error.message}'
```

**Expect**: `success: false`, error about org mismatch or unauthorized.

**Why**: Org-scoped API keys are bound to their organization. The Cloud Function validates that the key's org matches the target org. A key from org B cannot create projects in org A, even when explicitly passing `--organization-id`.

---

## [S] Invalid API key

```bash
codika project create --name "CLI Test Invalid" --api-key "cko_garbage_key_here" --json | jq '{success: .success, error: .error.message}'
```

**Expect**: `success: false`, error about unauthorized or invalid key. Exit code 1.

**Why**: Auth middleware rejects invalid keys before the Cloud Function's business logic runs. The `X-Process-Manager-Key` header (line 110 of `project-client.ts`) is validated first.

---

## [N] `--project-file` without `--path` is ignored

```bash
codika project create --name "CLI Test OrphanFile $(date +%s)" --project-file custom.json --profile cli-test-owner-full --json | jq 'has("projectJsonPath")'
```

**Expect**: `false`

**Why**: The `writeProjectJson` call is gated by `if (options.path && isCreateProjectSuccess(result))` (line 86). Without `--path`, no file is written regardless of `--project-file`. The `projectJsonPath` key is only added to the response when a file was actually written (line 102).

---

## [N] `--path` to non-existent directory

```bash
codika project create --name "CLI Test BadPath $(date +%s)" --path /tmp/cli-test-nonexistent-dir-$(date +%s)/nested --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: The project may be created on the API side (`success: true` in the response), but `writeFileSync` in `writeProjectJson` throws because the directory does not exist. The catch block (line 33-45 of `create.ts`) catches this and exits with code 1. If `--json`, the error is wrapped in `{success: false, error: {message: ...}}`.

**Why**: The API call happens before the file write (line 75-82 vs. line 86-97). A filesystem error after successful creation means the project exists on the platform but the local project.json was not written. This is an important edge case to document.

**Cleanup**: If the project was created, delete it via Firestore.

---

## Flag coverage matrix

| Flag | Test(s) |
|------|---------|
| `--name` | Happy path, Missing name, Empty name |
| `--description` | `--description` flag |
| `--template-id` | `--template-id` flag |
| `--organization-id` | `--organization-id` flag, `--path` with `--organization-id`, Cross-org |
| `--path` | `--path` writes project.json, Human-readable with `--path`, `--path` to non-existent dir |
| `--project-file` | `--project-file` writes custom filename, `--project-file` without `--path` |
| `--json` | Happy path (JSON), Human-readable (no --json) |
| `--profile` | Used in every profile-based test |
| `--api-key` | `--api-key` override, Cross-org, Invalid key |
| `--api-url` | Not tested (infrastructure flag, tested via setup) |

---

## Last tested

Not yet tested.
