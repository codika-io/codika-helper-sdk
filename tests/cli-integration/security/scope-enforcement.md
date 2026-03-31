# Scope Enforcement Tests

Verifies that every endpoint correctly rejects API keys that lack the required scope. Uses the `cli-test-limited` profile which has only `deploy:use-case` + `instances:read`.

**Principle**: A valid, authenticated key in the correct organization should still be rejected if it lacks the specific scope required by the endpoint.

---

## New endpoints (projects:read, api-keys:manage)

### list projects — requires `projects:read`

```bash
codika list projects --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `projects:read`.

---

### get project — requires `projects:read`

```bash
codika get project h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `projects:read`.

---

### update-key — requires `api-keys:manage`

```bash
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" --scopes "deploy:use-case" --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `api-keys:manage`.

---

### get instance — requires `instances:read` (limited key HAS this)

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json | jq '.success'
```

**Expect**: `true` — limited key has `instances:read`, so this should PASS.

**Why**: Confirms scope enforcement is granular — having one scope doesn't grant or deny others.

---

## Future: Add tests for all endpoints here as command tests are written

Each new command test file covers scope enforcement inline. This file serves as the cross-cutting index ensuring no endpoint is missed.

| Endpoint | Required Scope | Limited Key Has It? | Expected |
|---|---|---|---|
| `list projects` | `projects:read` | No | Blocked |
| `get project` | `projects:read` | No | Blocked |
| `get instance` | `instances:read` | Yes | Allowed |
| `update-key` | `api-keys:manage` | No | Blocked |
| `list instances` | `instances:read` | Yes | Allowed |
| `activate/deactivate` | `instances:manage` | No | Blocked |
| `trigger` | `workflows:trigger` | No | Blocked |
| `list executions` | `executions:read` | No | Blocked |
| `get execution` | `executions:read` | No | Blocked |
| `create-key` | `api-keys:manage` | No | Blocked |
| `integration *` | `integrations:manage` | No | Blocked |
| `get skills` | `skills:read` | No | Blocked |
| `create project` | `projects:create` | No | Blocked |
| `deploy use-case` | `deploy:use-case` | Yes | Allowed |

---

## Last tested

2026-03-31 — 4/4 PASS (new endpoints only)
