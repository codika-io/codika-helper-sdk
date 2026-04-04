# `codika organization create-key`

Creates a new API key scoped to an organization. On success, automatically saves the new key as a named profile and sets it as the active profile. Requires a key with `api-keys:manage` scope and the caller must be an admin or owner in the target organization.

**Scope required**: `api-keys:manage`
**Role required**: Admin or owner in the organization
**Method**: POST (body: `{ organizationId, name, scopes, description?, expiresInDays? }`)
**Cloud Function**: `createOrganizationApiKeyPublic`

**Note**: Each successful run creates a real API key and a new profile. Clean up by deleting the key and profile after testing.

---

## [P] Happy path -- JSON output

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-temp-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.apiKey` starts with `cko_`, `data.keyId` is a non-empty string, `data.keyPrefix` present, `data.name` matches input, `data.scopes` = `["projects:read"]`, `data.createdAt` present. `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies key creation, scope parsing, JSON response shape, and the `cko_` prefix convention.

**Cleanup**: Delete the key via `codika organization update-key` or Firestore console. Remove the auto-created profile: `codika logout <profile-name>`. Restore active profile: `codika use cli-test-owner-full`.

---

## [P] Human-readable output

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-hr-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full
```

**Expect**: Output contains `Creating API key "..." for organization ...`, then `✓ Organization API Key Created Successfully`, the warning `Save the API key below`, and fields: API Key (`cko_...`), Key Prefix, Key ID, Name, Scopes, Created, Request ID, and `Saved as profile "..." (now active)`. Exit code 0.

**Why**: Verifies the formatted output path including the save warning and auto-profile message. Both output modes must be tested since they follow completely different code paths (lines 120-148 in create-key.ts).

**Cleanup**: Delete key and profile. Restore active profile: `codika use cli-test-owner-full`.

---

## [P] Auto-save profile on success

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-autosave-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full --json
```

After running, verify:
```bash
codika use
```

**Expect**: The newly created key appears as a profile in `codika use` output and is set as the active profile. The profile name is derived from the key name and prefix via `deriveProfileName()`.

**Why**: Auto-saving is unconditional on success (no opt-out flag). This tests that `upsertProfile()` + `setActiveProfile()` both fire and the profile is usable. This is the key UX feature: users can immediately use the new key without a manual `codika login` step.

**Cleanup**: `codika use cli-test-owner-full` to restore, then `codika logout <new-profile>`.

---

## [P] Multiple scopes

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-multi-$(date +%s)" --scopes "deploy:use-case,projects:read,instances:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.scopes` = `["deploy:use-case", "projects:read", "instances:read"]` (array of 3).

**Why**: Scopes are parsed from a comma-separated string via `.split(',').map(s => s.trim())`. Multiple scopes must all be included in the created key.

**Cleanup**: Delete key and profile.

---

## [P] All 11 scopes

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-allscopes-$(date +%s)" --scopes "deploy:use-case,projects:create,projects:read,workflows:trigger,executions:read,instances:read,instances:manage,skills:read,integrations:manage,api-keys:manage" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.scopes` array has exactly 10 entries matching all valid scopes.

**Why**: Ensures the full scope list is accepted without server-side rejection. This is the maximum scope set for an org key.

**Cleanup**: Delete key and profile.

---

## [P] `--description` flag

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-desc-$(date +%s)" --scopes "projects:read" --description "Test key for CLI integration" --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The description is stored with the key (verify via Firestore or a future `get-key` command).

**Why**: Optional field. The client only includes `description` in the request body when provided (`if (description)` guard in org-api-key-client.ts line 104). Verifies the conditional inclusion works.

**Cleanup**: Delete key and profile.

---

## [P] `--expires-in-days` flag

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-expiry-$(date +%s)" --scopes "projects:read" --expires-in-days 7 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.expiresAt` is approximately 7 days from now (ISO 8601 string). The profile saved locally includes the `expiresAt` field.

**Why**: Key expiry is security-critical. The `--expires-in-days` option uses Commander's `parseInt` parser. The value is conditionally included in the request body (`if (expiresInDays !== undefined)` guard). Also verify the human-readable output shows the "Expires" field when this flag is set.

**Cleanup**: Delete key and profile.

---

## [P] `--expires-in-days` absent -- no expiry

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-noexpiry-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.expiresAt` is absent or undefined in the response. The saved profile does not include `expiresAt`.

**Why**: Omitting `--expires-in-days` should create a key that never expires. The `expiresInDays` is not sent in the request body when undefined.

**Cleanup**: Delete key and profile.

---

## [P] Scopes with whitespace around commas

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-spaces-$(date +%s)" --scopes "projects:read , instances:read , executions:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.scopes` = `["projects:read", "instances:read", "executions:read"]` (trimmed, no leading/trailing spaces).

**Why**: The CLI trims scopes via `.map(s => s.trim())`. Users may naturally add spaces after commas. This verifies the trim logic works end-to-end.

**Cleanup**: Delete key and profile.

---

## [P] `--api-key` flag overrides profile

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-apikey-$(date +%s)" --scopes "projects:read" --api-key "$(codika config show --profile cli-test-owner-full --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --json
```

**Expect**: `success: true`. The `--api-key` flag takes priority over `--profile` and env vars in the resolution chain.

**Why**: Tests the flag-level override in `resolveApiKey()`. Important for CI/CD pipelines that pass keys directly.

**Cleanup**: Delete key and profile.

---

## [N] Missing `--organization-id` (required option)

```bash
codika organization create-key --name "test" --scopes "projects:read" --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error about missing required option `--organization-id`. Non-zero exit code.

**Why**: `--organization-id` is declared with `.requiredOption()` in Commander. Client-side validation -- no HTTP call is made.

---

## [N] Missing `--name` (required option)

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --scopes "projects:read" --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error about missing required option `--name`. Non-zero exit code.

**Why**: `--name` is declared with `.requiredOption()` in Commander.

---

## [N] Missing `--scopes` (required option)

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "test" --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error about missing required option `--scopes`. Non-zero exit code.

**Why**: `--scopes` is declared with `.requiredOption()` in Commander.

---

## [N] Missing API key -- no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "test" --scopes "projects:read" --profile nonexistent-profile-name 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Invalid scope

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-badscope" --scopes "fake:scope" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message contains "Invalid scope: fake:scope" and lists the valid scopes. Exit code 1.

**Why**: Server-side validation against the `ALL_SCOPES` array. The CLI passes scopes through without local validation; the Cloud Function rejects invalid ones.

---

## [N] Mix of valid and invalid scopes

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-mixscope" --scopes "projects:read,bogus:scope" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message contains "Invalid scope: bogus:scope". The valid scope (`projects:read`) does not cause partial creation.

**Why**: Ensures the server validates all scopes atomically. No key should be created if any scope is invalid.

---

## [N] Empty scopes after parsing

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-emptyscope" --scopes "," --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "At least one scope is required." Exit code `2`.

**Why**: The CLI splits on commas and filters empty strings. A bare comma produces an empty array, hitting the `exitWithError('At least one scope is required.')` guard at line 79. This is a client-side validation -- no HTTP call is made.

---

## [N] Invalid `--organization-id`

```bash
codika organization create-key --organization-id "nonexistent_org_id_12345" --name "cli-test-badorg" --scopes "projects:read" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about organization not found or unauthorized. Exit code 1.

**Why**: The Cloud Function validates the organization exists and the caller belongs to it. A fabricated org ID should be rejected.

---

## [N] Invalid API key

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "test" --scopes "projects:read" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before any business logic runs.

---

## [N] Error response in human-readable mode

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-badscope" --scopes "fake:scope" --profile cli-test-owner-full
```

**Expect**: Output contains `✗ Organization API Key Creation Failed`, the `Error:` field with the message, and `Request ID:`. Exit code 1.

**Why**: Tests the error display path in human-readable mode (lines 141-148 in create-key.ts). This is a separate code branch from JSON error output.

---

## [S] Scope enforcement -- limited key (no `api-keys:manage`)

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read` but NOT `api-keys:manage`.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-noscope" --scopes "projects:read" --profile cli-test-limited --json
```

**Expect**: `success: false`, error message contains `api-keys:manage`. Exit code 1.

**Why**: The Cloud Function requires `api-keys:manage` scope on the calling key. The scope check should happen before the role check. This proves `hasScope('api-keys:manage')` enforcement works.

---

## [S] Member cannot create keys (role check)

The member key (`cli-test-member`) has all 11 scopes including `api-keys:manage`, but the user is a regular member in the org (not admin or owner).

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-member-create" --scopes "projects:read" --profile cli-test-member --json
```

**Expect**: `success: false`, error contains "Only admins and owners can create API keys" (or similar role check error). Exit code 1.

**Why**: Scope is necessary but not sufficient. The Cloud Function checks `isManagementRole(userRole)` after the scope check. Members cannot create keys even with the right scope, preventing privilege escalation. This is the critical AuthZ test.

---

## [S] Cross-org isolation

A key from a different organization cannot create keys in the test org.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-crossorg" --scopes "projects:read" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or unauthorized. Exit code 1.

**Why**: The Cloud Function checks that the API key's organization matches the target `--organization-id`. Cross-org key creation is not allowed. The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY` (see setup.md).

---

## [S] Created key cannot exceed caller's scopes

An owner key with only `api-keys:manage` + `projects:read` should not be able to create a key with `deploy:use-case`.

```bash
# First create a restricted owner key with only api-keys:manage + projects:read
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-restricted-$(date +%s)" --scopes "api-keys:manage,projects:read" --profile cli-test-owner-full --json
```

Then use that restricted key to attempt creating a key with broader scopes:
```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-escalate" --scopes "deploy:use-case,projects:read" --profile <restricted-key-profile> --json
```

**Expect**: `success: false`, error about scope escalation (the caller cannot grant scopes they don't have). If the server allows it, note this as a security finding.

**Why**: Scope escalation prevention. A key should not be able to create another key with more permissions than it has. This is a defense-in-depth check.

**Cleanup**: Delete both keys and profiles.

---

## [S] Org key (`cko_`) type validation

Only personal keys (`ckp_`) and admin keys (`cka_`) should be able to create org keys. An existing org key with `api-keys:manage` may or may not be allowed depending on the Cloud Function's key type check.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-orgkey-create" --scopes "projects:read" --profile cli-test-owner-full --json
```

**Expect**: Document whether `cko_` keys (like `cli-test-owner-full`) can create other org keys. If the Cloud Function restricts to `ckp_`/`cka_` only, this should fail. If it allows `cko_` keys with `api-keys:manage`, document this behavior.

**Why**: The SKILL.md states "Requires personal key (`ckp_`) or admin key (`cka_`) with `api-keys:manage` scope." If org keys can also create keys, the documentation should be updated. This test validates or challenges the documented constraint.

---

## Last tested

Not yet tested.
