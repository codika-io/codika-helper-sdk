# `codika organization update-key`

Updates an existing organization API key's scopes, name, or description without revoking and recreating it.

**Scope required**: `api-keys:manage`
**Role required**: Admin or owner in the organization
**Method**: POST (body: `{ keyId, scopes?, name?, description? }`)
**Cloud Function**: `updateOrganizationApiKeyPublic`

**Test key**: `1QwX6lSm83jf5PTOvqCl` (the limited key — expendable, safe to mutate)

---

## [P] Update scopes

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case,instances:read,projects:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.scopes` = `["deploy:use-case", "instances:read", "projects:read"]`.

**Why**: Core happy path — the most common use case is changing what a key can do.

**Cleanup**: Revert scopes after test:
```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case,instances:read" --profile cli-test-owner-full --json
```

---

## [P] Update name

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --name "Renamed Key" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.name` = `"Renamed Key"`.

**Why**: Name-only updates should work without touching scopes.

**Cleanup**: `--name "cli-test-limited"`

---

## [P] Update description

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --description "Test description value" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.description` = `"Test description value"`.

**Why**: Description-only updates should work independently.

---

## [P] Update multiple fields at once

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --name "Multi Updated" --scopes "deploy:use-case,instances:read" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both `data.name` = `"Multi Updated"` and `data.scopes` updated.

**Why**: The API supports partial updates — any combination of fields should work.

---

## [P] Clear description

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --description "" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.description` = `""`.

**Why**: Empty string should be a valid description update (clears the field).

---

## [P] Human-readable output

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --name "cli-test-limited" --profile cli-test-owner-full
```

**Expect**: `✓ API key updated` header, followed by Key ID, Name, Scopes.

**Why**: Verifies the formatted output path.

---

## [P] Functional scope verification

This is the most important test — proves that `update-key` actually changes real scopes in Firestore, not just the API response.

```bash
# Step 1: Add projects:read to limited key
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case,projects:read" --profile cli-test-owner-full --json

# Step 2: Limited key should now be able to get a project (it couldn't before)
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: Step 1 succeeds. Step 2 succeeds (`success: true`). Before the update, this key was blocked with "projects:read scope" error.

**Why**: Without this test, we'd only know the API *says* it updated — not that it *actually* changed the key's effective permissions.

**Cleanup**:
```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case,instances:read" --profile cli-test-owner-full --json
```

---

## [N] Missing `--key-id`

```bash
codika organization update-key --scopes "deploy:use-case" --profile cli-test-owner-full
```

**Expect**: Commander error — required option `--key-id` missing.

**Why**: Client-side validation before hitting the API.

---

## [N] No update fields provided

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --profile cli-test-owner-full
```

**Expect**: Exit code 2, error: "at least one field to update is required".

**Why**: CLI validates that at least one of `--scopes`, `--name`, or `--description` is provided before making the API call.

---

## [N] Nonexistent key ID

```bash
codika organization update-key --key-id "nonexistent123" --scopes "deploy:use-case" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error: "API key not found."

**Why**: Standard 404 handling.

---

## [N] Invalid scope

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "fake:scope" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Invalid scope: fake:scope" and lists valid scopes.

**Why**: Server-side validation against `ALL_SCOPES` array.

---

## [S] Member cannot update keys

The member is a regular member in the org, not an admin or owner. Even though the member key has `api-keys:manage` scope, the Cloud Function checks the user's org role.

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --profile cli-test-member --json
```

**Expect**: `success: false`, error: "Only admins and owners can update API keys."

**Why**: Scope is necessary but not sufficient. The `isManagementRole(userRole)` check requires the user to actually be an admin/owner in the org, preventing members from escalating key permissions.

---

## [S] Scope enforcement — limited key

The limited key has `deploy:use-case` + `instances:read` but NOT `api-keys:manage`.

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `api-keys:manage`.

**Why**: The scope check happens before the role check. Key is rejected at the scope layer.

---

## [S] Cross-org isolation

A key from a different organization should not be able to update keys in the test org.

```bash
codika organization update-key --key-id "R7wKRSuJ5BuQNVUqLtuJ" --scopes "deploy:use-case" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or scope error.

**Why**: The Cloud Function checks `keyData.organizationId !== authContext.organizationId`. Even if the cross-org key had `api-keys:manage`, it cannot modify keys belonging to a different organization.

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. Hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Empty `--scopes` value

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains `--scopes cannot be empty.`

**Why**: Validates the empty-scopes guard. The split/filter/Boolean logic produces an empty array, which triggers this guard. Without this test, `--scopes ""` could silently pass through and clear all scopes server-side.

---

## [N] Invalid API key

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized / invalid API key.

**Why**: Verifies the auth middleware rejects invalid keys before reaching business logic. Distinct from "missing key" (exit code 2) — this is an API-level rejection (exit code 1).

---

## [N] Human-readable error output

```bash
codika organization update-key --key-id "nonexistent123" --scopes "deploy:use-case" --profile cli-test-owner-full
```

**Expect**: `✗ API Key Update Failed` header, followed by `Error:` and `Request ID:` lines. No JSON.

**Why**: Verifies the `isUpdateKeyError` branch in the non-JSON output path (lines 104-111 of source). All other negative tests use `--json`; this confirms the human-readable error formatting works too.

---

## [P] `--api-url` flag is accepted

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --name "cli-test-limited" --api-url "https://localhost:9999" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about network/connection failure (not a "not found" or "unauthorized" error from the real API). Confirms the `--api-url` flag is wired through to `resolveEndpointUrl`.

**Why**: Using a deliberately bogus URL proves the flag overrides the default endpoint. A network error confirms the CLI attempted to call the overridden URL, not the production default.

---

## Last tested

2026-03-31 — 13/13 PASS (original tests)
2026-04-04 — +5 new tests added (untested)
