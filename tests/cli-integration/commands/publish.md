# `codika publish <templateId>`

Publishes a deployed use case to production, making it live for end users. Optionally creates a prod process instance and saves `prodProcessInstanceId` to project.json. Supports visibility control, instance sharing scope, and dev/prod auto-toggle.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, processDeploymentId, visibility?, sharedWith?, autoToggleDevProd?, skipAutoCreateProdInstance? }`)
**Cloud Function**: `publishProcessDeploymentPublic`

**Test prerequisite**: A valid `templateId` from a prior deployment. Check `project.json` deployments for a known template ID, or deploy first with `codika deploy use-case`.

---

## [P] Happy path -- publish with JSON output

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version` present, `data.processDeploymentId` matches the input templateId, `data.processInstanceId` present (prod instance auto-created). Exit code 0.

**Why**: Core happy path -- verifies the full publish flow: project ID resolution from project.json, API call, prod instance creation, and project.json update with `prodProcessInstanceId`.

---

## [P] Human-readable output

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full
```

**Expect**: Output starts with "Publishing deployment to production..." followed by Template ID, Project ID (with source in parentheses, e.g. `(from project.json)`), then prints `✓ Published successfully!` with Version, Template ID, Prod Instance ID. No JSON in output.

**Why**: Verifies the formatted output path works end-to-end, including the project ID source indicator and the success banner with all three data fields.

---

## [P] `--project-id` overrides project.json

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, deployment is published to the specified project. The `--project-id` flag takes priority over any project.json in cwd.

**Why**: `resolveProjectId` checks `flagValue` first. This confirms the highest-priority resolution path works and that no project.json is needed when the flag is provided.

---

## [P] `--project-file` overrides default project.json

```bash
codika publish <templateId> --path /path/to/use-case --project-file project-staging.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The project ID is read from `project-staging.json` instead of the default `project.json`. Human-readable output would show `(from project-staging.json)` as the source.

**Why**: Verifies the second-priority resolution path. Users with multiple project files (e.g. per-client or per-environment) rely on `--project-file` to target the right project without switching directories.

---

## [P] `--path` resolves project.json from a different directory

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The CLI reads project.json from the specified `--path` directory, not from cwd. The `prodProcessInstanceId` is written back to that same path's project.json.

**Why**: Confirms `resolve(options.path || process.cwd())` correctly sets `useCasePath`, and both read and write operations target the right directory.

---

## [P] `--visibility private`

```bash
codika publish <templateId> --path /path/to/use-case --visibility private --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The process visibility is set to `private` (only the owner can see it).

**Why**: Tests the first of three valid visibility values. Visibility is applied on first publish only.

---

## [P] `--visibility organizational`

```bash
codika publish <templateId> --path /path/to/use-case --visibility organizational --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The process visibility is set to `organizational` (all org members can see it).

**Why**: Tests the second visibility value, which is the most common for internal team processes.

---

## [P] `--visibility public`

```bash
codika publish <templateId> --path /path/to/use-case --visibility public --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The process visibility is set to `public` (anyone on the platform can see it).

**Why**: Tests the third visibility value. Public processes appear in the marketplace.

---

## [P] `--shared-with owner_only`

```bash
codika publish <templateId> --path /path/to/use-case --shared-with owner_only --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The prod instance is accessible only to the process owner.

**Why**: Tests the most restrictive sharing scope. Only meaningful for organizational or public processes.

---

## [P] `--shared-with admins`

```bash
codika publish <templateId> --path /path/to/use-case --shared-with admins --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The prod instance is accessible to organization admins.

**Why**: Tests the default sharing scope for organizational processes.

---

## [P] `--shared-with everyone`

```bash
codika publish <templateId> --path /path/to/use-case --shared-with everyone --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The prod instance is accessible to all organization members.

**Why**: Tests the most permissive sharing scope.

---

## [P] `--visibility` and `--shared-with` combined

```bash
codika publish <templateId> --path /path/to/use-case --visibility organizational --shared-with everyone --profile cli-test-owner-full --json
```

**Expect**: `success: true`. Both options are passed to the API in the same request. Human-readable output shows both "Visibility: organizational" and "Shared With: everyone" in the pre-request summary.

**Why**: Verifies that both optional fields can be set together on first publish, which is the typical flow for organizational processes.

---

## [P] `--skip-prod-instance` flag

```bash
codika publish <templateId> --path /path/to/use-case --skip-prod-instance --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` is absent or null (no prod instance created). The `prodProcessInstanceId` is NOT written to project.json (the `if (result.data.processInstanceId)` guard prevents it).

**Why**: Some deployments need publishing without creating a prod instance (e.g. shared processes where instances are created separately per user). Confirms `skipAutoCreateProdInstance: true` is sent to the API.

---

## [P] `--auto-toggle-dev-prod` flag

```bash
codika publish <templateId> --path /path/to/use-case --auto-toggle-dev-prod --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The API receives `autoToggleDevProd: true`, causing the dev instance to pause when prod is active. Human-readable output includes "Auto Toggle: dev paused when prod active" in the pre-request summary.

**Why**: Prevents both dev and prod instances from running simultaneously, avoiding duplicate executions from scheduled or webhook triggers.

---

## [P] `--skip-prod-instance` human-readable output

```bash
codika publish <templateId> --path /path/to/use-case --skip-prod-instance --profile cli-test-owner-full
```

**Expect**: Pre-request summary includes "Prod Instance: skipped". Success output shows Version and Template ID but does NOT show "Prod Instance ID" line (the `if (result.data.processInstanceId)` guard skips it).

**Why**: Verifies the human-readable output correctly omits the Prod Instance ID line when `--skip-prod-instance` is used, rather than showing a null or empty value.

---

## [P] `prodProcessInstanceId` saved to project.json

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full --json
cat /path/to/use-case/project.json | jq '.prodProcessInstanceId'
```

**Expect**: After a successful publish (without `--skip-prod-instance`), `project.json` contains a `prodProcessInstanceId` field matching `data.processInstanceId` from the response.

**Why**: Verifies the `updateProjectJson` side effect. Downstream commands (e.g. `codika redeploy`) rely on this field being present in project.json.

---

## [N] Missing `<templateId>` argument

```bash
codika publish --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Commander prints a usage error about the missing required argument. Exit code is non-zero (Commander's default behavior for missing arguments).

**Why**: The `<templateId>` is a required positional argument defined via `.argument('<templateId>', ...)`. Commander handles this before `runPublish` is ever called.

---

## [N] Invalid `--visibility` value

```bash
codika publish <templateId> --path /path/to/use-case --visibility invalid_scope --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `Invalid visibility: "invalid_scope". Must be one of: private, organizational, public`. Exit code `2`.

**Why**: Client-side validation at line 96-98. The `exitWithError` function writes to stderr and exits with code 2, before any API call is made. The `--json` flag is irrelevant because `exitWithError` always writes to stderr (never JSON).

---

## [N] Invalid `--shared-with` value

```bash
codika publish <templateId> --path /path/to/use-case --shared-with invalid_scope --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `Invalid shared-with: "invalid_scope". Must be one of: owner_only, admins, everyone`. Exit code `2`.

**Why**: Client-side validation at line 102-104. Same `exitWithError` pattern as visibility validation.

---

## [N] No project ID available -- no flag, no project.json

```bash
codika publish <templateId> --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

Run from a directory with no `project.json` and without `--project-id` or `--project-file`.

**Expect**: `success: false`, error message contains "No project ID found". Exit code `1`. The error lists the four resolution options (project create, project.json, --project-id, --project-file).

**Why**: `resolveProjectId` throws when all three sources (flag, project file, project.json in cwd) are exhausted. The `try/catch` in the action handler catches it and exits with code 1 (not 2, because this is thrown inside `runPublish`, not via `exitWithError`).

---

## [N] No project ID available -- human-readable output

```bash
codika publish <templateId> --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

Run from a directory with no `project.json`.

**Expect**: Stderr shows `Error: No project ID found...` with the four resolution hints. Exit code `1`.

**Why**: Same error path as above but through the non-JSON catch block: `console.error(\`Error: ${error.message}\`)`.

---

## [N] Nonexistent template ID

```bash
codika publish nonexistent_template_id --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about template not found or invalid deployment ID. Exit code `1`.

**Why**: The Cloud Function validates the template ID exists in Firestore. This is an API-level error (exit code 1), not a CLI validation error.

---

## [N] Nonexistent template ID -- human-readable output

```bash
codika publish nonexistent_template_id --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full
```

**Expect**: Output shows `✗ Publish failed: <code> — <message>` with the error code and message from the API. Exit code `1`.

**Why**: Verifies the `isPublishError` branch formats the error with both code and message in the human-readable path.

---

## [N] Missing API key -- no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var.

```bash
env -u CODIKA_API_KEY codika publish some_template_id --project-id h8iCqSgTjSsKySyufq36 --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key" (the `API_KEY_MISSING_MESSAGE` constant). Exit code `2`. The `--json` flag is irrelevant because `exitWithError` always writes to stderr and never produces JSON.

**Why**: Verifies the early-exit guard at line 87-89. `resolveApiKey` returns null/undefined, triggering `exitWithError(API_KEY_MISSING_MESSAGE)`. This is a CLI validation error (exit code 2), not an API error.

---

## [N] `--project-file` points to nonexistent file

```bash
codika publish <templateId> --project-file nonexistent-project.json --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Error about project ID resolution failure (the file does not exist, so `readProjectJson` returns null, and `resolveProjectId` throws). Exit code `1`.

**Why**: Verifies the fallthrough when `--project-file` is specified but the file doesn't exist. This goes through the `try/catch` path (exit code 1), not `exitWithError` (exit code 2).

---

## [N] Unexpected API response shape

If the API returns a response that is neither a success nor an error shape (fails both `isPublishSuccess` and `isPublishError` type guards):

**Expect**: JSON output: `{ success: false, error: { message: "Unexpected API response" } }`. Human-readable: `✗ Unexpected API response`. Exit code `1`.

**Why**: Verifies the fallback block at lines 175-180. This is a defensive guard against unexpected API changes. Difficult to trigger in practice but important for robustness.

---

## [S] Scope enforcement -- limited key has `deploy:use-case`

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true` (or API-level error unrelated to scope), because `deploy:use-case` covers publishing.

**Why**: Publishing shares the `deploy:use-case` scope with deployment. Confirms a key with minimal scopes can still publish.

---

## [S] Cross-org isolation

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or org mismatch. Exit code `1`.

**Why**: The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It cannot publish to a project in the test org (`l0gM8nHm2o2lpupMpm5x`). Confirms organization-level data isolation holds.

---

## [S] Invalid API key

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_invalid_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code `1`.

**Why**: Auth middleware rejects invalid keys before business logic. This is an API error (exit code 1), not a CLI validation error (the key format passes the `resolveApiKey` check).

---

## Last tested

Not yet tested.
