# `codika deploy process-data-ingestion <path>`

Deploys a process-level data ingestion configuration to the Codika platform. This is separate from use case deployment -- updating data ingestion does NOT trigger "update available" notifications. Manages local `version.json` (dataIngestionVersion field), deployment archiving, and project.json updates with webhook URLs.

**Scope required**: `deploy:data-ingestion`
**Method**: POST (body: data ingestion configuration + workflow)
**Cloud Function**: `deployDataIngestion`

**Test use case path**: Use a valid use case folder with `getDataIngestionConfig` exported from config.ts, a `data-ingestion/` folder containing exactly one workflow JSON file, and a `project.json` with a valid projectId.

---

## [P] Happy path -- deploy with JSON output

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, response contains `dataIngestionId`, `version`, `localVersion`, `status`, `projectId`, `requestId`. If webhooks are configured, `webhookUrls` contains `embed` and `delete` URLs. Exit code 0.

**Post-check**: Read `version.json` — `dataIngestionVersion` should have been bumped (patch by default, e.g., `1.0.0` -> `1.0.1`). Read `project.json` — `dataIngestionDeployments` map should contain an entry keyed by the API version with `dataIngestionId`, `createdAt`, and optionally `webhookUrls`.

**Why**: Core happy path — verifies config parsing (`getDataIngestionConfig()`), workflow auto-discovery from `data-ingestion/`, API call, version bump (dataIngestionVersion in version.json, separate from process version), project.json update with `dataIngestionDeployments`, and JSON output shape.

---

## [P] Human-readable output

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner-full
```

**Expect**: Output shows `✓ Data Ingestion Deployment Successful` followed by Data Ingestion ID, API Version, Local Version (old -> new), Project ID, Status, and optionally Webhook (embed) / Webhook (delete) URLs and Request ID. Exit code 0.

**Why**: Verifies the formatted output path. The human-readable branch formats the old -> new local version transition (e.g., `1.0.0 → 1.0.1`).

---

## [P] `--patch` (default behavior)

```bash
codika deploy process-data-ingestion /path/to/use-case --patch --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `dataIngestionVersion` in version.json is bumped with a patch increment (e.g., `1.0.0` -> `1.0.1`). The API strategy is `minor_bump` (server-side version).

**Why**: `--patch` is the default. Confirms the version strategy mapping: `--patch` -> API `minor_bump` + local `patch`. Explicitly passing `--patch` should behave identically to omitting all version flags.

---

## [P] `--minor`

```bash
codika deploy process-data-ingestion /path/to/use-case --minor --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `dataIngestionVersion` in version.json is bumped with a minor increment (e.g., `1.0.1` -> `1.1.0`). The API strategy is `minor_bump`.

**Why**: Tests the minor version strategy: `--minor` -> API `minor_bump` + local `minor`.

---

## [P] `--major`

```bash
codika deploy process-data-ingestion /path/to/use-case --major --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `dataIngestionVersion` in version.json is bumped with a major increment (e.g., `1.1.0` -> `2.0.0`). The API strategy is `major_bump`.

**Why**: Tests the major version strategy: `--major` -> API `major_bump` + local `major`.

---

## [P] `--target-version`

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version 3.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, API receives the explicit version `3.0` (the `version` field in response should be `3.0`). The local version still gets a patch bump (e.g., `2.0.0` -> `2.0.1`) because `--target-version` maps to local strategy `patch`.

**Why**: `--target-version` sets an explicit API version via `explicit` strategy. Verifies the `X.Y` format is passed through correctly and local version still increments independently.

---

## [P] `--project-id` overrides resolution chain

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `projectId` in the response matches `h8iCqSgTjSsKySyufq36` regardless of what `project.json` contains.

**Why**: The `--project-id` flag is highest priority in the resolution chain (`--project-id` > `--project-file` > `project.json`). Verifies the flag bypasses the normal project ID resolution.

---

## [P] `--project-file` overrides default project.json

```bash
codika deploy process-data-ingestion /path/to/use-case --project-file project-alt.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, project ID is read from `project-alt.json` instead of `project.json`. The `projectId` in the response matches the value in the custom file.

**Why**: The `--project-file` flag allows deploying the same use case to different projects. Resolution chain: `--project-id` > `--project-file` > `project.json`.

---

## [P] `--profile` selects specific profile

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner --json
```

**Expect**: `success: true`. The deployment uses the API key from the `cli-test-owner` profile (not the active profile).

**Why**: Verifies the `--profile` flag selects a specific named profile for authentication.

---

## [P] Org-aware profile auto-selection

When the use case folder has a `project.json` with `organizationId`, and no `--profile` or `--api-key` flag is passed, the CLI auto-selects the profile whose organization matches.

```bash
codika deploy process-data-ingestion /path/to/use-case-with-org-project-json --json
```

**Expect**: `success: true`. In human-readable mode, prints `Using profile "..." (matches project organization)`.

**Why**: The `resolveApiKeyForOrg` function prevents accidental cross-org deployments by auto-selecting the matching profile. The auto-selection message is suppressed in `--json` mode.

---

## [P] dataIngestionDeployments map deep-merges in project.json

Deploy twice to the same use case (e.g., first with `--target-version 1.0`, then with `--target-version 2.0`).

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version 1.0 --profile cli-test-owner-full --json
codika deploy process-data-ingestion /path/to/use-case --target-version 2.0 --profile cli-test-owner-full --json
```

**Expect**: After both deploys, `project.json` contains `dataIngestionDeployments` with both `"1.0"` and `"2.0"` entries. The first entry is not overwritten by the second.

**Post-check**: `cat project.json | jq '.dataIngestionDeployments | keys'` should return `["1.0", "2.0"]`.

**Why**: The `updateProjectJson` function deep-merges `dataIngestionDeployments` — previous entries must be preserved. This tests the merge logic in `project-json.ts` (line 128-130).

---

## [P] version.json created from scratch when missing

Deploy to a use case folder that has no `version.json` file.

```bash
codika deploy process-data-ingestion /path/to/use-case-no-version --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `localVersion` is `1.0.1` (default `1.0.0` + patch bump). A `version.json` file is created with `{"dataIngestionVersion": "1.0.1"}`.

**Why**: The `readDataIngestionVersion` function defaults to `1.0.0` when `version.json` is missing. Verifies the fallback works and the file is created on first deploy.

---

## [P] version.json preserves existing process version

Deploy data ingestion to a use case that already has `version.json` with `{"version": "2.3.0"}` (process version) but no `dataIngestionVersion`.

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner-full --json
```

**Post-check**: `cat version.json` should show both `"version": "2.3.0"` and `"dataIngestionVersion": "1.0.1"`. The existing `version` field must not be overwritten.

**Why**: The `writeDataIngestionVersion` function reads the existing file, updates only `dataIngestionVersion`, and writes back. Verifies it does not clobber other fields.

---

## [N] Nonexistent path

```bash
codika deploy process-data-ingestion /nonexistent/path --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "Use case path does not exist". Exit code `2`.

**Why**: Client-side path validation (`existsSync`) before any deployment logic. Uses `exitWithError` which defaults to exit code 2.

---

## [N] Missing config.ts

Point to a folder that exists but has no `config.ts`.

```bash
codika deploy process-data-ingestion /path/to/folder-without-config --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Missing config.ts". Exit code 1.

**Why**: The deployer validates that `config.ts` exists before attempting to import it. This is a thrown error caught by the action handler (exit code 1, not 2).

---

## [N] config.ts missing `getDataIngestionConfig` export

Point to a use case where `config.ts` exists but does not export `getDataIngestionConfig`.

```bash
codika deploy process-data-ingestion /path/to/use-case-without-di-export --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "must export getDataIngestionConfig function". Exit code 1.

**Why**: The deployer checks `typeof configModule.getDataIngestionConfig !== 'function'` after importing the module. Verifies the guard catches missing exports.

---

## [N] Missing `data-ingestion/` folder

Point to a use case with `config.ts` exporting `getDataIngestionConfig` but no `data-ingestion/` directory.

```bash
codika deploy process-data-ingestion /path/to/use-case-no-di-folder --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "No data-ingestion/ folder found". Exit code 1.

**Why**: The `discoverDataIngestionWorkflow` function validates the folder exists. The error message includes the expected structure.

---

## [N] No workflow JSON in `data-ingestion/`

Point to a use case with an empty `data-ingestion/` folder (no `.json` files).

```bash
codika deploy process-data-ingestion /path/to/use-case-empty-di --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "No workflow JSON file found in data-ingestion/". Exit code 1.

**Why**: The `discoverDataIngestionWorkflow` function requires exactly one `.json` file. Zero files is rejected.

---

## [N] Multiple workflow JSONs in `data-ingestion/`

Point to a use case where `data-ingestion/` contains two or more `.json` files.

```bash
codika deploy process-data-ingestion /path/to/use-case-multi-di --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Multiple JSON files found in data-ingestion/" and lists the filenames. Exit code 1.

**Why**: The auto-discovery requires exactly one workflow. Multiple files are ambiguous and rejected with a descriptive error.

---

## [N] No project ID found

Point to a use case with `config.ts` and `data-ingestion/` but no `project.json` and no `--project-id` flag.

```bash
codika deploy process-data-ingestion /path/to/use-case-no-project --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "No project ID found". Exit code 1.

**Why**: The `resolveProjectId` function throws when no source provides a project ID. The error message suggests four remediation options.

---

## [N] Invalid `--target-version` format

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version abc --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains `Invalid version format "abc". Expected "X.Y" format`. Exit code 1.

**Why**: `--target-version` requires `X.Y` format where both parts are integers. The `resolveVersionStrategies` function validates this.

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version 1.2.3 --profile cli-test-owner-full --json
```

**Expect**: Same error — `1.2.3` has 3 parts, not 2. The guard checks `parts.length !== 2`.

**Why**: Edge case — semver-style input (X.Y.Z) is also invalid for `--target-version` which expects only X.Y.

---

## [N] Missing API key -- no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path.

```bash
env -u CODIKA_API_KEY codika deploy process-data-ingestion /path/to/use-case 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key is required". Exit code `2` (CLI validation error, not `1`).

**Why**: Verifies the early-exit guard before any HTTP call. The `exitWithError` function writes to stderr and exits with code 2. The `--json` flag is irrelevant here because `exitWithError` always writes to stderr and never produces JSON.

---

## [S] Scope enforcement -- limited key lacks `deploy:data-ingestion`

The limited key has `deploy:use-case` + `instances:read` but NOT `deploy:data-ingestion`.

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `deploy:data-ingestion`. Exit code 1.

**Why**: Data ingestion deployment requires its own scope, separate from `deploy:use-case`. The limited key authenticates fine but is rejected at the scope layer. This proves that `deploy:use-case` does NOT implicitly grant `deploy:data-ingestion`.

---

## [S] Cross-org isolation

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not deploy to the test org's project.

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or organization mismatch. Exit code 1.

**Why**: A valid key from org B cannot deploy data ingestion to org A's project (`h8iCqSgTjSsKySyufq36` belongs to org `l0gM8nHm2o2lpupMpm5x`). Confirms organization-level data isolation holds across deployment operations.

---

## [S] Invalid API key

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before reaching business logic. The `--project-id` flag is passed to avoid failing on project resolution before the API call.

---

## Last tested

Not yet tested.
