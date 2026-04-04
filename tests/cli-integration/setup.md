# Test Environment Setup

One-time setup for CLI integration tests. Creates the organization, users, keys, and resources needed by all command tests.

## Test Organization

| Field | Value |
|---|---|
| **Org ID** | `l0gM8nHm2o2lpupMpm5x` |
| **Name** | Test Organization from CLI |
| **Owner userId** | `2TqvxNzA2eho6RaDPtCf1o4lmCH2` |
| **Member userId** | `rILcnT0NfogoBEXbSTHPqxvTEEA2` |

## Create-Key Test Organization (v2)

Used for `organization-create-key.md` positive tests (the primary org hit the 20-key limit).

| Field | Value |
|---|---|
| **Org ID** | `GuXOipBEJdgGmKkxujbR` |
| **Name** | CLI Test Org v2 |

| Profile | Key Prefix | Role | Scopes | Firestore Key ID |
|---|---|---|---|---|
| `cli-test-owner-full-v2` | `cko_SQMYYEgQ` | Owner | All 10 | `dpiCGBPMVb5BFeHKzyN7` |
| `cli-test-owner-v2` | `cko_6y19HWmM` | Owner | All 10 | `tj3zzB76aW2mabaLHB6X` |
| `cli-test-limited-v2` | `cko_S-JjyODW` | Owner | `deploy:use-case`, `instances:read` | `bn6fO4HaCWzm9UoWgyST` |

## Cross-Org (for isolation tests)

| Field | Value |
|---|---|
| **Org ID** | `HF5DaJQamZxIeMj0zfWY` |
| **Key** | `cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs` |

## Profiles

### Required profiles in `~/.config/codika/config.json`

| Profile | Key Prefix | Role | Scopes | Firestore Key ID |
|---|---|---|---|---|
| `cli-test-owner-full` | `cko_KBucJBHX` | Owner | All 11 | `R7wKRSuJ5BuQNVUqLtuJ` |
| `cli-test-owner` | `cko_HwMY2LUV` | Owner | All 11 | `2GL1RWDB96O6PRr5iKvE` |
| `cli-test-member` | `cko_murX0spn` | Member | All 11 | `USuKqmVXPkLJuz5hpAtR` |
| `cli-test-limited` | `cko_URWigC5s` | Owner | `deploy:use-case`, `instances:read` | `1QwX6lSm83jf5PTOvqCl` |
| `cli-test-personal` | `ckp_lAqgVGge` | Personal | `organizations:create`, `api-keys:manage` | — |

### How profiles were created

```bash
# 1. Original owner and member keys existed with 10 scopes (pre projects:read)
# 2. Created cli-test-owner-full with all 11 scopes:
codika organization create-key \
  --organization-id "l0gM8nHm2o2lpupMpm5x" \
  --name "cli-test-owner-full" \
  --scopes "deploy:use-case,deploy:data-ingestion,projects:create,projects:read,workflows:trigger,executions:read,instances:read,instances:manage,skills:read,integrations:manage,api-keys:manage" \
  --profile cli-test-owner

# 3. Created limited key:
codika organization create-key \
  --organization-id "l0gM8nHm2o2lpupMpm5x" \
  --name "cli-test-limited" \
  --scopes "deploy:use-case" \
  --profile cli-test-owner-full

# 4. Updated old owner and member keys to add projects:read:
codika organization update-key --key-id "2GL1RWDB96O6PRr5iKvE" \
  --scopes "deploy:use-case,deploy:data-ingestion,projects:create,projects:read,workflows:trigger,executions:read,instances:read,instances:manage,skills:read,integrations:manage,api-keys:manage" \
  --profile cli-test-owner-full
codika organization update-key --key-id "USuKqmVXPkLJuz5hpAtR" \
  --scopes "deploy:use-case,deploy:data-ingestion,projects:create,projects:read,workflows:trigger,executions:read,instances:read,instances:manage,skills:read,integrations:manage,api-keys:manage" \
  --profile cli-test-owner-full

# 5. Updated limited key to also have instances:read (for get-instance tests):
codika organization update-key --key-id "1QwX6lSm83jf5PTOvqCl" \
  --scopes "deploy:use-case,instances:read" \
  --profile cli-test-owner-full
```

## Test Resources

| Resource | ID | Created By |
|---|---|---|
| Owner project | `h8iCqSgTjSsKySyufq36` | Owner |
| Member projects | `TNrsaJGORHAbuaAnDQmw`, `gEsxAA0Keky8ncj9lRzb`, ... | Member |
| Dev instance (with workflows) | `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` | Owner |
| Prod instance | `019d444e-290a-721b-9ce3-f3d454eb6d0e` | Owner |

## What each profile can see

```
Owner (cli-test-owner-full):
  Projects:  14 (all in org)
  Instances: 15 (all in org)

Member (cli-test-member):
  Projects:  6 (own only — filtered by createdBy)
  Instances: 7 (shared instances only — filtered by sharing model)

Limited (cli-test-limited):
  Projects:  BLOCKED (no projects:read scope)
  Instances: 15 (has instances:read, userId = owner so no filtering)

Cross-org:
  Projects:  BLOCKED (no projects:read scope / wrong org)
  Instances: 6 in their own org (can't see test org's instances)
```

## Firestore indexes

The `listProjectsPublic` Cloud Function requires a composite index:
- Collection: `projects`
- Fields: `organizationId ASC`, `archived ASC`, `createdAt DESC`
- Index ID: `CICAgLjywZkK`

If you get "requires an index" errors, create it via the link in the error message or:
```bash
gcloud firestore indexes composite create \
  --project=codika-app \
  --collection-group=projects \
  --field-config field-path=organizationId,order=ascending \
  --field-config field-path=archived,order=ascending \
  --field-config field-path=createdAt,order=descending
```
