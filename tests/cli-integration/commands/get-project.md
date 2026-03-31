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

## Last tested

2026-03-31 — 12/12 PASS
