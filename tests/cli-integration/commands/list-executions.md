# `codika list executions <processInstanceId>`

Lists recent executions for a process instance. Supports filtering by workflow ID and failure status.

**Scope required**: `executions:read`
**Method**: GET
**Cloud Function**: `listExecutionsPublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active)

---

## [P] Happy path — Owner lists executions

Owner should see executions for a process instance in the org.

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

**Expect**: Table with `● Recent Executions` header (green), column headers (ID, Workflow, Status, Duration, Created), one row per execution with status icons (`✓` for success, `✗` for failed, `⋯` for pending), footer showing count. Failed executions show error message on the next line with `└─` prefix and optional `[NodeName]`.

**Why**: Verifies the CLI table formatter handles color codes, status icons, duration formatting, and error detail sub-rows.

---

## [P] Each execution has the correct fields

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.executions[0] | keys'
```

**Expect**: At minimum: `createdAt`, `executionId`, `status`, `triggerId`, `workflowId`. Optional fields: `duration`, `errorDetails`, `n8nExecutionId`.

**Why**: Ensures the Cloud Function returns the documented `ExecutionSummary` shape and doesn't leak internal fields.

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

## [P] `--failed-only` with `--limit` compose correctly

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --failed-only --limit 1 --profile cli-test-owner-full --json | jq '(.data.executions | length) as $len | if $len > 0 then .data.executions[0].status else "empty" end'
```

**Expect**: `"failed"` or `"empty"`. Length is at most 1.

**Why**: Verifies that multiple query filters compose correctly — both are applied simultaneously.

---

## [P] Failed execution includes `errorDetails`

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --failed-only --limit 1 --profile cli-test-owner-full --json | jq '.data.executions[0].errorDetails | keys'
```

**Expect**: Contains `message` key. May also contain `failedNodeName`.

**Why**: The `errorDetails` object is critical for debugging. The table formatter displays it as a sub-row under failed executions (`└─ [NodeName] message`).

---

## [P] Duration is a number (when present)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 5 --profile cli-test-owner-full --json | jq '[.data.executions[] | select(.duration != null) | .duration | type] | unique'
```

**Expect**: `["number"]` (or empty if no executions have duration yet).

**Why**: Duration is in milliseconds and drives the human-readable formatting (ms/s/m). Non-numeric values would break `formatDuration()`.

---

## [P] `--workflow-id` with `--failed-only` compose correctly

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.executions[0].workflowId' -r > /tmp/wf_id.txt && \
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflow-id "$(cat /tmp/wf_id.txt)" --failed-only --profile cli-test-owner-full --json | jq '[.data.executions[] | select(.workflowId != "'"$(cat /tmp/wf_id.txt)"'" or .status != "failed")] | length'
```

**Expect**: `0` — every returned execution has both the correct workflowId AND status `"failed"`. (Or the result set is empty if that workflow has no failures.)

**Why**: Verifies all three query params compose: `workflowId`, `status=failed`, and the implicit default limit.

---

## [P] Zero executions returns empty array, not error

If the test instance ever returns zero for a narrow filter, the CLI should still exit 0:

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflow-id "nonexistent-workflow-id" --profile cli-test-owner-full --json | jq '.success, (.data.executions | length)'
```

**Expect**: `true` then `0`. Exit code `0`.

**Why**: Zero executions is not an error — the docs state the CLI prints "No executions found." and exits with code 0.

---

## [N] Missing `processInstanceId` argument

Commander enforces the required argument before the action handler runs.

```bash
codika list executions --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "missing required argument" or Commander's usage message. Exit code non-zero.

**Why**: The `<processInstanceId>` argument is required by Commander. The command should not proceed without it.

---

## [N] Nonexistent process instance

```bash
codika list executions nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: Exit code `1`, `success: false`, error about not found.

**Why**: Standard 404 handling for an instance that doesn't exist in the org. This hits the `isListExecutionsError` path.

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. Hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Invalid `--limit` value (non-numeric)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit abc --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Limit must be a number between 1 and 100". Exit code `2`.

**Why**: The guard checks `isNaN(limit)` — non-numeric strings are caught. Exit code 2 = CLI validation error.

---

## [N] Invalid `--limit` value (zero)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 0 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Limit must be a number between 1 and 100". Exit code `2`.

**Why**: The guard checks `limit < 1` — zero is below minimum. Same exit code and message as NaN case.

---

## [N] Invalid `--limit` value (exceeds max)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit 200 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Limit must be a number between 1 and 100". Exit code `2`.

**Why**: The guard checks `limit > 100` — values above the max are caught client-side before the API call.

---

## [N] Invalid `--limit` value (negative)

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --limit -5 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Limit must be a number between 1 and 100". Exit code `2`.

**Why**: Negative numbers satisfy `limit < 1`. Edge case for the limit validation guard.

---

## [S] Scope enforcement — limited key lacks `executions:read`

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read` but NOT `executions:read`.

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: Exit code `1`, `success: false`, error message contains `executions:read`.

**Why**: Proves the `hasScope('executions:read')` check in the Cloud Function works. The key authenticates fine but is rejected for lacking the required scope.

---

## [S] Cross-org key cannot list executions from test org

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. The process instance belongs to org `l0gM8nHm2o2lpupMpm5x`.

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code `1`, `success: false`, error about not found or forbidden. The cross-org key must not see executions from the test org's instance.

**Why**: Confirms organization-level data isolation. A valid key from org B cannot see org A's process instance executions, even though both orgs exist in the same Firestore database.

---

## [N] Invalid API key

```bash
codika list executions 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Test Summary

| # | Tag | Test | Exit Code |
|---|-----|------|-----------|
| 1 | [P] | Happy path — Owner lists executions (JSON) | 0 |
| 2 | [P] | Human-readable output (table) | 0 |
| 3 | [P] | Field shape validation | 0 |
| 4 | [P] | Count matches array length | 0 |
| 5 | [P] | `--limit` flag | 0 |
| 6 | [P] | `--workflow-id` filter | 0 |
| 7 | [P] | `--failed-only` filter | 0 |
| 8 | [P] | `--failed-only` + `--limit` compose | 0 |
| 9 | [P] | Failed execution `errorDetails` | 0 |
| 10 | [P] | Duration type validation | 0 |
| 11 | [P] | `--workflow-id` + `--failed-only` compose | 0 |
| 12 | [P] | Zero executions = empty array, not error | 0 |
| 13 | [N] | Missing `processInstanceId` argument | non-zero |
| 14 | [N] | Nonexistent process instance | 1 |
| 15 | [N] | Missing API key (no profile, no env, no flag) | 2 |
| 16 | [N] | Invalid `--limit` (non-numeric) | 2 |
| 17 | [N] | Invalid `--limit` (zero) | 2 |
| 18 | [N] | Invalid `--limit` (exceeds max) | 2 |
| 19 | [N] | Invalid `--limit` (negative) | 2 |
| 20 | [S] | Scope enforcement — limited key | 1 |
| 21 | [S] | Cross-org isolation | 1 |
| 22 | [N] | Invalid API key | 1 |

---

## Last tested

Not yet tested.
