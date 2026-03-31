# `codika list executions <processInstanceId>`

Lists recent executions for a process instance. Supports filtering by workflow ID and failure status.

**Scope required**: `executions:read`
**Method**: GET
**Cloud Function**: `listExecutionsPublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active)

---

## [P] Happy path — Owner lists executions

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.executions` is an array, `data.processInstanceId` = `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`, `data.count` matches array length.

**Why**: Confirms the basic flow — auth, scope check, Firestore query with processInstanceId path param, response shaping.

---

## [P] Human-readable output

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Table with `● Recent Executions` header (green), column headers (ID, Workflow, Status, Duration, Created), one row per execution with status icons (checkmark for success, X for failed), footer showing count. Failed executions show error message on the next line with `└─` prefix.

**Why**: Verifies the CLI table formatter handles color codes, status icons, duration formatting, and error detail sub-rows.

---

## [P] Each execution has the correct fields

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.executions[0] | keys'
```

**Expect**: At minimum: `createdAt`, `executionId`, `status`, `triggerId`, `workflowId`. Optional fields: `duration`, `errorDetails`, `n8nExecutionId`.

**Why**: Ensures the Cloud Function returns the documented `ExecutionSummary` shape.

---

## [P] Count matches array length

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '(.data.count == (.data.executions | length))'
```

**Expect**: `true`

**Why**: Sanity check that the `count` field matches the actual data.

---

## [P] `--limit` flag

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 3 --profile cli-test-owner-full --json | jq '.data.executions | length'
```

**Expect**: `3` (or fewer if the instance has fewer than 3 executions).

**Why**: Verifies the limit query param is passed through and respected by the Cloud Function.

---

## [P] `--workflow-id` filter

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.executions[0].workflowId' -r > /tmp/wf_id.txt && \
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflow-id "$(cat /tmp/wf_id.txt)" --profile cli-test-owner-full --json | jq '[.data.executions[] | .workflowId] | unique'
```

**Expect**: Array with exactly one element matching the workflow ID extracted in the first call.

**Why**: Verifies the `workflowId` query param filter. All returned executions must belong to the filtered workflow.

---

## [P] `--failed-only` filter

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --failed-only --profile cli-test-owner-full --json | jq '[.data.executions[] | .status] | unique'
```

**Expect**: `["failed"]` or empty array (if no failures exist). Never `"success"` or `"pending"`.

**Why**: Verifies the `--failed-only` flag maps to `status=failed` query param correctly.

---

## [P] `--failed-only` with `--limit`

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --failed-only --limit 1 --profile cli-test-owner-full --json | jq '(.data.executions | length) as $len | if $len > 0 then .data.executions[0].status else "empty" end'
```

**Expect**: `"failed"` or `"empty"`. Length is at most 1.

**Why**: Verifies that multiple filters compose correctly.

---

## [P] Failed execution includes `errorDetails`

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --failed-only --limit 1 --profile cli-test-owner-full --json | jq '.data.executions[0].errorDetails | keys'
```

**Expect**: Contains `message` key. May also contain `failedNodeName`.

**Why**: The `errorDetails` object is critical for debugging. The table formatter displays it as a sub-row under failed executions.

---

## [P] Duration is a number (when present)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 5 --profile cli-test-owner-full --json | jq '[.data.executions[] | select(.duration != null) | .duration | type] | unique'
```

**Expect**: `["number"]` (or empty if no executions have duration yet).

**Why**: Duration is in milliseconds and drives the human-readable formatting (ms/s/m).

---

## [N] Missing `processInstanceId` argument

```bash
codika list executions --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error about missing required argument `processInstanceId`.

**Why**: Commander enforces the required argument. The command should not proceed without it.

---

## [N] Nonexistent process instance

```bash
codika list executions nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, `success: false`, error about not found or empty result.

**Why**: Standard 404 handling for an instance that doesn't exist in the org.

---

## [N] Invalid `--limit` value (exceeds max)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 200 --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error about limit must be between 1 and 100.

**Why**: Client-side validation rejects limits outside the 1-100 range before the API call.

---

## [S] Scope enforcement — limited key lacks `executions:read`

The limited key has `deploy:use-case` + `instances:read` but NOT `executions:read`.

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: Exit code 1, `success: false`, error message contains `executions:read`.

**Why**: Proves the `hasScope('executions:read')` check in the Cloud Function works. The key authenticates fine but is rejected for lacking the required scope.

---

## [S] Cross-org key cannot list executions from test org

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code 1, `success: false`, error about not found or forbidden. The cross-org key must not see executions from the test org's instance.

**Why**: Proves organization isolation — the process instance belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`.

---

## [N] Invalid API key

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Last tested

Not yet tested.
