# `codika get instance [processInstanceId]`

Fetches process instance details: deployment parameters, status, version, and workflows. The `--workflows` flag expands workflow data to include trigger types, activation status, cost, and integrations.

**Scope required**: `instances:read`
**Method**: POST (body: `{ processInstanceId, includeWorkflowDetails? }`)
**Cloud Function**: `getProcessInstancePublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active, has HTTP + schedule triggers)

---

## Backward Compatibility (without `--workflows`)

### [P] Slim response — only 3 keys per workflow

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0] | keys'
```

**Expect**: `["n8nWorkflowId", "workflowId", "workflowName"]` — exactly 3 keys.

**Why**: Ensures the default response hasn't changed. Existing callers that don't pass `--workflows` must get the same slim format they always got.

---

### [P] No expanded fields present without flag

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0] | has("triggers", "cost", "n8nWorkflowIsActive", "integrationUids")'
```

**Expect**: `false`

**Why**: Double-checks that `includeWorkflowDetails` defaults to false. These fields must NOT appear unless explicitly requested.

---

## Expanded View (`--workflows`)

### [P] Expanded fields present — 7 keys per workflow

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0] | keys'
```

**Expect**: `["cost", "integrationUids", "n8nWorkflowId", "n8nWorkflowIsActive", "triggers", "workflowId", "workflowName"]` — 7 keys.

**Why**: Confirms the expanded response includes all new fields alongside the existing ones.

---

### [P] `n8nWorkflowIsActive` is boolean

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0].n8nWorkflowIsActive | type'
```

**Expect**: `"boolean"`

**Why**: The Cloud Function reads `w.n8nWorkflowIsActive` from the deployment document. Must be a proper boolean, not null or string.

---

### [P] Triggers array with type field

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0].triggers[0].type'
```

**Expect**: A string — one of `"http"`, `"schedule"`, `"service_event"`, `"subworkflow"`, or `"data_ingestion"`.

**Why**: The trigger `type` field drives how the CLI formats the human-readable output (e.g., "http (POST)" vs "schedule (0 8 * * *)").

---

### [P] HTTP trigger includes `method`

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '[.data.deployment.workflows[].triggers[] | select(.type == "http")] | .[0].method'
```

**Expect**: `"POST"` (or another HTTP method). Not null.

**Why**: The Cloud Function strips secrets from triggers but preserves the method. HTTP triggers without a method are useless for debugging.

---

### [P] Schedule trigger includes `cronExpression`

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '[.data.deployment.workflows[].triggers[] | select(.type == "schedule")] | .[0].cronExpression'
```

**Expect**: A cron string like `"0 8 * * *"`.

**Why**: Schedule triggers are meaningless without the cron expression. The Cloud Function exposes it safely (no secrets in cron strings).

---

### [P] Cost is number

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0].cost | type'
```

**Expect**: `"number"`

**Why**: Cost represents estimated credits per execution. Must be numeric for display formatting.

---

### [P] `integrationUids` is array

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full --json | jq '.data.deployment.workflows[0].integrationUids | type'
```

**Expect**: `"array"`

**Why**: Lists the integration UIDs (e.g., `["tavily"]`) used by the workflow. Must be an array even if empty.

---

### [P] Human-readable output with `--workflows`

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-owner-full
```

**Expect**: Workflow section shows per-workflow blocks with `n8n ID:`, `Active:` (yes/no with color), `Triggers:` (formatted types), `Cost:` (with "credits" suffix).

**Why**: Verifies the CLI formatter handles the expanded data correctly — it should show a different layout than the slim "- workflowId (n8n: id)" format.

---

## Negative Tests

### [N] Nonexistent instance

```bash
codika get instance nonexistent-id --workflows --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, error contains "not found".

**Why**: Standard 404 handling.

---

### [P] Limited key with `instances:read` — should work

The limited key has `instances:read` scope, so it should be able to get instance details even though it lacks other scopes.

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-limited --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms scope enforcement is per-endpoint — `instances:read` is sufficient for `getProcessInstancePublic`, regardless of what other scopes the key has or lacks.

---

## Last tested

2026-03-31 — 12/12 PASS
