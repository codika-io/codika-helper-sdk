# `codika trigger <workflowId>`

Triggers a deployed Codika workflow and optionally polls for execution results. The process instance ID can be passed via `--process-instance-id` or auto-resolved from `project.json`. Payload data can be provided via `--payload-file` (file path or `-` for stdin). With `--poll`, the command waits for the execution to complete and returns the result.

**Scope required**: `workflows:trigger`
**Method**: POST (body: `{ processInstanceId, workflowId, payload? }`)
**Cloud Function**: `triggerWebhookPublic` (trigger), `getExecutionStatusPublic` (poll)

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (dev instance with HTTP + schedule triggers)

**Test workflow ID**: Use a known workflow ID from the test instance's deployed workflows (e.g., from `codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --json`).

---

## [P] Happy path -- trigger with JSON output

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `executionId` is a non-empty string, `workflowId` matches input, `processInstanceId` matches `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`, `message` present. Exit code 0.

**Why**: Core happy path -- verifies the trigger flow returns immediately (fire-and-forget) with the correct response shape.

---

## [P] Human-readable output

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: First line contains `Triggering workflow "<workflowId>"...` with `Process Instance: 019d444d-...`. Then `✓ Workflow triggered` followed by `Execution ID`, `Process Instance`, `Workflow`, and a `Poll for status:` hint showing `codika get execution <id>`. Exit code 0.

**Why**: Verifies the formatted human-readable output path, including the poll hint that teaches users the follow-up command.

---

## [P] `--payload-file` from file

```bash
echo '{"key":"value","nested":{"a":1}}' > /tmp/test-trigger-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/test-trigger-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `executionId` present. The human-readable output (without `--json`) would show `Payload: {"key":"value",...}` truncated at 100 chars. Exit code 0.

**Why**: File-based payloads support complex trigger data without shell escaping issues. The CLI reads the file, parses JSON, validates it's an object, and includes it in the POST body.

**Cleanup**: `rm /tmp/test-trigger-payload.json`

---

## [P] `--payload-file -` (stdin via heredoc)

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file - --profile cli-test-owner-full --json <<'EOF'
{"fromStdin": true, "data": "hello"}
EOF
```

**Expect**: `success: true`, `executionId` present. Exit code 0.

**Why**: Stdin payloads (`--payload-file -`) are the recommended way to pass JSON from scripts and AI agents, avoiding shell quoting issues. The CLI reads from fd 0, parses JSON, and validates it's an object. This is a distinct code path from file-based payloads (`readFileSync(0, 'utf-8')` vs `readFileSync(source, 'utf-8')`).

---

## [P] `--poll` waits for execution result

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll --profile cli-test-owner-full --json
```

**Expect**: Response contains `executionId`, `status` (one of `success` or `error`), `duration` (number). If `status` is `success`, may contain `resultData`. If `status` is `error`, may contain `errorDetails` with `message`, optionally `type` and `failedNodeName`. Exit code 0 if `status` is `success`, exit code 1 if `status` is `error`.

**Why**: The `--poll` flag changes behavior from fire-and-forget to wait-for-result. The CLI triggers, then polls `getExecutionStatusPublic` until the execution status is no longer `pending` or the timeout is reached. This is a fundamentally different response shape than fire-and-forget (no `message` field, adds `status`/`duration`/`resultData`/`errorDetails`).

---

## [P] `--poll` human-readable output

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll --profile cli-test-owner-full
```

**Expect**: First shows `✓ Workflow triggered (execution: <id>)`. Then a waiting indicator `Waiting for result... (Ns)`. Finally either `✓ Execution success (X.Xs)` with `Result:` and indented JSON, or `✗ Execution error` with `Error:`, `Type:`, `Node:` details. Ends with `Execution ID: <id>`.

**Why**: Verifies the human-readable poll output path including the progress indicator, success/error formatting, and result data display.

---

## [P] `--poll` with `--timeout`

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll --timeout 10 --profile cli-test-owner-full --json
```

**Expect**: If workflow completes within 10 seconds, normal poll result with `status`, `duration`, etc. If not, timeout behavior (error or last-known status).

**Why**: The `--timeout` flag controls max poll time in seconds (default 120). The value is parsed via `parseInt()` and multiplied by 1000 for milliseconds. Short timeouts are useful for quick-running workflows or CI environments.

---

## [P] `--poll` with `-o` output file

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll -o /tmp/trigger-result.json --profile cli-test-owner-full --json
```

**Expect**: JSON output includes `success: true`, `executionId`, `status`, `duration`, and `outputPath` set to the resolved absolute path of `/tmp/trigger-result.json`. The file at `/tmp/trigger-result.json` contains the full `statusResult` object (the raw poll response, not the CLI-shaped output). Exit code 0 if execution succeeded, 1 if failed.

**Why**: The `-o` / `--output` flag saves the full execution result to a file for downstream processing. The CLI uses `writeFileSync` with `JSON.stringify(statusResult, null, 2)`. Note: `-o` only works with `--poll` (without `--poll` there is no result to save).

**Cleanup**: `rm /tmp/trigger-result.json`

---

## [P] `-o` human-readable output

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll -o /tmp/trigger-result-hr.json --profile cli-test-owner-full
```

**Expect**: Shows `✓ Execution success` (or `✗ Execution error`) with duration, then `Result saved to /tmp/trigger-result-hr.json`. Does NOT print the result data inline (the `-o` path skips inline result display).

**Why**: When `-o` is used without `--json`, the human-readable output confirms the save location instead of dumping the full result to stdout.

**Cleanup**: `rm /tmp/trigger-result-hr.json`

---

## [P] Auto-resolve process instance from `project.json` via `--path`

Requires a directory containing a `project.json` with `devProcessInstanceId`. Use an existing deployed use case folder, or create a temporary one:

```bash
mkdir -p /tmp/test-trigger-uc && echo '{"devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/test-trigger-uc/project.json && codika trigger <workflowId> --path /tmp/test-trigger-uc --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `processInstanceId` is `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (resolved from the project.json in the `--path` directory).

**Why**: Auto-resolution eliminates the need to pass `--process-instance-id` when a use case folder is available. The resolution chain is: `--process-instance-id` flag > `project.json` at `--path` > `project.json` in cwd. This tests priority #2.

**Cleanup**: `rm -rf /tmp/test-trigger-uc`

---

## [P] Auto-resolve process instance from `--project-file`

```bash
mkdir -p /tmp/test-trigger-pf && echo '{"devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/test-trigger-pf/project-staging.json && codika trigger <workflowId> --path /tmp/test-trigger-pf --project-file project-staging.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The process instance ID is resolved from `project-staging.json` instead of the default `project.json`.

**Why**: The `--project-file` flag allows targeting different environments (e.g., `project-client-a.json`, `project-staging.json`) from the same use case folder. The `readProjectJson()` utility uses this filename instead of the default `project.json`.

**Cleanup**: `rm -rf /tmp/test-trigger-pf`

---

## [P] `--payload-file` with human-readable output shows truncated payload

```bash
python3 -c "import json; print(json.dumps({f'key{i}': f'value{i}' for i in range(20)}))" > /tmp/test-long-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/test-long-payload.json --profile cli-test-owner-full
```

**Expect**: The `Payload:` line in the output is truncated at 100 characters with `...` appended. The trigger still succeeds.

**Why**: The human-readable path truncates the payload display with `JSON.stringify(payload).slice(0, 100)` to keep output readable for large payloads.

**Cleanup**: `rm /tmp/test-long-payload.json`

---

## [N] Missing `<workflowId>` argument

```bash
codika trigger --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error: `error: missing required argument 'workflowId'`. Exit code `1` (Commander's default for missing arguments).

**Why**: `<workflowId>` is declared as a required argument via `.argument('<workflowId>', ...)`. Commander validates this before the action handler runs.

---

## [N] No process instance ID available

Run from a directory without `project.json` and without `--process-instance-id` or `--path`:

```bash
cd /tmp && codika trigger some-workflow --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `Process instance ID is required. Either:` followed by the three resolution options (run from use case folder, pass `--path`, pass `--process-instance-id`). Exit code `2` (CLI validation error via `exitWithError`).

**Why**: When all resolution sources fail (no flag, no project.json in cwd or `--path`), the `exitWithError` guard fires with a helpful multi-line error before any HTTP call. Exit code 2 distinguishes CLI validation from API errors.

---

## [N] Missing API key -- no profile, no env, no flag

```bash
codika trigger some-workflow --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile nonexistent-profile-name 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Nonexistent workflow ID

```bash
codika trigger nonexistent-workflow-id-12345 --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about workflow not found or trigger failure. Exit code 1 (API error, caught by the top-level catch handler).

**Why**: The Cloud Function validates the workflow ID against the instance's deployed workflows. An unknown ID returns an error, which `triggerWorkflowOrThrow` throws, caught by the action handler's `catch` block.

---

## [N] Payload file not found

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /nonexistent/path/file.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `Payload file not found: /nonexistent/path/file.json`. Exit code 1.

**Why**: The `resolvePayload` function catches `ENOENT` errors from `readFileSync` and throws a descriptive error. This is a client-side validation -- no HTTP call is made.

---

## [N] Invalid JSON in payload file

```bash
echo 'not valid json {{{' > /tmp/bad-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/bad-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message starts with `Invalid JSON in /tmp/bad-payload.json:` followed by the `SyntaxError` message from `JSON.parse`. Exit code 1.

**Why**: The `resolvePayload` function catches `SyntaxError` from `JSON.parse` and rethrows with the file path for context. Client-side validation, no HTTP call.

**Cleanup**: `rm /tmp/bad-payload.json`

---

## [N] Payload file contains array (not object)

```bash
echo '[1,2,3]' > /tmp/array-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/array-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `Payload file must contain a JSON object`. Exit code 1.

**Why**: The payload must be a JSON object (`typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)`). Arrays, strings, numbers, booleans, and null are all rejected.

**Cleanup**: `rm /tmp/array-payload.json`

---

## [N] Payload file is empty

```bash
touch /tmp/empty-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/empty-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `Payload file is empty: /tmp/empty-payload.json`. Exit code 1.

**Why**: The `resolvePayload` function checks `!raw.trim()` before parsing. An empty file is caught with a specific message rather than a generic JSON parse error.

**Cleanup**: `rm /tmp/empty-payload.json`

---

## [N] Stdin payload is empty (`--payload-file -` with no input)

```bash
echo -n "" | codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file - --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `No data received on stdin`. Exit code 1.

**Why**: When `--payload-file -` is used but stdin is empty, the `!raw.trim()` check triggers the stdin-specific error message (different from the file-empty message).

---

## [N] Stdin payload is array (not object)

```bash
echo '[1,2,3]' | codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file - --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `Stdin payload must be a JSON object`. Exit code 1.

**Why**: The array-rejection error message differs between file and stdin paths: `Payload file must contain a JSON object` vs `Stdin payload must be a JSON object`. This tests the stdin variant.

---

## [N] Payload file contains primitive (not object)

```bash
echo '"just a string"' > /tmp/string-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/string-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message: `Payload file must contain a JSON object`. Exit code 1.

**Why**: The validation `typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)` rejects primitives (strings, numbers, booleans) and null, not just arrays.

**Cleanup**: `rm /tmp/string-payload.json`

---

## [S] Scope enforcement -- limited key lacks `workflows:trigger`

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read` but NOT `workflows:trigger`.

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error message contains `workflows:trigger`. Exit code 1.

**Why**: The Cloud Function checks `hasScope('workflows:trigger')` before processing the request. The key authenticates fine (valid key, right org) but is rejected for lacking the required scope.

---

## [S] Cross-org isolation

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. The test instance belongs to org `l0gM8nHm2o2lpupMpm5x`.

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or organization mismatch. Exit code 1.

**Why**: A valid key from org B cannot trigger workflows on instances belonging to org A. The Cloud Function resolves the key's organization, then checks that the process instance belongs to the same org.

---

## [S] Invalid API key

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_that_does_not_exist" --json
```

**Expect**: `success: false`, error about unauthorized or invalid API key. Exit code 1.

**Why**: Auth middleware rejects invalid keys before any business logic runs. The key prefix `cko_` is valid format but the key itself doesn't exist in Firestore.

---

## Last tested

Not yet tested.
