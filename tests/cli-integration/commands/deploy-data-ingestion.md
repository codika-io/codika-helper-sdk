# `codika deploy process-data-ingestion <path>`

Deploys a process-level data ingestion configuration to the Codika platform. This is separate from use case deployment -- updating data ingestion does NOT trigger "update available" notifications. Manages local `version.json` (dataIngestionVersion field), deployment archiving, and project.json updates with webhook URLs.

**Scope required**: `deploy:data-ingestion`
**Method**: POST (body: data ingestion configuration + workflow)
**Cloud Function**: `deployDataIngestion`

**Test use case path**: Use a valid use case folder with `getDataIngestionConfig` exported from config.ts and a data-ingestion workflow.

---

## [P] Happy path -- deploy with JSON output

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, response contains `dataIngestionId`, `version`, `localVersion`, `status`, `projectId`. If webhooks are configured, `webhookUrls` contains `embed` and `delete` URLs. Exit code 0.

**Why**: Core happy path -- verifies config parsing, data ingestion deployer, API call, version bump (dataIngestionVersion in version.json), and project.json update.

---

## [P] Human-readable output

```bash
codika deploy process-data-ingestion /path/to/use-case --profile cli-test-owner-full
```

**Expect**: Output shows `✓ Data Ingestion Deployment Successful` with Data Ingestion ID, API Version, Local Version (old -> new), Project ID, Status, and optionally Webhook URLs.

**Why**: Verifies the formatted output path.

---

## [P] `--major`

```bash
codika deploy process-data-ingestion /path/to/use-case --major --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the local `dataIngestionVersion` in version.json is bumped with a major increment (e.g., `1.0.0` -> `2.0.0`).

**Why**: Tests version bump flags: `--patch` (default), `--minor`, `--major`, `--target-version`.

---

## [P] `--target-version`

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version 3.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, API receives the explicit version `3.0`.

**Why**: `--target-version` sets an explicit API version. Tests that the flag works correctly.

---

## [P] `--project-id` overrides resolution chain

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, deployment targets the specified project regardless of project.json.

**Why**: The `--project-id` flag bypasses the normal project ID resolution chain.

---

## [P] Org-aware profile auto-selection

```bash
codika deploy process-data-ingestion /path/to/use-case-with-org-project-json --json
```

**Expect**: Uses the profile matching the organizationId in project.json. In human-readable mode, prints `Using profile "..." (matches project organization)`.

**Why**: The `resolveApiKeyForOrg` function prevents accidental cross-org deployments by auto-selecting the matching profile.

---

## [N] Nonexistent path

```bash
codika deploy process-data-ingestion /nonexistent/path --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Use case path does not exist". Exit code 1.

**Why**: Client-side path validation before any deployment logic.

---

## [N] Invalid `--target-version` format

```bash
codika deploy process-data-ingestion /path/to/use-case --target-version abc --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Invalid version format". Exit code 1.

**Why**: `--target-version` requires a valid `X.Y` format. Bad values are rejected client-side.

---

## [S] Scope enforcement -- limited key lacks `deploy:data-ingestion`

The limited key has `deploy:use-case` + `instances:read` but NOT `deploy:data-ingestion`.

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `deploy:data-ingestion`.

**Why**: Data ingestion deployment requires its own scope, separate from `deploy:use-case`. The limited key is rejected at the scope layer.

---

## [S] Cross-org isolation

```bash
codika deploy process-data-ingestion /path/to/use-case --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or organization mismatch.

**Why**: Cross-org keys cannot deploy data ingestion to another organization's project.

---

## [S] Invalid API key

```bash
codika deploy process-data-ingestion /path/to/use-case --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before reaching business logic.

---

## Last tested

Not yet tested.
