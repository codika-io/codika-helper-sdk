# `codika organization create-key`

Creates a new API key scoped to an organization. On success, automatically saves the new key as a named profile and sets it as the active profile. Requires a key with `api-keys:manage` scope and the caller must be an admin or owner in the target organization.

**Scope required**: `api-keys:manage`
**Role required**: Admin or owner in the organization
**Method**: POST (body: `{ organizationId, name, scopes, description?, expiresInDays? }`)
**Cloud Function**: `createOrganizationApiKeyPublic`

**Note**: Each successful run creates a real API key and a new profile. Clean up by deleting the key and profile after testing.

---

## [P] Happy path -- create key with JSON output

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-temp-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.apiKey` starts with `cko_`, `data.keyId` is a non-empty string, `data.keyPrefix` present, `data.name` matches input, `data.scopes` = `["projects:read"]`, `data.createdAt` present. `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies key creation, scope parsing, and the full response shape.

**Cleanup**: Delete the key via `codika organization update-key` or Firestore console. Remove the auto-created profile: `codika logout <profile-name>`.

---

## [P] Human-readable output

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-hr-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full
```

**Expect**: Output shows `Creating API key "..." for organization ...`, then `✓ Organization API Key Created Successfully`, the warning `Save the API key below`, and fields: API Key, Key Prefix, Key ID, Name, Scopes, Created, Request ID, and `Saved as profile "..." (now active)`.

**Why**: Verifies the formatted output including the save warning and auto-profile message.

**Cleanup**: Delete key and profile. Restore active profile: `codika use cli-test-owner-full`.

---

## [P] Auto-saves profile

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-autosave-$(date +%s)" --scopes "projects:read" --profile cli-test-owner-full --json
```

After running, verify:
```bash
codika use
```

**Expect**: The newly created key appears as a profile in `codika use` output and is set as the active profile. The profile name is derived from the key name and prefix.

**Why**: Auto-saving the profile eliminates the manual `codika login` step after key creation, improving developer experience.

**Cleanup**: `codika use cli-test-owner-full` to restore, then `codika logout <new-profile>`.

---

## [P] Multiple scopes

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-multi-$(date +%s)" --scopes "deploy:use-case,projects:read,instances:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.scopes` = `["deploy:use-case", "projects:read", "instances:read"]`.

**Why**: Scopes are parsed from a comma-separated string. Multiple scopes should all be included in the created key.

**Cleanup**: Delete key and profile.

---

## [P] `--description` flag

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-desc-$(date +%s)" --scopes "projects:read" --description "Test key for CLI integration" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, description is stored with the key.

**Why**: Optional description field should be passed through to the API.

**Cleanup**: Delete key and profile.

---

## [P] `--expires-in-days` flag

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-expiry-$(date +%s)" --scopes "projects:read" --expires-in-days 7 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.expiresAt` is approximately 7 days from now. Human-readable output shows the "Expires" field.

**Why**: Key expiry is important for security. The `--expires-in-days` flag is parsed as an integer and passed to the API.

**Cleanup**: Delete key and profile.

---

## [N] Missing `--organization-id` (required option)

```bash
codika organization create-key --name "test" --scopes "projects:read" --profile cli-test-owner-full
```

**Expect**: Commander error -- required option `--organization-id` missing.

**Why**: `--organization-id` is a `requiredOption` in Commander. Client-side validation.

---

## [N] Missing `--name` (required option)

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --scopes "projects:read" --profile cli-test-owner-full
```

**Expect**: Commander error -- required option `--name` missing.

**Why**: `--name` is a `requiredOption` in Commander.

---

## [N] Missing `--scopes` (required option)

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "test" --profile cli-test-owner-full
```

**Expect**: Commander error -- required option `--scopes` missing.

**Why**: `--scopes` is a `requiredOption` in Commander.

---

## [N] Invalid scope

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-badscope" --scopes "fake:scope" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Invalid scope: fake:scope" and lists valid scopes.

**Why**: Server-side validation against the `ALL_SCOPES` array. The CLI passes the scopes through; the Cloud Function validates them.

---

## [S] Member cannot create keys (role check)

The member key has `api-keys:manage` scope but the user is a regular member in the org, not an admin or owner.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-member-create" --scopes "projects:read" --profile cli-test-member --json
```

**Expect**: `success: false`, error: "Only admins and owners can create API keys." (or similar role check error).

**Why**: Scope is necessary but not sufficient. The Cloud Function checks the user's org role via `isManagementRole(userRole)`. Members cannot create keys even with the right scope, preventing privilege escalation.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read` but NOT `api-keys:manage`.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-noscope" --scopes "projects:read" --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `api-keys:manage`.

**Why**: The scope check happens before the role check. The limited key is rejected at the scope layer.

---

## [S] Cross-org isolation

A key from a different organization cannot create keys in the test org.

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "cli-test-crossorg" --scopes "projects:read" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or unauthorized.

**Why**: The Cloud Function checks that the API key's organization matches the target `--organization-id`. Cross-org key creation is not allowed.

---

## [S] Invalid API key

```bash
codika organization create-key --organization-id l0gM8nHm2o2lpupMpm5x --name "test" --scopes "projects:read" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
