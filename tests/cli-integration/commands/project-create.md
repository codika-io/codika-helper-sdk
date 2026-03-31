# `codika project create --name <name>`

Creates a new project on the Codika platform via API key. Optionally writes a `project.json` file to a specified directory containing `projectId` and `organizationId`. The organization ID is derived from the API key's org or from the `--organization-id` flag.

**Scope required**: `projects:create`
**Method**: POST (body: `{ name, description?, templateId?, organizationId? }`)
**Cloud Function**: `createProjectViaApiKey`

---

## [P] Happy path -- create project with JSON output

```bash
codika project create --name "CLI Test Project $(date +%s)" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.projectId` is a non-empty string, `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies project creation via org API key.

**Cleanup**: Delete the created project via Firestore console or API to avoid accumulating test projects.

---

## [P] Human-readable output

```bash
codika project create --name "CLI Test Human $(date +%s)" --profile cli-test-owner-full
```

**Expect**: Output shows `Creating project "..."...`, then `✓ Project Created Successfully` with Project ID and Request ID.

**Why**: Verifies the formatted output path.

**Cleanup**: Delete the created project.

---

## [P] `--path` writes project.json

```bash
mkdir -p /tmp/cli-test-project-create && codika project create --name "CLI Test Path $(date +%s)" --path /tmp/cli-test-project-create --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `projectJsonPath` in the JSON output points to `/tmp/cli-test-project-create/project.json`. The file contains `{"projectId": "...", "organizationId": "l0gM8nHm2o2lpupMpm5x"}`.

**Why**: The `--path` flag auto-generates project.json for immediate use by deploy commands. The `organizationId` is included from the active profile's org.

**Cleanup**: `rm -rf /tmp/cli-test-project-create` and delete the created project.

---

## [P] `--path` with `--project-file` writes custom filename

```bash
mkdir -p /tmp/cli-test-project-file && codika project create --name "CLI Test Custom File $(date +%s)" --path /tmp/cli-test-project-file --project-file project-staging.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `projectJsonPath` points to `/tmp/cli-test-project-file/project-staging.json`.

**Why**: Custom project file names enable deploying the same use case to different projects (e.g., `project-client-a.json`, `project-staging.json`).

**Cleanup**: `rm -rf /tmp/cli-test-project-file` and delete the created project.

---

## [P] `--organization-id` flag

```bash
codika project create --name "CLI Test Org $(date +%s)" --organization-id l0gM8nHm2o2lpupMpm5x --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the project is created in the specified organization.

**Why**: The `--organization-id` flag is required for admin/personal keys that span multiple organizations. For org-scoped keys, it's optional (derived from the key).

**Cleanup**: Delete the created project.

---

## [P] `--description` flag

```bash
codika project create --name "CLI Test Desc $(date +%s)" --description "Test project created by CLI integration tests" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, project is created with the provided description.

**Why**: Optional fields should be passed through to the API correctly.

**Cleanup**: Delete the created project.

---

## [N] Missing `--name` (required option)

```bash
codika project create --profile cli-test-owner-full --json
```

**Expect**: Commander error -- required option `--name` missing. Process exits before making an API call.

**Why**: `--name` is a `requiredOption` in Commander. Client-side validation catches this.

---

## [N] Empty name

```bash
codika project create --name "" --profile cli-test-owner-full --json
```

**Expect**: Either Commander error for empty required option, or API-level error about invalid name.

**Why**: Edge case for empty string as project name.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read` but NOT `projects:create`.

```bash
codika project create --name "CLI Test Scope $(date +%s)" --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `projects:create`.

**Why**: The scope check in the Cloud Function requires `projects:create`. The limited key is rejected at the scope layer.

---

## [S] Member can create projects

```bash
codika project create --name "CLI Test Member $(date +%s)" --profile cli-test-member --json
```

**Expect**: `success: true`. Members with `projects:create` scope can create projects (they become the project owner via `createdBy`).

**Why**: Project creation is scope-based, not role-based. Any key with `projects:create` can create projects, regardless of the user's org role.

**Cleanup**: Delete the created project.

---

## [S] Cross-org key cannot create in test org

```bash
codika project create --name "CLI Test CrossOrg $(date +%s)" --organization-id l0gM8nHm2o2lpupMpm5x --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about org mismatch or unauthorized.

**Why**: Cross-org keys are scoped to their own organization. They cannot create projects in a different org even when specifying `--organization-id`.

---

## [S] Invalid API key

```bash
codika project create --name "CLI Test Invalid" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
