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

**Expect**: `success: true`, `data.n8nCredentialId` present. Exit code 0.

**Why**: Core happy path -- verifies secret encryption, API call, and integration creation at the organization level. `openai` defaults to `contextType: organization` via the registry.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Human-readable output

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-test-key-cli --profile cli-test-owner-full
```

**Expect**: Output shows `Configuring openai...` with Context (`organization`), Secrets (`1 field(s)`), `Encrypting secrets...`, `Creating integration...`, then `✓ openai integration created successfully!` with n8n Credential ID. Exit code 0.

**Why**: Verifies the step-by-step formatted output matches the `runSet()` console.log sequence (lines 234-241 of set.ts).

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Multiple `--secret` flags

```bash
codika integration set supabase --secret SUPABASE_HOST=https://test.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJtest --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both secrets are encrypted and sent. Exit code 0.

**Why**: `--secret` is declared as a repeatable option (Commander `concat` accumulator). Each occurrence adds a key to the secrets map. `supabase` defaults to `contextType: process_instance` via the registry, so the `--process-instance-id` is required.

**Cleanup**: `codika integration delete supabase --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --confirm --profile cli-test-owner-full`

---

### [P] `--secrets` JSON string

```bash
codika integration set openai --secrets '{"OPENAI_API_KEY":"sk-json-test"}' --profile cli-test-owner-full --json
```

**Expect**: `success: true`, secret from JSON string is encrypted and sent. Exit code 0.

**Why**: Bulk secret setting via `--secrets` JSON string is useful for automation and agents. Parsed with `JSON.parse` (set.ts line 180).

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] `--secrets-file` from file

```bash
echo '{"OPENAI_API_KEY":"sk-file-test"}' > /tmp/codika-test-secrets.json
codika integration set openai --secrets-file /tmp/codika-test-secrets.json --profile cli-test-owner-full --json
rm /tmp/codika-test-secrets.json
```

**Expect**: `success: true`, secret from file is encrypted and sent. Exit code 0.

**Why**: `--secrets-file` reads and parses the JSON file (set.ts line 175). Lowest priority in the merge chain: file < JSON string < individual flags.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Secret merge priority -- flags override file

```bash
echo '{"OPENAI_API_KEY":"sk-from-file"}' > /tmp/codika-test-secrets.json
codika integration set openai --secrets-file /tmp/codika-test-secrets.json --secret OPENAI_API_KEY=sk-from-flag --profile cli-test-owner-full --json
rm /tmp/codika-test-secrets.json
```

**Expect**: `success: true`. The value used is `sk-from-flag` (individual `--secret` has highest priority). Verify by listing or checking n8n credential.

**Why**: Three-layer merge order: `--secrets-file` (Layer 1, lowest) < `--secrets` JSON (Layer 2) < `--secret` flags (Layer 3, highest). This test confirms Layer 3 overrides Layer 1 (set.ts lines 173-191).

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] `--force` deletes and recreates

First create, then force-overwrite:

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-original --profile cli-test-owner-full --json
codika integration set openai --secret OPENAI_API_KEY=sk-force-test --force --profile cli-test-owner-full --json
```

**Expect**: Both calls return `success: true`. The second call deletes the existing integration before creating the new one. Human-readable output of the second call shows "Deleting existing integration (--force)...". Exit code 0.

**Why**: The `--force` flag triggers a `deleteIntegrationRemote` call (set.ts lines 250-265) before creating, enabling idempotent updates without a separate delete step.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] `--context-type process_instance` with `--process-instance-id`

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-instance-test --context-type process_instance --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, integration is created at the process_instance level. Exit code 0.

**Why**: `--context-type` overrides the registry default (`organization` for openai). Integrations can be scoped to specific process instances for per-deployment credential isolation.

**Cleanup**: `codika integration delete openai --context-type process_instance --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --confirm --profile cli-test-owner-full`

---

### [P] Process instance ID auto-resolved from `--path`

Requires a use case folder with `project.json` containing `devProcessInstanceId`. Use the test instance's use case folder if available.

```bash
codika integration set supabase --secret SUPABASE_HOST=https://test.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJtest --path /path/to/use-case-with-project-json --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The process instance ID is resolved from `project.json.devProcessInstanceId` (set.ts lines 143-152). No `--process-instance-id` flag needed.

**Why**: Auto-resolution from `project.json` provides a seamless DX when working within a use case folder. The `--environment` flag (default: `dev`) determines whether `devProcessInstanceId` or `prodProcessInstanceId` is used.

**Cleanup**: `codika integration delete supabase --path /path/to/use-case-with-project-json --confirm --profile cli-test-owner-full`

---

### [N] OAuth integration rejected

```bash
codika integration set google_gmail --secret ACCESS_TOKEN=test --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error code `OAUTH_REQUIRED`, message contains "requires OAuth authentication", includes `dashboardUrl`. Exit code 2.

**Why**: OAuth integrations are checked early (set.ts line 102 `isOAuthIntegration` guard) before any encryption or API call. The full list is derived from `OAUTH_INTEGRATIONS` set in `integration-fields.ts` (google_gmail, google_calendar, google_drive, google_sheets, google_docs, google_slides, google_tasks, google_contacts, microsoft_teams, microsoft_outlook, microsoft_sharepoint, microsoft_to_do, microsoft_excel, microsoft_onedrive, notion, calendly, slack, shopify).

---

### [N] No secrets provided

```bash
codika integration set openai --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "At least one secret is required. Use --secret KEY=VALUE, --secrets, or --secrets-file".

**Why**: Client-side validation (set.ts line 194) -- at least one of the three secret sources must produce a non-empty map. `exitWithError` writes to stderr with exit code 2. The `--json` flag is irrelevant here because `exitWithError` never produces JSON.

---

### [N] Invalid `--secret` format (missing =)

```bash
codika integration set openai --secret "no-equals-sign" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains `Invalid --secret format: "no-equals-sign". Expected KEY=VALUE`.

**Why**: Client-side validation (set.ts line 188) checks `indexOf('=') === -1`. The error format is exact -- includes the raw value in quotes.

---

### [N] Custom integration without schema or config.ts

Run from a directory that has no `config.ts`:

```bash
cd /tmp && codika integration set cstm_acme_crm --secret API_KEY=test --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "Custom integration cstm_acme_crm requires a schema".

**Why**: Custom integrations (cstm_* prefix) need a schema -- either auto-extracted from config.ts (via `--path`) or explicitly provided via `--custom-schema-file`. Without either, the CLI cannot construct the `customIntegrationSchema` payload (set.ts lines 268-306).

---

### [N] Missing process instance ID for process_instance context

```bash
cd /tmp && codika integration set supabase --secret SUPABASE_HOST=test --context-type process_instance --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "processInstanceId is required for process_instance context".

**Why**: When `contextType` is `process_instance` and there is no `--process-instance-id` flag and no `project.json` in the resolved path, `exitWithError` fires (set.ts line 156). Run from `/tmp` to avoid accidentally picking up a `project.json`.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika integration set openai --secret OPENAI_API_KEY=test --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "API key" (the `API_KEY_MISSING_MESSAGE` constant).

**Why**: Verifies the early-exit guard (set.ts line 167) before any encryption or HTTP call. Same exit code 2 pattern as other CLI validation errors.

---

## Integration List

### [P] List integrations -- JSON output

```bash
codika integration list --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.integrations` is an array. Each entry has `integrationId`, `contextType`, `connectedAt`. Exit code 0.

**Why**: Core happy path for listing integrations. Without `--process-instance-id`, returns org + member integrations only.

---

### [P] Human-readable output

```bash
codika integration list --profile cli-test-owner-full
```

**Expect**: Table grouped by context type (Organization Integrations, Member Integrations) with Name, ID, Connected date columns. Footer shows total count. If no integrations are connected, shows "No connected integrations found." with a tip.

**Why**: Verifies the `printSection()` formatter (list.ts lines 156-182) and the grouping logic (org, member, instance sections).

---

### [P] List with process instance context

```bash
codika integration list --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.integrations` includes process_instance-level integrations in addition to org and member ones.

**Why**: Adding `--process-instance-id` passes it to the API, which expands the query to include instance-level integrations (supabase, postgres, telegram, custom). Without it, only org+member integrations are returned.

---

### [P] Auto-resolve process instance from `--path`

Requires a use case folder with `project.json` containing `devProcessInstanceId`.

```bash
codika integration list --path /path/to/use-case-with-project-json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the process instance is resolved from `project.json.devProcessInstanceId` (list.ts lines 71-79), and instance-level integrations are included in the response.

**Why**: Auto-resolution from project.json provides a seamless experience when working within a use case folder. No need to manually specify `--process-instance-id`.

---

### [P] Empty list -- no integrations connected

If no integrations are connected (e.g., fresh org or after cleanup):

```bash
codika integration list --profile cli-test-owner-full
```

**Expect**: Human-readable output shows "No connected integrations found." and a tip: "Use --path <use-case-folder> to also show process instance integrations." Exit code 0.

**Why**: Verifies the empty state handling (list.ts lines 107-114). The tip only appears when `--process-instance-id` was not provided.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika integration list --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "API key".

**Why**: Same early-exit guard as `integration set`. Verifies the auth resolution chain fails cleanly before any HTTP call (list.ts line 87).

---

## Integration Delete

### [P] Delete with `--confirm` -- JSON output

First create a test integration, then delete it:

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-delete-test --profile cli-test-owner-full --json
codika integration delete openai --confirm --profile cli-test-owner-full --json
```

**Expect**: Set returns `success: true`. Delete returns `success: true`, `data.deactivatedCount` is 0 or more. Exit code 0.

**Why**: Core happy path -- verifies the confirmed deletion flow. The `--confirm` flag sends `confirmDeletion: true` to the API (delete.ts line 132), which performs the actual deletion.

---

### [P] Delete without `--confirm` -- pending confirmation (two-phase)

First create a test integration, then attempt delete without confirm:

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-pending-test --profile cli-test-owner-full --json
codika integration delete openai --profile cli-test-owner-full --json
```

**Expect**: Delete returns with `data.pendingDeactivations` showing affected process instances (count + processes array). Exit code 2 (pending state, not an error). Human-readable output shows the list of affected instances and a re-run hint: `codika integration delete openai --confirm`.

**Why**: Two-phase delete first shows impact, then requires `--confirm` to proceed (delete.ts lines 148-162). Prevents accidental deletion of integrations used by active processes. `isDeleteIntegrationPending()` detects this state.

**Cleanup**: `codika integration delete openai --confirm --profile cli-test-owner-full`

---

### [P] Delete human-readable confirmed output

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-hr-delete --profile cli-test-owner-full --json
codika integration delete openai --confirm --profile cli-test-owner-full
```

**Expect**: Shows `✓ openai integration deleted successfully!` with deactivated count if any. Exit code 0.

**Why**: Verifies the formatted output for confirmed deletion (delete.ts lines 138-144).

---

### [P] Delete process-instance-scoped integration

First create at instance level, then delete:

```bash
codika integration set supabase --secret SUPABASE_HOST=https://test.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJtest --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
codika integration delete supabase --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --confirm --profile cli-test-owner-full --json
```

**Expect**: Both return `success: true`. Delete scoped correctly to the process instance -- does not affect org-level supabase integrations elsewhere.

**Why**: Process-instance-scoped integrations must be deleted with the same `--process-instance-id`. The delete command resolves `contextType` from the registry (`supabase` defaults to `process_instance`).

---

### [N] Delete nonexistent integration

```bash
codika integration delete nonexistent_integration --confirm --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about integration not found. Exit code 1.

**Why**: Standard 404 handling. The API returns an error when the integration does not exist in the target context.

---

### [N] Missing process instance ID for process_instance delete

Run from a directory without `project.json`:

```bash
cd /tmp && codika integration delete supabase --context-type process_instance --confirm --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "processInstanceId is required for process_instance context".

**Why**: Same guard as `integration set` (delete.ts lines 101-107). When `contextType` is `process_instance` and no instance ID can be resolved, the CLI exits early.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika integration delete openai --confirm --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains "API key".

**Why**: Same early-exit guard as the other subcommands (delete.ts line 113).

---

## Security Tests (All Subcommands)

### [S] Scope enforcement -- limited key for set

The limited key has `deploy:use-case` + `instances:read` but NOT `integrations:manage`.

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-noscope --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`. Exit code 1.

**Why**: All integration operations require the `integrations:manage` scope. The Cloud Function's `hasScope()` check rejects the key before business logic runs.

---

### [S] Scope enforcement -- limited key for list

```bash
codika integration list --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`. Exit code 1.

**Why**: Listing integrations also requires `integrations:manage` (not just a read scope). Same scope gate applies to all three subcommands.

---

### [S] Scope enforcement -- limited key for delete

```bash
codika integration delete openai --confirm --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `integrations:manage`. Exit code 1.

**Why**: Deletion requires the same `integrations:manage` scope. Proves scope enforcement is consistent across all three Cloud Functions.

---

### [S] Cross-org isolation -- set

```bash
codika integration set openai --secret OPENAI_API_KEY=sk-crossorg --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or unauthorized. Exit code 1.

**Why**: The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It cannot create integrations in the test org (`l0gM8nHm2o2lpupMpm5x`). The API enforces organization-level isolation.

---

### [S] Cross-org isolation -- list

```bash
codika integration list --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: true`, but returns only the cross-org organization's integrations (`HF5DaJQamZxIeMj0zfWY`), NOT the test org's. The `data.integrations` array must not contain any integration created under the test org.

**Why**: List results are scoped to the authenticated organization. A valid key from org B sees org B's integrations only, even though both orgs exist in the same Firestore database.

---

### [S] Cross-org isolation -- delete

```bash
codika integration delete openai --confirm --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about integration not found (it belongs to a different org). Exit code 1.

**Why**: Cross-org keys cannot delete integrations in another organization. The API looks up the integration within the authenticated org's scope, finds nothing, and returns a not-found error.

---

### [S] Invalid API key -- set

```bash
codika integration set openai --secret OPENAI_API_KEY=test --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before any business logic runs. Applies to all three subcommands.

---

### [S] Invalid API key -- list

```bash
codika integration list --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Same auth rejection for list.

---

### [S] Invalid API key -- delete

```bash
codika integration delete openai --confirm --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Same auth rejection for delete.

---

## Last tested

Not yet tested.
