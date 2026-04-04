# `codika get project <projectId>`

Fetches details for a single project: status, deployment version, stage info, and whether it has a published process.

**Scope required**: `projects:read`
**Method**: POST (body: `{ projectId }`)
**Cloud Function**: `getProjectPublic`

---

## [P] Owner gets own project — JSON

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.id` = `h8iCqSgTjSsKySyufq36`, all 12 fields present: `id`, `name`, `description`, `status`, `hasPublishedProcess`, `processId`, `currentDeployment`, `createdBy`, `createdAt`, `archived`, `stageCount`, `currentStage`.

**Why**: Confirms the full response shape matches the API contract.

---

## [P] Owner gets own project — human readable

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full
```

**Expect**: `✓ Project` header, followed by key-value pairs: Project ID, Name, Status, Published, Stages, Created.

**Why**: Verifies the human-readable formatter works independently of JSON output.

---

## [P] All 12 fields present

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json | jq '.data | keys | length'
```

**Expect**: `12`

**Why**: Guards against accidentally dropping fields in future changes.

---

## [P] Owner can see member's project

An org owner/admin should have visibility into all projects, regardless of who created them.

```bash
codika get project TNrsaJGORHAbuaAnDQmw --profile cli-test-owner-full --json | jq '.data.name'
```

**Expect**: `"Member Fixed Test"` — success, project data returned.

**Why**: Tests the `canAccessProjectViaApiKey` logic — owner bypasses the `createdBy` check via `verifyOrganizationAccess('admin')`.

---

## [P] Member can see own project

```bash
codika get project TNrsaJGORHAbuaAnDQmw --profile cli-test-member --json | jq '.data.name'
```

**Expect**: `"Member Fixed Test"` — success.

**Why**: Confirms the `createdBy === authContext.userId` path works for the project creator.

---

## [S] Member CANNOT see owner's project

This is the critical access control test. A regular member should be denied access to projects created by other users.

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-member --json
```

**Expect**: Exit code 1, `success: false`, error contains "does not have access" or "permission denied".

**Why**: Tests the negative path in `canAccessProjectViaApiKey` — member is not the creator, not an admin, so access is denied. This prevents data leaks between users in the same org.

---

## [P] No sensitive data leaked

The response should NOT contain internal Firestore fields.

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json | jq '.data | has("roles", "stages", "documentTags")'
```

**Expect**: `false`

**Why**: The `roles` map, full `stages` config objects, and `documentTags` are internal. The API returns only `stageCount` and `currentStage` as summaries.

---

## [N] Nonexistent project ID

```bash
codika get project nonexistent-id-12345 --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, `success: false`, error contains "not found".

**Why**: Verifies the 404 path in the Cloud Function.

---

## [N] Invalid API key

```bash
codika get project h8iCqSgTjSsKySyufq36 --api-key "cko_garbage" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Auth middleware rejects before reaching business logic.

---

## [S] Scope enforcement — limited key

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: Exit code 1, error contains `projects:read`.

**Why**: The limited key authenticates (valid key, right org) but lacks the required scope.

---

## [S] Cross-org isolation

A key from a different organization should not be able to read projects in the test org.

```bash
codika get project h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code 1, blocked (either scope error if key lacks `projects:read`, or org isolation error).

**Why**: Tests the `organizationId !== authContext.organizationId` check in the Cloud Function. Even if the cross-org key somehow had `projects:read`, it would be blocked by org isolation.

---

## [P] Admin key can access any project

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile codika-admin-macbook-pro --json
```

**Expect**: Success (if admin key has `projects:read` scope) or scope error (if not). Admin keys bypass org isolation via `isAdminApiKey()` check.

**Why**: Confirms admin keys can cross-org access as designed.

---

## [N] Missing project ID argument

Commander should reject when no positional argument is provided.

```bash
codika get project --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Non-zero exit code, error message about missing argument (Commander prints `error: missing required argument 'projectId'`). No API call made.

**Why**: Validates that Commander's built-in argument enforcement works. This is the first guard before any business logic runs.

---

## [N] Missing API key — exit code 2

No `--api-key`, no `--profile`, no `CODIKA_API_KEY` env var. The CLI should fail with exit code 2 (CLI validation error), not exit code 1 (API error).

```bash
CODIKA_API_KEY= codika get project h8iCqSgTjSsKySyufq36 --profile nonexistent-profile --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, stderr contains `API key is required`. No API call made.

**Why**: Tests the `exitWithError(API_KEY_MISSING_MESSAGE)` path (line 54 in source). Exit code 2 distinguishes local validation errors from remote API errors (exit code 1). This is documented in the exit codes table but had no dedicated test.

---

## [P] --api-url flag overrides endpoint

The `--api-url` flag should override the resolved endpoint URL. Pointing it at a bogus URL should produce a network error, proving the flag was used.

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --api-url "https://localhost:1/fake" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about connection refused or fetch failure (not a "not found" or "unauthorized" error from the real API).

**Why**: The `--api-url` flag is one of four `.option()` declarations but had no test. This confirms `resolveEndpointUrl` respects the flag override.

---

## Last tested

2026-03-31 — 12/12 PASS
