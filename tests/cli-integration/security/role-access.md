# Role-Based Access Tests

Verifies that org role (owner vs member) determines what a user can see and do, even when both have the same scopes.

**Owner profile**: `cli-test-owner-full` (userId `2TqvxNzA2eho6RaDPtCf1o4lmCH2`)
**Member profile**: `cli-test-member` (userId `rILcnT0NfogoBEXbSTHPqxvTEEA2`)
Both have all 11 scopes — the difference is purely role-based.

**Principle**: Scopes control what endpoints a key can call. Roles control what data the user can access within those endpoints.

---

## list projects — member sees only own

```bash
codika list projects --profile cli-test-member --json | jq '.data.projects[] | .createdBy' | sort -u
```

**Expect**: Only `"rILcnT0NfogoBEXbSTHPqxvTEEA2"`. No owner userId.

**Why**: `listProjectsPublic` checks if the user is an org admin. Members are not, so the function falls back to `createdBy` filtering. The member user has 6 projects; the owner has 8 — the member must never see the owner's 8.

---

## list projects — owner sees all

```bash
codika list projects --profile cli-test-owner-full --json | jq '.data.count'
```

**Expect**: `14` (all projects in the org).

**Why**: Owner passes the `verifyOrganizationAccess(userId, orgId, 'admin')` check, so no `createdBy` filtering is applied.

---

## get project — member denied on owner's project

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-member --json
```

**Expect**: `success: false`, error about permission denied.

**Why**: `canAccessProjectViaApiKey` checks: admin key? No. Creator? No (owner created it). Org admin? No (member role). Result: denied.

---

## get project — member allowed on own project

```bash
codika get project TNrsaJGORHAbuaAnDQmw --profile cli-test-member --json | jq '.success'
```

**Expect**: `true`

**Why**: `canAccessProjectViaApiKey` matches `createdBy === authContext.userId` — the member created this project.

---

## get project — owner can see member's project

```bash
codika get project TNrsaJGORHAbuaAnDQmw --profile cli-test-owner-full --json | jq '.data.name'
```

**Expect**: `"Member Fixed Test"` — success.

**Why**: Owner passes the org admin check, so they can see any project regardless of creator.

---

## update-key — member denied

Even though the member key has `api-keys:manage` scope, the member user is not an admin/owner.

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --profile cli-test-member --json
```

**Expect**: `success: false`, error: "Only admins and owners can update API keys."

**Why**: `isManagementRole(userRole)` returns false for the member role. This is a role check, not a scope check — it prevents privilege escalation where a member with `api-keys:manage` scope could modify key permissions.

---

## update-key — owner allowed

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --name "cli-test-limited" --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Owner passes both the scope check (`api-keys:manage`) and the role check (`isManagementRole('owner')`).

---

## Last tested

2026-03-31 — 7/7 PASS
