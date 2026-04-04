# `codika get execution <executionId>`

Fetches detailed execution data for a given execution ID and process instance ID. Supports `--deep` for sub-workflow recursion, `--slim` for noise stripping, and `-o` for file output.

**Scope required**: `executions:read`
**Method**: GET (path: `/{processInstanceId}/{executionId}`, query: `deep`, `slim`)
**Cloud Function**: `getExecutionDetailsPublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active)

**Pre-req**: Run the following to get a valid execution ID for tests below. Substitute `<EXEC_ID>` with the result.

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId')
```

---

## [P] Happy path — Fetch execution details

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms the basic flow — auth, scope check, execution lookup by ID, response shaping.

---

## [P] JSON response has correct top-level shape

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq 'keys'
```

**Expect**: `["execution", "requestId", "success"]`

**Why**: Ensures the response shape matches `GetExecutionDetailsSuccessResponse` — `success`, `execution`, and `requestId` at the top level.

---

## [P] Execution object has required fields

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.execution | has("codikaExecutionId", "n8nExecutionId", "status", "n8nExecution")'
```

**Expect**: `true`

**Why**: The execution object must contain all four documented fields: `codikaExecutionId`, `n8nExecutionId`, `status`, and `n8nExecution`.

---

## [P] Human-readable output

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Formatted summary with `● Execution Details` header (colored by status), fields: `Codika Execution ID`, `n8n Execution ID`, `Status`, `Started At`, `Stopped At`, `Nodes Executed`, and `Request ID`.

**Why**: Verifies the CLI formatter extracts and displays execution metadata from the n8nExecution object. This is the default output mode when `--json` is not passed.

---

## [P] `--deep` flag includes sub-workflow data

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --deep --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`. The response may include additional sub-workflow execution data if the workflow calls sub-workflows.

**Why**: Verifies the `deep=true` query param is sent. The Cloud Function recursively fetches child executions when this flag is set.

---

## [P] `--slim` flag strips noise

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
FULL=$(codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json) && \
SLIM=$(codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --slim --profile cli-test-owner-full --json) && \
FULL_SIZE=$(echo "$FULL" | wc -c) && \
SLIM_SIZE=$(echo "$SLIM" | wc -c) && \
[ "$SLIM_SIZE" -le "$FULL_SIZE" ] && echo "PASS" || echo "FAIL"
```

**Expect**: `PASS` — slim output is same size or smaller than full output.

**Why**: Verifies the `slim=true` query param is sent and the Cloud Function strips `pairedItem` and `workflowData` fields for readability.

---

## [P] `--slim` actually removes pairedItem and workflowData

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --slim --profile cli-test-owner-full --json | grep -c '"pairedItem"\|"workflowData"'
```

**Expect**: `0` — neither `pairedItem` nor `workflowData` appear in the slim output.

**Why**: Confirms slim mode specifically strips the two documented noisy fields, not just that the output happens to be smaller.

---

## [P] `--deep` and `--slim` combined

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --deep --slim --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Verifies both query params can be set simultaneously without conflict. This is the recommended debugging combination.

---

## [P] `-o` flag writes to file

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/exec-test.json --profile cli-test-owner-full && \
jq '.execution.codikaExecutionId' /tmp/exec-test.json && \
rm -f /tmp/exec-test.json
```

**Expect**: The file `/tmp/exec-test.json` is created, contains valid JSON with the execution ID. Stdout shows "Execution details saved to /tmp/exec-test.json" (human-readable confirmation, not the full payload).

**Why**: Verifies the `--output` / `-o` flag writes the full response JSON to disk instead of stdout, and that the human-readable mode prints a confirmation message.

---

## [P] `-o` with `--json` returns summary to stdout, full data to file

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/exec-test2.json --json --profile cli-test-owner-full | jq 'keys' && \
rm -f /tmp/exec-test2.json
```

**Expect**: Stdout JSON contains `["data", "success"]` with `data.outputPath`, `data.executionId`, `data.status`. The full execution is written to the file, not to stdout.

**Why**: When both `-o` and `--json` are set, stdout gets a compact machine-readable summary (for piping) while the file gets the full payload. The stdout shape differs from the normal `--json` shape (no `execution` key, replaced by `data`).

---

## [P] `--output` long form works identically to `-o`

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --output /tmp/exec-test3.json --profile cli-test-owner-full && \
jq '.success' /tmp/exec-test3.json && \
rm -f /tmp/exec-test3.json
```

**Expect**: `true` — file contains the full response, same behavior as `-o`.

**Why**: Confirms the long-form `--output` alias is correctly wired by Commander.

---

## [P] Process instance ID resolved from `--path`

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
mkdir -p /tmp/exec-path-test && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/exec-path-test/project.json && \
codika get execution "$EXEC_ID" --path /tmp/exec-path-test --profile cli-test-owner-full --json | jq '.success' && \
rm -rf /tmp/exec-path-test
```

**Expect**: `true` — the process instance ID is auto-resolved from `project.json` in the `--path` directory.

**Why**: Verifies resolution chain priority 2: `--path` directory's `project.json`. Most users run from their use case folder and rely on auto-resolution.

---

## [P] Process instance ID resolved from `--project-file`

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
mkdir -p /tmp/exec-pf-test && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/exec-pf-test/project-staging.json && \
codika get execution "$EXEC_ID" --path /tmp/exec-pf-test --project-file project-staging.json --profile cli-test-owner-full --json | jq '.success' && \
rm -rf /tmp/exec-pf-test
```

**Expect**: `true` — the process instance ID is resolved from the custom project file specified by `--project-file`.

**Why**: Verifies the `--project-file` flag overrides the default `project.json` filename. This supports multi-tenant use cases where different project files target different clients (e.g., `project-client-a.json`, `project-client-b.json`).

---

## [P] `--api-url` overrides endpoint

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-url https://nonexistent.example.com --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about connection failure or unreachable host.

**Why**: Verifies the `--api-url` flag is actually used by the HTTP client. A bogus URL must cause a network error, proving the override takes effect instead of silently falling back to the default.

---

## [P] `--profile` selects the correct key

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner --json | jq '.success'
```

**Expect**: `true` — the `cli-test-owner` profile (different key from `cli-test-owner-full`) also has `executions:read` and works.

**Why**: Proves the `--profile` flag selects the named profile's API key instead of the active profile. Tests with a second valid profile to confirm key resolution.

---

## [N] Missing process instance ID (no flag, no project.json)

Runs from a directory without `project.json` and provides no `--process-instance-id` or `--path`.

```bash
codika get execution some-exec-id --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "Process instance ID is required" and lists the three resolution methods (use case folder, `--path`, `--process-instance-id`).

**Why**: The command requires a process instance ID. Without it, the user gets a helpful error explaining how to provide one. Exit code `2` = CLI validation error (not API error).

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path.

```bash
codika get execution some-exec-id --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Nonexistent execution ID

```bash
codika get execution nonexistent-exec-id --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about execution not found.

**Why**: Standard 404 handling for an execution that does not exist. This exercises the catch block (exit code `1`), not `exitWithError` (exit code `2`).

---

## [N] Nonexistent process instance ID

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id nonexistent-instance-id --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about not found or forbidden.

**Why**: The process instance ID is invalid, so the Cloud Function cannot locate the resource. Ensures the API returns a clear error rather than a 500.

---

## [N] Missing `<executionId>` argument

```bash
codika get execution --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Non-zero exit code, error about missing required argument `executionId`. Commander enforces this before the action handler runs.

**Why**: The `<executionId>` argument is required (angle brackets in Commander). Verifies Commander's built-in argument validation fires.

---

## [N] `--project-file` points to nonexistent file

```bash
codika get execution some-exec-id --path /tmp --project-file nonexistent-file.json --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, error about missing process instance ID (the file does not exist, so resolution falls through all three sources and fails).

**Why**: When `--project-file` is specified but the file does not exist, `readProjectJson` returns undefined. The resolution chain exhausts all sources and hits the `exitWithError` for missing process instance ID.

---

## [N] Invalid API key

```bash
codika get execution some-exec-id --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic. Exit code `1` because the API returns an error (not a CLI validation failure).

---

## [S] Scope enforcement — limited key lacks `executions:read`

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read` but NOT `executions:read`.

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error message contains `executions:read`.

**Why**: Proves the scope check works. The key is valid and belongs to the correct org but lacks the required scope.

---

## [S] Cross-org key cannot fetch execution from test org

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not access resources in the test org (`l0gM8nHm2o2lpupMpm5x`).

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about not found or forbidden.

**Why**: Proves organization isolation — the process instance belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`. A valid key from org B must never access org A's execution data.

---

## [S] Member key can fetch executions

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-member --json | jq '.success'
```

**Expect**: `true` — the member key has `executions:read` scope and the instance is shared with the member.

**Why**: Confirms that non-owner members with the correct scope can access execution data. This is a positive security test — verifying that legitimate access is not blocked.

---

## Exit code summary

| Code | Meaning | Triggered by |
|------|---------|-------------|
| `0` | Success | Normal execution |
| `1` | API error | `getExecutionDetailsOrThrow` throws (catch block) — 401, 403, 404, 500 |
| `2` | CLI validation error | `exitWithError()` — missing process instance ID, missing API key |

---

## Last tested

Not yet tested.
