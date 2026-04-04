# `codika list projects`

Lists all projects in the authenticated organization. Results are filtered by the caller's role: owners/admins see all projects, regular members see only their own.

**Scope required**: `projects:read`
**Method**: GET
**Cloud Function**: `listProjectsPublic`

---

## [P] Happy path — Owner lists all projects

Owner should see every project in the org (both own and member-created).

```bash
codika list projects --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.projects` is an array, `data.organizationId` = `l0gM8nHm2o2lpupMpm5x`, `data.count` matches array length. Projects include both owner-created and member-created entries.

**Why**: Confirms the basic flow works — auth, scope check, Firestore query, response shaping.

---

## [P] Human-readable output

```bash
codika list projects --profile cli-test-owner-full
```

**Expect**: Table with `● Projects` header, column headers (Name, Status, Published, Created), one row per project, footer showing count.

**Why**: Verifies the CLI table formatter works, not just the JSON path.

---

## [P] Each project has the correct fields

```bash
codika list projects --profile cli-test-owner-full --json | jq '.data.projects[0] | keys'
```

**Expect**: Exactly 8 keys: `archived`, `createdAt`, `createdBy`, `description`, `hasPublishedProcess`, `id`, `name`, `status`.

**Why**: Ensures the Cloud Function returns the right shape and doesn't leak internal fields (no `roles`, `stages`, `documentTags`).

---

## [P] `--limit` flag

```bash
codika list projects --limit 1 --profile cli-test-owner-full --json | jq '.data.projects | length'
```

**Expect**: `1`

**Why**: Verifies the limit query param is passed through and respected by the Cloud Function.

---

## [P] `--archived` flag

```bash
codika list projects --archived --profile cli-test-owner-full --json | jq '[.data.projects[] | .archived] | unique'
```

**Expect**: `[true]` or empty array (if no archived projects exist). Never `false` values.

**Why**: Verifies the archived filter is correctly applied in the Firestore query.

---

## [P] Default returns only non-archived

```bash
codika list projects --profile cli-test-owner-full --json | jq '[.data.projects[] | .archived] | unique'
```

**Expect**: `[false]`

**Why**: Confirms the default behavior (no `--archived` flag) filters out archived projects.

---

## [P] Count matches array length

```bash
codika list projects --profile cli-test-owner-full --json | jq '(.data.count == (.data.projects | length))'
```

**Expect**: `true`

**Why**: Sanity check that the `count` field matches the actual data.

---

## [S] Member sees only own projects

The member user should NOT see owner-created projects. This tests the access filtering in the Cloud Function (line 127 of `listProjectsPublic.ts`: `createdBy !== authContext.userId`).

```bash
codika list projects --profile cli-test-member --json | jq '.data.projects[] | .createdBy' | sort -u
```

**Expect**: Only `"rILcnT0NfogoBEXbSTHPqxvTEEA2"` (the member's userId). Never `"2TqvxNzA2eho6RaDPtCf1o4lmCH2"` (the owner's userId).

**Why**: This is the critical access control test. The member has the scope but should only see projects they created. The Cloud Function checks org admin status first (member is NOT admin), then falls back to `createdBy` filtering.

---

## [N] Invalid API key

```bash
codika list projects --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## [S] Scope enforcement — limited key

The limited key has `deploy:use-case` + `instances:read` but NOT `projects:read`.

```bash
codika list projects --profile cli-test-limited --json
```

**Expect**: Exit code 1, `success: false`, error message contains `projects:read`.

**Why**: Proves the `hasScope('projects:read')` check in the Cloud Function works. The key authenticates fine (valid key, right org) but is rejected for lacking the required scope.

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
codika list projects --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Invalid `--limit` value

```bash
codika list projects --limit abc --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Invalid limit. Must be a positive integer." Exit code `2`.

```bash
codika list projects --limit 0 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Same — exit code `2`, "Invalid limit" message. The guard checks `isNaN(limit) || limit < 1`.

**Why**: Verifies the limit validation guard. Both NaN (`abc`) and below-minimum (`0`) must be rejected with exit code 2.

---

## [S] Cross-org isolation

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must never return projects from the test org (`l0gM8nHm2o2lpupMpm5x`).

```bash
codika list projects --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq '.data.organizationId'
```

**Expect**: Either `"HF5DaJQamZxIeMj0zfWY"` (their own org) or an error if the key lacks `projects:read`. Never `"l0gM8nHm2o2lpupMpm5x"`. The projects array must not contain any project IDs from the test org (e.g., `h8iCqSgTjSsKySyufq36`).

**Why**: Confirms that organization-level data isolation holds. A valid key from org B cannot see org A's projects, even though both orgs exist in the same Firestore database.

---

## [N] `--limit` negative value

```bash
codika list projects --limit -5 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, "Invalid limit" message. Negative numbers satisfy `limit < 1`.

**Why**: Edge case for the limit validation — ensures negative values are caught by the same guard.

---

## Last tested

2026-03-31 — 10/10 PASS
