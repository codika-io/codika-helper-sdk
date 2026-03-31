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

**Expect**: `success: true`, `executionId` is a non-empty string, `workflowId` matches input, `processInstanceId` matches, `message` present. Exit code 0.

**Why**: Core happy path -- verifies the trigger flow without waiting for results.

---

## [P] Human-readable output

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output shows `Triggering workflow "..."...` with Process Instance, then `✓ Workflow triggered` with Execution ID, Process Instance, Workflow, and a hint to poll for status.

**Why**: Verifies the formatted output path including the poll hint.

---

## [P] `--payload-file` from file

```bash
echo '{"key":"value"}' > /tmp/test-trigger-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/test-trigger-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the payload is included in the trigger request.

**Why**: File-based payloads support complex trigger data without escaping issues on the command line.

**Cleanup**: `rm /tmp/test-trigger-payload.json`

---

## [P] `--poll` waits for execution result

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll --profile cli-test-owner-full --json
```

**Expect**: `success: true` or `success: false` depending on workflow execution. Contains `executionId`, `status` (success/error), `duration`. If successful, may contain `resultData`. If failed, may contain `errorDetails`.

**Why**: The `--poll` flag changes behavior from fire-and-forget to wait-for-result. The CLI polls the `getExecutionStatus` endpoint until completion or timeout.

---

## [P] `--poll` with `--timeout`

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll --timeout 10 --profile cli-test-owner-full --json
```

**Expect**: If workflow completes within 10 seconds, normal result. If not, timeout behavior.

**Why**: The `--timeout` flag controls max poll time (in seconds, default 120). Short timeouts are useful for quick-running workflows.

---

## [P] `--poll` with `-o` output file

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --poll -o /tmp/trigger-result.json --profile cli-test-owner-full --json
```

**Expect**: Result is saved to `/tmp/trigger-result.json`. JSON output includes `outputPath`.

**Why**: The `-o` / `--output` flag saves the full execution result to a file, useful for downstream processing.

**Cleanup**: `rm /tmp/trigger-result.json`

---

## [P] Auto-resolve process instance from project.json

Run from a directory containing a `project.json` with `devProcessInstanceId`:

```bash
codika trigger <workflowId> --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the process instance ID is resolved from `project.json`.`devProcessInstanceId`.

**Why**: Auto-resolution eliminates the need to pass `--process-instance-id` when running from a use case folder.

---

## [N] Missing `<workflowId>` argument

```bash
codika trigger --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Commander error -- missing required argument `workflowId`.

**Why**: `<workflowId>` is a required argument in Commander.

---

## [N] No process instance ID available

```bash
codika trigger <workflowId> --profile cli-test-owner-full
```

**Expect**: Exit code 2, error contains "Process instance ID is required" with three resolution options.

**Why**: When all resolution sources fail (no flag, no project.json in cwd or --path), the CLI shows a helpful error.

---

## [N] Nonexistent workflow ID

```bash
codika trigger nonexistent-workflow --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about workflow not found or trigger failure.

**Why**: The Cloud Function validates the workflow ID against the instance's deployed workflows.

---

## [N] Payload file not found

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /nonexistent/file.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error: "Payload file not found: /nonexistent/file.json". Exit code 1.

**Why**: Client-side validation when the specified payload file doesn't exist.

---

## [N] Invalid JSON in payload file

```bash
echo 'not json' > /tmp/bad-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/bad-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error: "Invalid JSON in /tmp/bad-payload.json: ...". Exit code 1.

**Why**: Payload must be valid JSON. Syntax errors are caught with a descriptive message.

**Cleanup**: `rm /tmp/bad-payload.json`

---

## [N] Payload file contains array (not object)

```bash
echo '[1,2,3]' > /tmp/array-payload.json && codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --payload-file /tmp/array-payload.json --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error: "Payload file must contain a JSON object". Exit code 1.

**Why**: Payload must be a JSON object, not an array or primitive. The CLI validates the parsed shape.

**Cleanup**: `rm /tmp/array-payload.json`

---

## [S] Scope enforcement -- limited key lacks `workflows:trigger`

The limited key has `deploy:use-case` + `instances:read` but NOT `workflows:trigger`.

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `workflows:trigger`.

**Why**: Triggering workflows requires the `workflows:trigger` scope. The limited key is rejected at the scope layer.

---

## [S] Cross-org isolation

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch.

**Why**: A key from a different organization cannot trigger workflows on instances belonging to the test org.

---

## [S] Invalid API key

```bash
codika trigger <workflowId> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
