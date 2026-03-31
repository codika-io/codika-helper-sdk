# `codika publish <templateId>`

Publishes a deployed use case to production, making it live for end users. Optionally creates a prod process instance and saves `prodProcessInstanceId` to project.json. Supports visibility control, instance sharing scope, and dev/prod auto-toggle.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, processDeploymentId, visibility?, sharedWith?, autoToggleDevProd?, skipAutoCreateProdInstance? }`)
**Cloud Function**: `publishProcessDeploymentPublic`

**Test prerequisite**: A valid `templateId` from a prior deployment. Check `project.json` deployments for a known template ID, or deploy first with `codika deploy use-case`.

---

## [P] Happy path -- publish with JSON output

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version` present, `data.processDeploymentId` matches the input templateId, `data.processInstanceId` present (prod instance auto-created). Exit code 0.

**Why**: Core happy path -- verifies the publish flow: project ID resolution from project.json, API call, prod instance creation, and project.json update with `prodProcessInstanceId`.

---

## [P] Human-readable output

```bash
codika publish <templateId> --path /path/to/use-case --profile cli-test-owner-full
```

**Expect**: Output shows "Publishing deployment to production..." with Template ID, Project ID (and source), then `✓ Published successfully!` with Version, Template ID, Prod Instance ID.

**Why**: Verifies the formatted output path including the project ID source indicator.

---

## [P] `--project-id` overrides project.json

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, deployment is published to the specified project.

**Why**: Explicit `--project-id` has highest priority in the resolution chain.

---

## [P] `--visibility` flag

```bash
codika publish <templateId> --path /path/to/use-case --visibility organizational --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the process visibility is set to `organizational`.

**Why**: Visibility controls who can see the published process. Valid values are `private`, `organizational`, `public`. First publish only.

---

## [P] `--skip-prod-instance` flag

```bash
codika publish <templateId> --path /path/to/use-case --skip-prod-instance --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` is absent or null (no prod instance created).

**Why**: Some deployments need publishing without creating a prod instance (e.g., shared processes where instances are created separately).

---

## [P] `--auto-toggle-dev-prod` flag

```bash
codika publish <templateId> --path /path/to/use-case --auto-toggle-dev-prod --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The API receives `autoToggleDevProd: true`, causing the dev instance to pause when prod is active.

**Why**: Prevents both dev and prod instances from running simultaneously, saving n8n resources.

---

## [N] Invalid `--visibility` value

```bash
codika publish <templateId> --path /path/to/use-case --visibility invalid_scope --profile cli-test-owner-full
```

**Expect**: Exit code 2, error: `Invalid visibility: "invalid_scope". Must be one of: private, organizational, public`.

**Why**: Client-side validation against allowed visibility values before making the API call.

---

## [N] Invalid `--shared-with` value

```bash
codika publish <templateId> --path /path/to/use-case --shared-with invalid_scope --profile cli-test-owner-full
```

**Expect**: Exit code 2, error: `Invalid shared-with: "invalid_scope". Must be one of: owner_only, admins, everyone`.

**Why**: Client-side validation against allowed sharing scope values.

---

## [N] Nonexistent template ID

```bash
codika publish nonexistent_template_id --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about template not found or invalid deployment ID.

**Why**: Standard 404 handling -- the Cloud Function validates the template ID exists in Firestore.

---

## [N] No project ID available

```bash
codika publish <templateId> --profile cli-test-owner-full --json
```

**Expect**: Error about project ID resolution failure if no project.json exists in cwd.

**Why**: The `resolveProjectId` function requires at least one source (flag, project.json, or config.ts). When run outside a use case folder without `--project-id`, it fails.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true` (or API-level error unrelated to scope), because `deploy:use-case` covers publishing.

**Why**: Publishing shares the `deploy:use-case` scope with deployment.

---

## [S] Cross-org isolation

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or org mismatch.

**Why**: A key from a different organization cannot publish to the test org's project.

---

## [S] Invalid API key

```bash
codika publish <templateId> --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_invalid_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
