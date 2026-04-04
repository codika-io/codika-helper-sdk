# `codika integration set/list/delete`

Manages integrations on the Codika platform. Three sub-commands handle the full lifecycle:
- **set**: Creates or updates an integration by encrypting secrets (RSA-OAEP + AES-GCM) and sending them to the platform. Supports org, member, and process_instance context types. Custom integrations (cstm_*) auto-extract the schema from config.ts when `--path` is provided, or accept `--custom-schema-file` as fallback.
- **list**: Lists connected integrations across all context levels (org + member by default, process_instance if instance ID is provided).
- **delete**: Deletes an integration with two-phase confirmation (first call shows affected process instances, second call with `--confirm` performs deletion).

**Scope required**: `integrations:manage`
**Methods**: POST (set), POST (list), POST (delete)
**Cloud Functions**: `createIntegrationPublic` (set), `listIntegrationsPublic` (list), `deleteIntegrationPublic` (delete)

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (dev instance)

---

## Integration Set

### [P] Happy path -- set org-level integration with JSON output

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-test-key-for-cli-integration --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.n8nCredentialId` present (if n8n credential was created). Exit code 0.

**Why**: Core happy path -- verifies secret encryption, API call, and integration creation at the organization level.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Human-readable output

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-test-key-cli --profile cli-test-owner-full
```

**Expect**: Output shows `Configuring openai...` with Context (organization), Secrets (1 field), `Encrypting secrets...`, `Creating integration...`, then `✓ openai integration created successfully!` with n8n Credential ID.

**Why**: Verifies the step-by-step formatted output.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Multiple `--secret` flags

```bash
codika integration set supabase --secret SUPABASE_HOST=https://test.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJtest --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both secrets are encrypted and sent.

**Why**: `--secret` is repeatable. Each occurrence adds to the secrets map.

**Cleanup**: `codika integration delete supabase --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --confirm --profile cli-test-owner-full`

---

### [P] `--secrets` JSON string

```bash
codika integration set openai --secrets '{"OPENAI_API_KEY":"sk-json-test"}' --profile cli-test-owner-full --json
```

**Expect**: `success: true`, secret from JSON string is encrypted and sent.

**Why**: Bulk secret setting via JSON string is useful for scripts and CI.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] `--force` deletes and recreates

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-force-test --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`. If a previous openai integration existed, it is deleted first, then recreated. Human-readable output shows "Deleting existing integration (--force)...".

**Why**: The `--force` flag enables idempotent integration updates by deleting then recreating.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] `--context-type process_instance` with `--process-instance-id`

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-instance-test --context-type process_instance --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, integration is created at the process_instance level.

**Why**: Integrations can be scoped to specific process instances, not just the organization.

**Cleanup**: `codika integration delete openai --context-type process_instance --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --confirm --profile cli-test-owner-full`

---

### [N] OAuth integration rejected

```bash
codika integration set gmail --secret ACCESS_TOKEN=test --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error code `OAUTH_REQUIRED`, message contains "requires OAuth authentication", includes `dashboardUrl`. Exit code 2.

**Why**: OAuth integrations (gmail, google_calendar, slack, etc.) cannot be configured via CLI. They require the dashboard OAuth flow.

---

### [N] No secrets provided

```bash
codika integration set openai --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: "At least one secret is required. Use --secret KEY=VALUE, --secrets, or --secrets-file".

**Why**: Client-side validation -- at least one secret source must be provided.

---

### [N] Invalid `--secret` format

```bash
codika integration set openai --secret "no-equals-sign" --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: `Invalid --secret format: "no-equals-sign". Expected KEY=VALUE`.

**Why**: Client-side validation for the `KEY=VALUE` format.

---

### [N] Custom integration without schema or config.ts

```bash
cd /tmp && codika integration set cstm_acme_crm --secret API_KEY=test --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error contains "Custom integration cstm_acme_crm requires a schema".

**Why**: Custom integrations (cstm_* prefix) need a schema — either auto-extracted from config.ts (via `--path`) or explicitly provided via `--custom-schema-file`.

---

### [N] Missing process instance ID for process_instance context

```bash
codika integration set supabase --secret SUPABASE_HOST=test --context-type process_instance --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: "processInstanceId is required for process_instance context".

**Why**: Process-instance-scoped integrations require a target instance. Without it, the API doesn't know where to attach the credentials.

---

## Integration List

### [P] List integrations -- JSON output

```bash
codika integration list --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.integrations` is an array. Each entry has `integrationId`, `contextType`, `connectedAt`. Exit code 0.

**Why**: Core happy path for listing integrations at the organization level.

---

### [P] List integrations -- human-readable output

```bash
codika integration list --profile cli-test-owner-full
```

**Expect**: Table grouped by context type (Organization Integrations, Member Integrations) with Name, ID, Connected date columns. Footer shows total count.

**Why**: Verifies the formatted table output with grouping.

---

### [P] List with process instance context

```bash
codika integration list --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.integrations` includes process_instance-level integrations in addition to org and member ones.

**Why**: Adding `--process-instance-id` expands the query to include instance-level integrations.

---

### [P] Auto-resolve process instance from `--path`

```bash
codika integration list --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the process instance is resolved from `project.json`.`devProcessInstanceId`, and instance-level integrations are included.

**Why**: Auto-resolution from project.json provides a seamless experience when working within a use case folder.

---

## Integration Delete

### [P] Delete with `--confirm` -- JSON output

First create a test integration, then delete it:

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-delete-test --profile cli-test-owner-full --json
codika integration delete openai --confirm --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.deactivatedCount` is 0 or more. Exit code 0.

**Why**: Core happy path -- verifies the confirmed deletion flow.

---

### [P] Delete without `--confirm` -- pending confirmation

```bash
codika integration delete openai --profile cli-test-owner-full --json
```

**Expect**: `success: true` with `data.pendingDeactivations` showing affected process instances (if any). Exit code 2 (pending state). Human-readable output shows the list of affected instances and a re-run hint.

**Why**: Two-phase delete first shows impact, then requires `--confirm` to proceed. Prevents accidental deletion of integrations used by active processes.

---

### [P] Delete human-readable confirmed output

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-hr-delete --profile cli-test-owner-full --json
codika integration delete openai --confirm --profile cli-test-owner-full
```

**Expect**: Shows `✓ openai integration deleted successfully!` with deactivated count.

**Why**: Verifies the formatted output for confirmed deletion.

---

### [N] Delete nonexistent integration

```bash
codika integration delete nonexistent_integration --confirm --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about integration not found.

**Why**: Standard 404 handling for attempting to delete an integration that doesn't exist.

---

## Scope Enforcement (all sub-commands)

### [S] Scope enforcement -- limited key for set

The limited key has `deploy:use-case` + `instances:read` but NOT `integrations:manage`.

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-noscope --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`.

**Why**: All integration operations require the `integrations:manage` scope.

---

### [S] Scope enforcement -- limited key for list

```bash
codika integration list --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`.

**Why**: Listing integrations also requires the `integrations:manage` scope (not just read access).

---

### [S] Scope enforcement -- limited key for delete

```bash
codika integration delete openai --confirm --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`.

**Why**: Deletion requires the same `integrations:manage` scope.

---

### [S] Cross-org isolation -- set

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-crossorg --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or unauthorized.

**Why**: Cross-org keys cannot create integrations in another organization.

---

### [S] Cross-org isolation -- list

```bash
codika integration list --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: true`, but returns only the cross-org organization's integrations, NOT the test org's.

**Why**: List results are scoped to the authenticated organization. Cross-org keys see their own org's data.

---

### [S] Cross-org isolation -- delete

```bash
codika integration delete openai --confirm --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about integration not found (it belongs to a different org).

**Why**: Cross-org keys cannot delete integrations in another organization.

---

### [S] Invalid API key

```bash
codika integration set openai --secret OPENAI_API_KEY=test --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
