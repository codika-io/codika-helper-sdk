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

**Expect**: Table with `● Process Instances` header, column headers (Title, Env, Status, Version, Last Executed), one row per instance, footer showing count ("Showing 15 instances").

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

## [P] `--limit` count reflects limited result

When `--limit` truncates results, `data.count` should still match the returned array length.

```bash
codika list instances --limit 3 --profile cli-test-owner-full --json | jq '(.data.count == (.data.instances | length))'
```

**Expect**: `true`

**Why**: Ensures `count` tracks the actual returned set, not the total in the org.

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

## [P] Combined filters — `--environment prod --archived`

```bash
codika list instances --environment prod --archived --profile cli-test-owner-full --json | jq '[.data.instances[] | select(.environment != "prod" or .archived != true)] | length'
```

**Expect**: `0` (every returned instance is prod AND archived). The result set itself may be empty if no prod archived instances exist, which is also valid.

**Why**: Verifies that environment and archived filters compose correctly — no instance in the result should violate either filter.

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

## [S] Member instances are a subset of owner instances

```bash
OWNER_IDS=$(codika list instances --profile cli-test-owner-full --json | jq -r '[.data.instances[].processInstanceId] | sort | .[]')
MEMBER_IDS=$(codika list instances --profile cli-test-member --json | jq -r '[.data.instances[].processInstanceId] | sort | .[]')
echo "$MEMBER_IDS" | while read id; do echo "$OWNER_IDS" | grep -q "$id" && echo "OK:$id" || echo "FAIL:$id"; done
```

**Expect**: Every member instance ID appears in the owner set. No `FAIL:` lines.

**Why**: The member should never see an instance that the owner cannot see. If they do, the sharing model has a privilege escalation bug.

---

## [S] Scope enforcement — limited key (has `instances:read`)

The limited key has `deploy:use-case` + `instances:read`, so it SHOULD be able to list instances. Its userId is the owner, so it sees all instances.

```bash
codika list instances --profile cli-test-limited --json | jq '[.success, .data.count]'
```

**Expect**: `[true, 15]`

**Why**: Confirms that `instances:read` is sufficient for listing instances, regardless of what other scopes the key has or lacks. The count of 15 matches the owner because the key's userId is the owner.

---

## [S] Cross-org key cannot see test org instances

```bash
codika list instances --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq '.data.organizationId'
```

**Expect**: `"HF5DaJQamZxIeMj0zfWY"` (the cross-org's own org, NOT `l0gM8nHm2o2lpupMpm5x`). The response should contain only instances from the cross-org's organization (6 instances).

**Why**: Proves organization isolation — the API key is scoped to its own org and cannot see the test org's instances.

---

## [S] Cross-org instance IDs do not overlap with test org

```bash
CROSS_IDS=$(codika list instances --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq -r '[.data.instances[].processInstanceId] | .[]')
TEST_IDS=$(codika list instances --profile cli-test-owner-full --json | jq -r '[.data.instances[].processInstanceId] | .[]')
OVERLAP=$(comm -12 <(echo "$CROSS_IDS" | sort) <(echo "$TEST_IDS" | sort) | wc -l | tr -d ' ')
[ "$OVERLAP" -eq 0 ] && echo "PASS" || echo "FAIL:$OVERLAP"
```

**Expect**: `PASS` — zero overlapping instance IDs between the two orgs.

**Why**: Belt-and-suspenders check on org isolation. Even if `organizationId` looks correct, the actual instance data must not leak across orgs.

---

## [N] Invalid API key

```bash
codika list instances --api-key "cko_garbage_key_here" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic. Exit code is 1 (API error, not CLI validation).

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path (exit code 2).

```bash
codika list instances --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Invalid `--limit` value — non-numeric

```bash
codika list instances --limit abc --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Invalid limit. Must be a positive integer." Exit code `2`.

**Why**: Verifies the limit validation guard catches NaN input. The guard checks `isNaN(limit) || limit < 1`.

---

## [N] Invalid `--limit` value — zero

```bash
codika list instances --limit 0 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Same — exit code `2`, "Invalid limit" message. Zero satisfies `limit < 1`.

**Why**: Boundary case for the limit validation — ensures zero is not accepted as a valid limit.

---

## [N] Invalid `--limit` value — negative

```bash
codika list instances --limit -5 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, "Invalid limit" message. Negative numbers satisfy `limit < 1`.

**Why**: Edge case for the limit validation — ensures negative values are caught by the same guard.

---

## [N] Invalid `--environment` value

The CLI passes `--environment` through to the API without client-side validation. The Cloud Function only recognizes `dev` and `prod`.

```bash
codika list instances --environment staging --profile cli-test-owner-full --json | jq '.data.instances | length'
```

**Expect**: `0` (empty result set) or an API error. The Cloud Function should not return instances from other environments when an unrecognized value is passed.

**Why**: Verifies that invalid environment values don't cause unexpected behavior (e.g., returning all instances, or a 500 error).

---

## Last tested

Not yet tested.
