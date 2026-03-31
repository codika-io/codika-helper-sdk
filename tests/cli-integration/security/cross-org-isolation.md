# Cross-Organization Isolation Tests

Verifies that a key from one organization cannot access resources in another organization.

**Cross-org key**: `cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs` (org `HF5DaJQamZxIeMj0zfWY`)
**Test org**: `l0gM8nHm2o2lpupMpm5x`

**Principle**: Organization isolation is enforced at the Cloud Function level. A valid, authenticated key from org A must never be able to read, list, or modify resources belonging to org B.

---

## list projects

```bash
codika list projects --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Either scope error (key lacks `projects:read`) or success with only the cross-org's own projects — never test org's projects.

**Why**: `listProjectsPublic` queries `organizationId == authContext.organizationId`. Even if both orgs have projects, each key only sees its own org's data.

---

## get project (test org's project)

```bash
codika get project h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Blocked — scope error or org isolation error.

**Why**: `getProjectPublic` checks `project.organizationId !== authContext.organizationId`. The project belongs to the test org, not the cross-org.

---

## get instance (test org's instance)

```bash
codika get instance 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error: "does not have access to this process instance".

**Why**: `getProcessInstancePublic` checks `instance.organizationId !== authContext.organizationId`.

---

## update-key (test org's key)

```bash
codika organization update-key --key-id "R7wKRSuJ5BuQNVUqLtuJ" --scopes "deploy:use-case" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error: "API key does not belong to your organization."

**Why**: `updateOrganizationApiKeyPublic` checks `keyData.organizationId !== authContext.organizationId`. This is the most direct org isolation check — the cross-org key cannot modify another org's keys.

---

## list instances (cross-org sees own data only)

```bash
codika list instances --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json | jq '.data.organizationId'
```

**Expect**: `"HF5DaJQamZxIeMj0zfWY"` — the cross-org's own org ID, NOT the test org's.

**Why**: Confirms the list endpoint scopes results to the caller's org.

---

## Last tested

2026-03-31 — 5/5 PASS
