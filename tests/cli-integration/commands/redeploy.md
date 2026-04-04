# `codika redeploy`

Redeploys a deployment instance with optional parameter overrides. Does NOT create a new template version -- only updates runtime parameters and re-runs placeholder replacement. Resolves the process instance ID from `--process-instance-id`, or auto-resolves from `project.json` (`devProcessInstanceId` for dev, `prodProcessInstanceId` for prod). Parameters can be provided via `--param KEY=VALUE` (repeatable), `--params` JSON string, or `--params-file` path, with layered merge priority.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ processInstanceId, deploymentParameters?, forceRedeploy? }`)
**Cloud Function**: `redeployDeploymentInstancePublic`

**Test instance (dev)**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`
**Test instance (prod)**: `019d444e-290a-721b-9ce3-f3d454eb6d0e`

---

## [P] Happy path -- redeploy with explicit instance ID (JSON)

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.deploymentStatus` = `"deployed"`, `data.deploymentInstanceId` is a non-empty string, `data.n8nWorkflowIds` is an array with at least one entry. Exit code 0.

**Why**: Core happy path -- verifies the redeploy flow with explicit instance targeting. Uses `--force` because the instance is in deployed state.

---

## [P] Human-readable output

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full
```

**Expect**: Output shows `Redeploying instance...`, then `Instance ID:   019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`, `Environment:   dev`, then `✓ Redeployed successfully!` with `Status:`, `Instance ID:`, and `Workflows:       N deployed`. No JSON structure in output.

**Why**: Verifies the formatted human-readable output path (the `!options.json` branch).

---

## [P] `--param` single override

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param COMPANY_NAME=TestCorp --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. Human-readable output (without `--json`) shows `Parameters:    1 override(s)`.

**Why**: The `--param KEY=VALUE` flag is the primary way to override deployment parameters (`INSTPARM` placeholders) during redeploy. Only the specified parameter changes; all others are preserved by the backend.

---

## [P] Multiple `--param` flags

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param KEY1=value1 --param KEY2=value2 --force --profile cli-test-owner-full
```

**Expect**: `success: true`. Human-readable output shows `Parameters:    2 override(s)`.

**Why**: `--param` is repeatable via Commander's variadic collector (`(value, previous) => previous.concat([value])`). Each occurrence adds to the `deploymentParameters` map.

---

## [P] `--param` with value containing equals sign

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param "WEBHOOK_URL=https://example.com?token=abc123" --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The parser uses `indexOf('=')` for the first `=` only, so the value `https://example.com?token=abc123` is preserved intact.

**Why**: Edge case -- the code splits on the first `=` via `p.indexOf('=')` and `p.slice(eqIndex + 1)`, so values containing `=` are handled correctly.

---

## [P] `--params` JSON string

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params '{"COMPANY_NAME":"TestCorp","WEBHOOK_URL":"https://example.com"}' --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both parameters are included in the deployment request.

**Why**: The `--params` flag accepts a JSON string for bulk parameter override, useful for CI scripts and agent automation.

---

## [P] `--params-file` flag

```bash
echo '{"COMPANY_NAME":"FromFile"}' > /tmp/test-redeploy-params.json && codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params-file /tmp/test-redeploy-params.json --force --profile cli-test-owner-full --json && rm /tmp/test-redeploy-params.json
```

**Expect**: `success: true`, parameter from file is used in the deployment.

**Why**: File-based parameters are useful for complex parameter sets. The file is read via `readFileSync` and parsed with `JSON.parse`.

---

## [P] Parameter merge priority -- `--param` wins over `--params` and `--params-file`

```bash
echo '{"KEY":"from-file"}' > /tmp/test-merge-params.json && codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params-file /tmp/test-merge-params.json --params '{"KEY":"from-json"}' --param KEY=from-flag --force --profile cli-test-owner-full --json && rm /tmp/test-merge-params.json
```

**Expect**: `success: true`. The parameter `KEY` sent to the API has value `from-flag`. Human-readable output shows `Parameters:    1 override(s)`.

**Why**: The merge order is: `--params-file` (layer 1, lowest) -> `--params` (layer 2) -> `--param` (layer 3, highest). Each layer spreads over the previous: `{ ...paramsFile, ...paramsJson, ...paramFlags }`. This test verifies the highest-priority source wins.

---

## [P] No parameters -- preserves existing

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The request body has no `deploymentParameters` field (it is `undefined` when no params are provided). The backend preserves all existing parameters unchanged.

**Why**: When `Object.keys(deploymentParameters).length === 0`, the code sets `finalParams = undefined` and omits `deploymentParameters` from the request body. This is the retry-only scenario.

---

## [P] `--force` flag

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full
```

**Expect**: `success: true`. Human-readable output shows `Force:         yes` in the pre-request summary. The request body includes `forceRedeploy: true`.

**Why**: The `--force` flag triggers a full redeploy even on non-failed instances. Without `--force`, redeploying a `deployed` instance may be rejected by the backend.

---

## [P] `--force` flag absent -- redeploy deployed instance

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: Either `success: true` (if the backend allows it) or `success: false` with an error about the instance not being in a failed state. The request body does NOT contain `forceRedeploy`. The human-readable output does NOT show the `Force:` line.

**Why**: Verifies that omitting `--force` sends `forceRedeploy: undefined` (omitted from the request body). The backend behavior depends on the instance's current status.

---

## [P] `--environment dev` (default)

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full
```

**Expect**: Human-readable output shows `Environment:   dev`. This is the default value.

**Why**: The `--environment` option defaults to `'dev'` in the Commander option definition. The environment is displayed in human-readable output but not sent to the API (the API only receives the resolved process instance ID).

---

## [P] `--environment prod` with explicit instance ID

```bash
codika redeploy --process-instance-id 019d444e-290a-721b-9ce3-f3d454eb6d0e --environment prod --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.deploymentStatus` = `"deployed"`. Human-readable output shows `Environment:   prod`.

**Why**: Verifies that `--environment prod` works with explicit `--process-instance-id`. The environment flag only affects auto-resolution from project.json, but is always displayed in the human-readable output.

---

## [P] Auto-resolve instance ID from project.json (dev)

Requires a directory with a `project.json` containing `devProcessInstanceId`. Use the test use-case path that has a project.json with the dev instance ID.

```bash
codika redeploy --path /path/to/use-case-with-project-json --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The instance ID is resolved from `project.json`.`devProcessInstanceId` because `--environment` defaults to `dev`.

**Why**: Auto-resolution via `readProjectJson()` eliminates the need to copy-paste instance IDs during iterative development. The code calls `resolve(options.path || process.cwd())` then `readProjectJson(useCasePath, options.projectFile)`.

---

## [P] Auto-resolve instance ID for prod environment

Requires a directory with a `project.json` containing `prodProcessInstanceId`.

```bash
codika redeploy --path /path/to/use-case-with-project-json --environment prod --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The instance ID is resolved from `project.json`.`prodProcessInstanceId`.

**Why**: The `--environment prod` branch reads `projectJson.prodProcessInstanceId` instead of `devProcessInstanceId`. Verifies the environment switch in the resolution chain.

---

## [P] `--project-file` custom project file

Requires a custom project file (e.g., `project-client.json`) in a known use-case directory.

```bash
codika redeploy --path /path/to/use-case --project-file project-client.json --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The instance ID is resolved from the custom project file instead of the default `project.json`.

**Why**: The `--project-file` flag is passed to `readProjectJson(useCasePath, options.projectFile)` which calls `resolveProjectFilePath()` to resolve it relative to the base path. Useful for multi-project use cases (e.g., one use case deployed to multiple clients).

---

## [P] `--profile` flag

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The API key is resolved from the `cli-test-owner-full` profile.

**Why**: The `--profile` flag is passed to `resolveApiKey(options.apiKey, options.profile)` and `resolveEndpointUrl('redeployDeploymentInstance', options.apiUrl, options.profile)`. Verifies profile-based authentication works.

---

## [P] `--api-key` flag overrides profile

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --api-key "$(codika config show --profile cli-test-owner-full --json 2>/dev/null | jq -r '.apiKey')" --json
```

**Expect**: `success: true`. The explicit `--api-key` flag takes precedence over any profile or environment variable.

**Why**: The resolution chain is: `--api-key` flag > env var > profile. This verifies the highest-priority source works.

---

## [N] No process instance ID available

Run from a directory with no `project.json` and without `--process-instance-id`:

```bash
codika redeploy --path /tmp --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`. Stderr contains `No process instance ID found` followed by two resolution options (pass `--process-instance-id`, or ensure `project.json` exists). The `exitWithError()` function writes to stderr and calls `process.exit(2)`.

**Why**: When `readProjectJson()` returns `null` (no project.json in /tmp), the code hits the first `exitWithError()` at line 87. This tests the "all sources fail" path.

---

## [N] Missing `devProcessInstanceId` in project.json

Requires a project.json with a `projectId` but no `devProcessInstanceId`:

```bash
mkdir -p /tmp/test-redeploy-noid && echo '{"projectId":"test"}' > /tmp/test-redeploy-noid/project.json && codika redeploy --path /tmp/test-redeploy-noid --profile cli-test-owner-full 2>&1; echo "EXIT:$?"; rm -rf /tmp/test-redeploy-noid
```

**Expect**: Exit code `2`. Stderr contains `No devProcessInstanceId found in project.json` and suggests running `codika deploy use-case` first.

**Why**: When project.json exists but lacks `devProcessInstanceId`, the code hits the `exitWithError()` at line 105. This is the dev-environment-specific resolution failure.

---

## [N] Missing `prodProcessInstanceId` in project.json

```bash
mkdir -p /tmp/test-redeploy-noprod && echo '{"projectId":"test","devProcessInstanceId":"abc"}' > /tmp/test-redeploy-noprod/project.json && codika redeploy --path /tmp/test-redeploy-noprod --environment prod --profile cli-test-owner-full 2>&1; echo "EXIT:$?"; rm -rf /tmp/test-redeploy-noprod
```

**Expect**: Exit code `2`. Stderr contains `No prodProcessInstanceId found in project.json` and suggests running `codika publish` first.

**Why**: When `--environment prod` is specified but project.json lacks `prodProcessInstanceId`, the code hits the `exitWithError()` at line 98. Verifies the prod-specific resolution failure path.

---

## [N] Invalid `--param` format -- missing equals sign

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param "no-equals-sign" --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`. Stderr contains `Invalid --param format: "no-equals-sign". Expected KEY=VALUE`.

**Why**: The code checks `p.indexOf('=') === -1` and calls `exitWithError()` at line 131. Client-side validation prevents malformed parameters from reaching the API.

---

## [N] Invalid `--params` JSON string

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params 'not-valid-json' --force --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. Error message about JSON parse failure. The `JSON.parse()` at line 124 throws, which is caught by the top-level try/catch in the `.action()` handler and printed as an error.

**Why**: Malformed JSON in `--params` triggers a `SyntaxError` from `JSON.parse()`. The top-level catch formats it and exits with code 1 (unhandled error, not a CLI validation error).

---

## [N] Invalid `--params-file` -- file not found

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params-file /tmp/nonexistent-file.json --force --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. Error message about file not found (ENOENT). The `readFileSync()` at line 118 throws, caught by the top-level try/catch.

**Why**: A nonexistent file path causes `readFileSync` to throw an ENOENT error. This is caught by the `.action()` handler, not by `exitWithError()`.

---

## [N] Invalid `--params-file` -- invalid JSON content

```bash
echo 'not json' > /tmp/test-bad-params.json && codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params-file /tmp/test-bad-params.json --force --profile cli-test-owner-full 2>&1; echo "EXIT:$?"; rm /tmp/test-bad-params.json
```

**Expect**: Exit code `1`. Error message about JSON parse failure. The `JSON.parse()` at line 119 throws.

**Why**: The file exists but contains invalid JSON. Same error handling path as invalid `--params` JSON.

---

## [N] Nonexistent instance ID

```bash
codika redeploy --process-instance-id nonexistent-instance-id --force --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about instance not found. Exit code 1.

**Why**: The Cloud Function returns a 404-equivalent error. The `isRedeployError()` type guard matches, and the code calls `process.exit(1)`.

---

## [N] Missing API key -- no profile, no env, no flag

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile nonexistent-profile-name 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] `--json` error output on API failure

```bash
codika redeploy --process-instance-id nonexistent-instance-id --force --profile cli-test-owner-full --json
```

**Expect**: JSON output with `success: false` and `error.message` containing a description of the failure. Exit code 1.

**Why**: When `--json` is set and the API returns an error, the code outputs structured JSON via `console.log(JSON.stringify(result, null, 2))` in the `isRedeployError()` branch.

---

## [N] Non-JSON error output on API failure

```bash
codika redeploy --process-instance-id nonexistent-instance-id --force --profile cli-test-owner-full
```

**Expect**: Stderr shows `✗ Redeploy failed: <code> — <message>`. Exit code 1.

**Why**: When `--json` is not set and `isRedeployError()` matches, the code writes `console.error()` with the error code and message. Verifies the human-readable error path.

---

## [S] Scope enforcement -- limited key allows redeploy

The `cli-test-limited` profile has `deploy:use-case` + `instances:read`, which includes the required `deploy:use-case` scope.

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-limited --json
```

**Expect**: `success: true`, `data.deploymentStatus` = `"deployed"`, because the `deploy:use-case` scope covers redeploy.

**Why**: Redeploy uses the same `deploy:use-case` scope as deploy. The limited key has this scope, so the request should succeed. This proves the scope check passes with minimal permissions.

---

## [S] Scope enforcement -- key without deploy scope

If a key exists with only `instances:read` (no `deploy:use-case`), redeploy should be rejected. This test requires a profile with only `instances:read` scope. If no such profile exists, skip this test.

```bash
# Requires a profile with only instances:read scope (no deploy:use-case)
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-read-only --json
```

**Expect**: `success: false`, error message contains `deploy:use-case`. Exit code 1.

**Why**: Proves the `hasScope('deploy:use-case')` check in the Cloud Function rejects keys that lack the required scope, even if they are valid and belong to the correct organization.

---

## [S] Cross-org isolation

The cross-org key (`HF5DaJQamZxIeMj0zfWY` org) must not be able to redeploy instances belonging to the test org (`l0gM8nHm2o2lpupMpm5x`).

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or organization mismatch. Exit code 1. The cross-org key cannot see or modify instances in another organization.

**Why**: Confirms organization-level data isolation. A valid API key from org B cannot redeploy instances belonging to org A, even though both exist in the same Firestore database.

---

## [S] Invalid API key

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --api-key "cko_invalid_key_here" --json
```

**Expect**: `success: false`, error about unauthorized or invalid API key. Exit code 1.

**Why**: The auth middleware rejects invalid keys before reaching business logic. The HTTP client receives a non-200 response, which is caught and returned as a `RedeployErrorResponse`.

---

## [S] Member key -- redeploy owner's instance

The member key belongs to a different user in the same org. Test whether it can redeploy an instance created by the owner.

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-member --json
```

**Expect**: Either `success: true` (if members with `deploy:use-case` can redeploy any org instance) or `success: false` (if ownership is enforced). Document the actual behavior.

**Why**: Tests the access control boundary for cross-user redeploy within the same organization. The member has `deploy:use-case` scope but the instance belongs to the owner.

---

## Last tested

Not yet tested.
