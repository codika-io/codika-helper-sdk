# `codika get execution <executionId>`

Fetches detailed execution data for a given execution ID and process instance ID. Supports `--deep` for sub-workflow recursion, `--slim` for noise stripping, and `-o` for file output.

**Scope required**: `executions:read`
**Method**: GET (path: `/{processInstanceId}/{executionId}`, query: `deep`, `slim`)
**Cloud Function**: `getExecutionDetailsPublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active)

**Pre-req**: Run `codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq '.data.executions[0].executionId' -r` to get a valid execution ID for tests below. Substitute `<EXEC_ID>` with the result.

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

**Why**: Verifies the CLI formatter extracts and displays execution metadata from the n8nExecution object.

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
FULL_SIZE=$(codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | wc -c) && \
SLIM_SIZE=$(codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --slim --profile cli-test-owner-full --json | wc -c) && \
[ "$SLIM_SIZE" -le "$FULL_SIZE" ] && echo "PASS" || echo "FAIL"
```

**Expect**: `PASS` — slim output is same size or smaller than full output.

**Why**: Verifies the `slim=true` query param is sent and the Cloud Function strips verbose node data for readability.

---

## [P] `--deep` and `--slim` combined

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --deep --slim --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Verifies both query params can be set simultaneously without conflict.

---

## [P] `-o` flag writes to file

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/exec-test.json --profile cli-test-owner-full && \
jq '.execution.codikaExecutionId' /tmp/exec-test.json
```

**Expect**: The file `/tmp/exec-test.json` is created, contains valid JSON, and includes the execution ID. Human-readable output shows "Execution details saved to /tmp/exec-test.json".

**Why**: Verifies the `--output` / `-o` flag writes the full response JSON to disk instead of stdout.

---

## [P] `-o` with `--json` returns summary instead of full data

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/exec-test2.json --json --profile cli-test-owner-full | jq 'keys'
```

**Expect**: Stdout JSON contains `["data", "success"]` with `data.outputPath`, `data.executionId`, `data.status`. The full execution is written to the file, not to stdout.

**Why**: When both `-o` and `--json` are set, stdout gets a compact summary while the file gets the full payload.

---

## [P] Process instance ID resolved from `--path`

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
mkdir -p /tmp/exec-path-test && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/exec-path-test/project.json && \
codika get execution "$EXEC_ID" --path /tmp/exec-path-test --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is auto-resolved from `project.json`.

**Why**: Verifies the resolution chain: `--process-instance-id` > `project.json` in `--path` > `project.json` in cwd. Most users run from their use case folder and rely on auto-resolution.

---

## [N] Missing process instance ID (no flag, no project.json)

```bash
codika get execution some-exec-id --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error message listing the three resolution methods (use case folder, `--path`, `--process-instance-id`).

**Why**: The command requires a process instance ID. Without it, the user gets a helpful error explaining how to provide one.

---

## [N] Nonexistent execution ID

```bash
codika get execution nonexistent-exec-id --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, `success: false`, error about execution not found.

**Why**: Standard 404 handling for an execution that doesn't exist.

---

## [S] Scope enforcement — limited key lacks `executions:read`

The limited key has `deploy:use-case` + `instances:read` but NOT `executions:read`.

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: Exit code 1, `success: false`, error message contains `executions:read`.

**Why**: Proves the scope check works. The key is valid but lacks the required scope.

---

## [S] Cross-org key cannot fetch execution from test org

```bash
EXEC_ID=$(codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 1 --profile cli-test-owner-full --json | jq -r '.data.executions[0].executionId') && \
codika get execution "$EXEC_ID" --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code 1, `success: false`, error about not found or forbidden.

**Why**: Proves organization isolation — the process instance belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`.

---

## [N] Invalid API key

```bash
codika get execution some-exec-id --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Last tested

Not yet tested.
