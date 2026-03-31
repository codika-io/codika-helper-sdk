# `codika deploy use-case <path>`

Deploys a use case folder (config.ts + workflows/) to the Codika platform. Manages local version.json tracking, deployment archiving, and project.json updates. Supports dry-run mode, version strategy flags, and additional file attachments.

**Scope required**: `deploy:use-case`
**Method**: POST (body: use case configuration + base64-encoded workflows)
**Cloud Function**: `deployProcessUseCase`

**Test use case path**: Use a known valid use case folder in the test org's project `h8iCqSgTjSsKySyufq36`. If no real use case folder is available, several tests will validate CLI-side behavior (path validation, flag parsing) without hitting the API.

---

## [P] Happy path — deploy with JSON output

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, response contains `data.version`, `data.templateId`, `data.processInstanceId`, `data.deploymentStatus`. Exit code 0.

**Why**: Core happy path — verifies the full deploy pipeline: config parsing, workflow base64 encoding, API call, version bump, and project.json update.

---

## [P] Human-readable output

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full
```

**Expect**: Output contains `✓` success indicator, shows version, template ID, project ID, and workflow deployment summary.

**Why**: Verifies the formatted output path works end-to-end.

---

## [P] `--project-id` overrides project.json

```bash
codika deploy use-case /path/to/valid-use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the deployment targets project `h8iCqSgTjSsKySyufq36` regardless of what project.json contains.

**Why**: The `--project-id` flag has highest priority in the project ID resolution chain. This is essential for deploying the same use case to multiple projects.

---

## [P] `--minor` version strategy

```bash
codika deploy use-case /path/to/valid-use-case --minor --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the local version.json is bumped with a minor increment (e.g., `1.0.0` -> `1.1.0`). JSON output includes `useCaseVersion` reflecting the new version.

**Why**: Tests that shorthand version flags (`--minor`, `--major`, `--patch`) are correctly translated to the version strategy system.

---

## [P] `--version` explicit API version

```bash
codika deploy use-case /path/to/valid-use-case --version 2.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the API receives `explicitVersion: "2.0"` and creates that specific version.

**Why**: Explicit version control is needed when the API version must match a specific release number rather than auto-incrementing.

---

## [P] `--dry-run` previews without deploying

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --profile cli-test-owner-full --json
```

**Expect**: JSON output contains `useCasePath`, `projectId`, `projectIdSource`, `apiKeySource`, `version` (with `current` and `next`), `configuration` (title, workflowCount, tags, integrations), `workflows` array, `metadataDocuments`, and `validation` (valid, summary). No API call is made, version.json is not modified. Exit code 0 if validation passes, 1 if it fails.

**Why**: Dry-run is critical for CI/CD pipelines and pre-flight checks. Verifies that all resolution logic (project ID, API key, version) works without side effects.

---

## [P] `--dry-run` human-readable output

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --profile cli-test-owner-full
```

**Expect**: Formatted preview showing project ID source, version info, workflow summary, and validation results. No actual deployment.

**Why**: Verifies the `formatDryRunDeployment` output formatter.

---

## [P] `--additional-file` flag

```bash
codika deploy use-case /path/to/valid-use-case --additional-file "/tmp/extra.json:docs/extra.json" --profile cli-test-owner-full --json
```

**Expect**: The additional file is included in the deployment payload with the specified relative path. `success: true` if the file exists and the use case is valid.

**Why**: Additional files allow attaching supplementary resources (documentation, schemas) to a deployment without modifying the core use case structure.

---

## [N] Nonexistent path

```bash
codika deploy use-case /nonexistent/path --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message contains "Use case path does not exist". Exit code 1.

**Why**: CLI validates the path exists before attempting any deployment logic.

---

## [N] Invalid `--additional-file` format

```bash
codika deploy use-case /path/to/valid-use-case --additional-file "no-colon-separator" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error message contains "Invalid --additional-file format". Exit code 1.

**Why**: The `--additional-file` flag requires `absolutePath:relativePath` format with a colon separator. Client-side validation catches malformed entries.

---

## [N] Conflicting version flags

```bash
codika deploy use-case /path/to/valid-use-case --minor --major --profile cli-test-owner-full --json
```

**Expect**: Error about conflicting version strategy flags, or last flag wins. Behavior depends on `resolveVersionStrategies` implementation.

**Why**: Users should not pass multiple mutually exclusive version flags. The CLI should handle this gracefully.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read` but this test verifies the scope IS sufficient.

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-limited --json
```

**Expect**: `success: true` (assuming valid use case), because the limited key has `deploy:use-case` scope.

**Why**: Confirms that `deploy:use-case` is the only scope needed for deployment. The limited key should succeed here unlike read-only commands that require `projects:read`.

---

## [S] Cross-org isolation

A key from a different organization cannot deploy to the test org's project.

```bash
codika deploy use-case /path/to/valid-use-case --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or org mismatch.

**Why**: The Cloud Function validates that the API key's organization owns the target project. Cross-org keys must be rejected.

---

## [S] Invalid API key

```bash
codika deploy use-case /path/to/valid-use-case --api-key "cko_invalid_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic executes.

---

## Last tested

Not yet tested.
