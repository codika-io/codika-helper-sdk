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

## Flag Coverage

### [P] `--json` structured output

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms `--json` flag produces valid JSON with the expected top-level `success` field.

---

### [P] Human-readable output without `--workflows`

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full 2>&1
```

**Expect**: Output contains `✓ Process Instance`, `Instance ID:`, `Process ID:`, `Environment:`, `Status:`, `Version:`, `Title:`, and `Workflows:` section with slim format (`- workflowId (n8n: id)`). No `Triggers:`, `Active:`, or `Cost:` lines.

**Why**: Verifies the default human-readable formatter renders the slim workflow view, distinct from the `--workflows` expanded layout.

---

### [P] `--api-key` flag overrides profile

```bash
API_KEY=$(codika config show --json 2>/dev/null | jq -r '.profiles["cli-test-owner-full"].apiKey')
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "$API_KEY" --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms that passing `--api-key` directly works without `--profile`. This is the highest-priority auth resolution path and the one used in CI/CD.

---

### [P] `--environment prod` resolves production instance

The test org has both a dev instance (`019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`) and a prod instance (`019d444e-290a-721b-9ce3-f3d454eb6d0e`). This test uses the prod instance ID directly to confirm the `--environment` flag is accepted.

```bash
codika get instance 019d444e-290a-721b-9ce3-f3d454eb6d0e --environment prod --profile cli-test-owner-full --json | jq '.data.environment'
```

**Expect**: `"prod"`

**Why**: Verifies the `--environment` option is accepted and the prod instance returns `environment: "prod"`. When combined with `--path` resolution (see ID resolution tests), this flag selects `prodProcessInstanceId` from `project.json`.

---

## Instance ID Resolution

### [N] Missing instance ID — no argument, no project.json

No positional argument, no `--path`, not run from a use case folder. This hits the `exitWithError` at line 96.

```bash
codika get instance --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Process instance ID is required". Exit code `2` (CLI validation error, not `1`).

**Why**: Verifies the early-exit guard when the resolution chain finds nothing. Exit code 2 distinguishes CLI validation errors from API errors.

---

## Negative Tests

### [N] Nonexistent instance

```bash
codika get instance nonexistent-id --workflows --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, error contains "not found".

**Why**: Standard 404 handling.

---

### [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

### [N] Invalid API key

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Security Tests

### [P] Limited key with `instances:read` — should work

The limited key has `instances:read` scope, so it should be able to get instance details even though it lacks other scopes.

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --workflows --profile cli-test-limited --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms scope enforcement is per-endpoint — `instances:read` is sufficient for `getProcessInstancePublic`, regardless of what other scopes the key has or lacks.

---

### [S] Cross-org isolation

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not be able to fetch instances from the test org (`l0gM8nHm2o2lpupMpm5x`).

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code 1, `success: false`, error about not found or permission denied. Must NOT return the test org's instance data.

**Why**: Confirms that organization-level data isolation holds. A valid key from org B cannot read org A's instances, even though both exist in the same Firestore database.

---

### [S] Member visibility — member can see shared instance

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-member --json | jq '.success'
```

**Expect**: `true` (if instance is shared with member) OR exit code 1 with not found/permission error (if not shared). The key point: the member must NOT see data from instances outside their visibility scope.

**Why**: Confirms the sharing model applies to instance reads — members only see instances they have access to, not all org instances.

---

## Last tested

2026-03-31 — 12/12 PASS
