# `codika list instances`

Lists process instances for the authenticated organization. Results vary by role: owners see all instances, members see only shared instances.

**Scope required**: `instances:read`
**Method**: GET
**Cloud Function**: `listProcessInstancesPublic`

---

## [P] Happy path — Owner lists all instances

Owner should see every instance in the org.

```bash
codika list instances --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.instances` is an array, `data.organizationId` = `l0gM8nHm2o2lpupMpm5x`, `data.count` matches array length. Count is 15.

**Why**: Confirms the basic flow works — auth, scope check, Firestore query, response shaping.

---

## [P] Human-readable output

```bash
codika list instances --profile cli-test-owner-full
```

**Expect**: Table with `● Process Instances` header, column headers (Title, Env, Status, Version, Last Executed), one row per instance, footer showing count.

**Why**: Verifies the CLI table formatter works, not just the JSON path.

---

## [P] Each instance has the correct fields

```bash
codika list instances --profile cli-test-owner-full --json | jq '.data.instances[0] | keys'
```

**Expect**: Exactly 10 keys: `archived`, `currentVersion`, `environment`, `inactiveReason`, `installedAt`, `isActive`, `lastExecutedAt`, `processId`, `processInstanceId`, `title`. (Note: `inactiveReason` may be absent on active instances — check with `keys_unsorted` on a known inactive instance if needed.)

**Why**: Ensures the Cloud Function returns the right shape and doesn't leak internal fields.

---

## [P] Count matches array length

```bash
codika list instances --profile cli-test-owner-full --json | jq '(.data.count == (.data.instances | length))'
```

**Expect**: `true`

**Why**: Sanity check that the `count` field matches the actual data.

---

## [P] `--environment dev` filter

```bash
codika list instances --environment dev --profile cli-test-owner-full --json | jq '[.data.instances[] | .environment] | unique'
```

**Expect**: `["dev"]`

**Why**: Verifies the environment query param is passed through and the Cloud Function filters correctly. No `prod` instances should appear.

---

## [P] `--environment prod` filter

```bash
codika list instances --environment prod --profile cli-test-owner-full --json | jq '[.data.instances[] | .environment] | unique'
```

**Expect**: `["prod"]`

**Why**: Confirms the prod filter works symmetrically. Result set should be different from the dev filter.

---

## [P] `--limit` flag

```bash
codika list instances --limit 2 --profile cli-test-owner-full --json | jq '.data.instances | length'
```

**Expect**: `2`

**Why**: Verifies the limit query param is passed through and respected by the Cloud Function.

---

## [P] `--archived` flag

```bash
codika list instances --archived --profile cli-test-owner-full --json | jq '[.data.instances[] | .archived] | unique'
```

**Expect**: `[true]` or empty array (if no archived instances exist). Never `false` values.

**Why**: Verifies the archived filter is correctly applied in the Firestore query.

---

## [P] Default returns only non-archived

```bash
codika list instances --profile cli-test-owner-full --json | jq '[.data.instances[] | .archived] | unique'
```

**Expect**: `[false]`

**Why**: Confirms the default behavior (no `--archived` flag) filters out archived instances.

---

## [P] Combined filters — `--environment dev --limit 1`

```bash
codika list instances --environment dev --limit 1 --profile cli-test-owner-full --json | jq '(.data.instances | length) as $len | (.data.instances[0].environment) as $env | [$len, $env]'
```

**Expect**: `[1, "dev"]`

**Why**: Verifies that multiple filters compose correctly.

---

## [S] Member sees fewer instances

The member user should only see shared instances (7 vs owner's 15).

```bash
codika list instances --profile cli-test-member --json | jq '.data.count'
```

**Expect**: `7` (fewer than owner's 15).

**Why**: This is the critical access control test. The member has the `instances:read` scope but the Cloud Function applies sharing model filtering, limiting visibility to instances shared with the member.

---

## [S] Member count differs from owner count

```bash
OWNER_COUNT=$(codika list instances --profile cli-test-owner-full --json | jq '.data.count')
MEMBER_COUNT=$(codika list instances --profile cli-test-member --json | jq '.data.count')
[ "$OWNER_COUNT" -gt "$MEMBER_COUNT" ] && echo "PASS" || echo "FAIL"
```

**Expect**: `PASS` — owner sees strictly more instances than member.

**Why**: Confirms the role-based filtering is working. If counts are equal, the sharing model is broken.

---

## [S] Scope enforcement — limited key

The limited key has `deploy:use-case` + `instances:read`, so it SHOULD be able to list instances.

```bash
codika list instances --profile cli-test-limited --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms that `instances:read` is sufficient for listing instances, regardless of what other scopes the key has or lacks.

---

## [S] Cross-org key cannot see test org instances

```bash
codika list instances --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq '.data.organizationId'
```

**Expect**: `"HF5DaJQamZxIeMj0zfWY"` (the cross-org's own org, NOT `l0gM8nHm2o2lpupMpm5x`). The response should contain only instances from the cross-org's organization.

**Why**: Proves organization isolation — the API key is scoped to its own org and cannot see the test org's instances.

---

## [N] Invalid API key

```bash
codika list instances --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## [N] Invalid `--limit` value

```bash
codika list instances --limit -5 --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error message about invalid limit / must be a positive integer.

**Why**: Verifies client-side validation of the limit parameter before the API call is made.

---

## [N] Invalid `--environment` value

```bash
codika list instances --environment staging --profile cli-test-owner-full --json
```

**Expect**: Either an empty result set or an error. The Cloud Function only accepts `dev` or `prod`.

**Why**: Verifies that invalid environment values don't cause unexpected behavior.

---

## Last tested

Not yet tested.
