# `codika get use-case <projectId> [outputPath]`

Fetches metadata documents from a deployed use case and reconstructs the local folder structure. Supports `--list` to list documents without downloading, `--target-version` to fetch a specific version, `--no-data-ingestion` to exclude data ingestion workflows, and `--di-version` to fetch a specific data ingestion version.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, version?, includeContent, includeDataIngestion, dataIngestionVersion? }`)
**Cloud Function**: `getMetadataDocumentsPublic`

**Test project**: `h8iCqSgTjSsKySyufq36` (owner-created, has at least one deployed version)

**Cleanup**: Tests that download files use `/tmp/uc-*` paths. After running the full suite, clean up with `rm -rf /tmp/uc-*`.

---

## [P] Happy path — Download use case (JSON)

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-test --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`. JSON output includes `data.projectId`, `data.version`, `data.organizationId`, `data.filesDownloaded`, `data.outputPath`, `data.documents`.

**Why**: Confirms the full download flow — auth, metadata fetch with `includeContent: true`, base64 decoding, file writing.

---

## [P] JSON output shape on download

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-shape --profile cli-test-owner-full --json | jq '.data | keys'
```

**Expect**: Keys include `documents`, `filesDownloaded`, `organizationId`, `outputPath`, `projectId`, `version`. May also include `dataIngestionVersion`.

**Why**: Ensures the CLI constructs the correct JSON summary after downloading. The `documents` array in download mode contains `relativePath`, `sizeBytes`, `contentType` (no `contentBase64` — stripped in the output).

---

## [P] Human-readable download output

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-human --profile cli-test-owner-full
```

**Expect**: Progress lines showing each file with a green checkmark (`✓ <relativePath>`), then a summary block with Project, Version, DI Ver (if present), Output, and Files count.

**Why**: Verifies the human-readable formatter for the download flow.

---

## [P] Downloaded files exist on disk

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-disk --profile cli-test-owner-full --json > /dev/null && ls /tmp/uc-download-disk/
```

**Expect**: At least `config.ts` and a `workflows/` directory. Files are non-empty.

```bash
test -s /tmp/uc-download-disk/config.ts && echo "OK" || echo "EMPTY"
```

**Expect**: `OK`

**Why**: Confirms that files are actually written to disk with content (base64 decoding worked). This catches silent failures where the CLI reports success but writes empty or no files.

---

## [P] Default output path uses project ID

```bash
cd /tmp && codika get use-case h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json | jq -r '.data.outputPath'
```

**Expect**: Path ends with `/h8iCqSgTjSsKySyufq36`. When `[outputPath]` is omitted, the CLI resolves to `./<projectId>`.

**Cleanup**: `rm -rf /tmp/h8iCqSgTjSsKySyufq36`

**Why**: Verifies the default output path behavior when the optional `[outputPath]` argument is not provided.

---

## [P] `--list` mode — JSON output

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.documents | length'
```

**Expect**: A positive integer. No files are written to disk.

**Why**: Verifies that `--list` sets `includeContent: false` and returns metadata-only documents. The response is the raw API result wrapped in `success: true`.

---

## [P] `--list` JSON has correct top-level keys

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data | has("projectId", "version", "organizationId", "documents")'
```

**Expect**: `true`

**Why**: In `--list --json` mode, the CLI prints the raw API response. It must contain the standard metadata fields.

---

## [P] `--list` document metadata fields

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.documents[0] | keys'
```

**Expect**: Keys include `contentType`, `relativePath`, `sizeBytes`, `storagePath`, `uploadedAt`. No `contentBase64` key (list mode sets `includeContent: false`).

**Why**: Ensures the `StoredMetadataDocument` shape is correct in list mode and that content is not leaked.

---

## [P] `--list` human-readable output

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full
```

**Expect**: Summary with `✓ Found N document(s)` header, Project, Version, Organization fields, then a list of documents showing `relativePath (size KB, contentType)`.

**Why**: Verifies the list-mode formatter displays document metadata without content.

---

## [P] `--target-version` fetches specific version

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --target-version "1.0" --profile cli-test-owner-full --json | jq '.data.version'
```

**Expect**: `"1.0"`

**Why**: Verifies the `version` parameter is passed to the API and the correct version's documents are returned.

---

## [P] Default fetches latest version

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.version'
```

**Expect**: A version string in `X.Y` format. Should be >= `"1.0"`.

**Why**: Confirms that omitting `--target-version` defaults to the latest deployed version.

---

## [P] `--no-data-ingestion` excludes DI documents

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --no-data-ingestion --profile cli-test-owner-full --json | jq '.data.dataIngestionVersion'
```

**Expect**: `null` — no data ingestion version is included in the response.

**Why**: Verifies that `--no-data-ingestion` sets `includeDataIngestion: false` and the response omits DI documents and version.

---

## [P] Default includes data ingestion

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data | has("documents")'
```

**Expect**: `true`. If the project has data ingestion, `dataIngestionVersion` should also be present in `.data`.

**Why**: Verifies the default behavior includes data ingestion (`--with-data-ingestion` defaults to `true`).

---

## [P] `--di-version` fetches specific DI version

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --di-version "1.0" --profile cli-test-owner-full --json | jq '.data.dataIngestionVersion'
```

**Expect**: `"1.0"` (if a DI version 1.0 exists for the project). Otherwise an API error about version not found.

**Why**: Verifies the `dataIngestionVersion` parameter is passed to the API.

---

## [P] `--no-data-ingestion` download excludes DI files

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-no-di --no-data-ingestion --profile cli-test-owner-full --json > /dev/null && ls /tmp/uc-no-di/
```

**Expect**: No `data-ingestion/` directory exists in the output.

```bash
test -d /tmp/uc-no-di/data-ingestion && echo "EXISTS" || echo "ABSENT"
```

**Expect**: `ABSENT`

**Why**: Verifies that `--no-data-ingestion` actually prevents DI files from being written to disk, not just from the JSON summary.

---

## [N] Invalid `--target-version` format

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --target-version "abc" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `Version must be "X.Y" format`. Exit code `2`.

**Why**: Client-side validation rejects invalid version formats before the API call. Uses `exitWithError` which always exits with code 2 and writes to stderr (not JSON).

---

## [N] Invalid `--di-version` format

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --di-version "v1" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `DI version must be "X.Y" format`. Exit code `2`.

**Why**: Same client-side `exitWithError` validation for the `--di-version` flag.

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `exitWithError(API_KEY_MISSING_MESSAGE)` path.

```bash
env -u CODIKA_API_KEY codika get use-case h8iCqSgTjSsKySyufq36 --list --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key" (the `API_KEY_MISSING_MESSAGE` constant). Exit code `2` (CLI validation error, not `1`). The `--json` flag is irrelevant here because `exitWithError` always writes to stderr and never produces JSON.

**Why**: Verifies the early-exit guard before any HTTP call. Exit code 2 distinguishes CLI validation errors from API errors (exit code 1).

---

## [N] Nonexistent project ID

```bash
codika get use-case nonexistent-project-id-here --list --profile cli-test-owner-full --json
```

**Expect**: Exit code `1`, `success: false`, error about project not found or no metadata.

**Why**: Standard 404 handling for a project that doesn't exist. This goes through the catch block (exit code 1), not `exitWithError` (exit code 2).

---

## [N] Nonexistent version for valid project

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --target-version "99.99" --profile cli-test-owner-full --json
```

**Expect**: Exit code `1`, `success: false`, error about version not found.

**Why**: The project exists but the requested version does not. Ensures the API returns a meaningful error rather than an empty success.

---

## [S] Scope enforcement — limited key has `deploy:use-case`

The limited key has `deploy:use-case`, which is the required scope for this command.

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-limited --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms that `deploy:use-case` is sufficient. The limited key should be able to fetch use case metadata.

---

## [S] Cross-org key cannot fetch test org's use case

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code `1`, `success: false`, error about not found or forbidden. The cross-org key must not access the test org's project.

**Why**: Proves organization isolation — the project belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`.

---

## [N] Invalid API key

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Cleanup

After running all tests, remove downloaded directories:

```bash
rm -rf /tmp/uc-download-test /tmp/uc-download-shape /tmp/uc-download-human /tmp/uc-download-disk /tmp/uc-no-di /tmp/h8iCqSgTjSsKySyufq36
```

---

## Last tested

Not yet tested.
