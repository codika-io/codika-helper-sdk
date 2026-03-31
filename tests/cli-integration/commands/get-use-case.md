# `codika get use-case <projectId> [outputPath]`

Fetches metadata documents from a deployed use case and reconstructs the local folder structure. Supports `--list` to list documents without downloading, `--version` to fetch a specific version, and `--no-data-ingestion` to exclude data ingestion workflows.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, version?, includeContent, includeDataIngestion, dataIngestionVersion? }`)
**Cloud Function**: `getMetadataDocumentsPublic`

**Test project**: `h8iCqSgTjSsKySyufq36` (owner-created, has at least one deployed version)

---

## [P] Happy path — Download use case

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-test --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`. Files are written to `/tmp/uc-download-test/`. JSON output includes `data.projectId`, `data.version`, `data.organizationId`, `data.filesDownloaded`, `data.outputPath`, `data.documents`.

**Why**: Confirms the full download flow — auth, metadata fetch with `includeContent: true`, base64 decoding, file writing.

---

## [P] JSON output shape on download

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-test2 --profile cli-test-owner-full --json | jq '.data | keys'
```

**Expect**: Keys include `documents`, `filesDownloaded`, `organizationId`, `outputPath`, `projectId`, `version`. May also include `dataIngestionVersion`.

**Why**: Ensures the CLI constructs the correct JSON summary after downloading.

---

## [P] Human-readable download output

```bash
codika get use-case h8iCqSgTjSsKySyufq36 /tmp/uc-download-test3 --profile cli-test-owner-full
```

**Expect**: Progress lines showing each file with a green checkmark (`✓ <relativePath>`), then a summary block with Project, Version, DI Ver (if present), Output path, and file count.

**Why**: Verifies the human-readable formatter for the download flow.

---

## [P] `--list` mode — List documents without downloading

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.documents | length'
```

**Expect**: A positive integer. No files are written to disk.

**Why**: Verifies that `--list` sets `includeContent: false` and returns metadata-only documents.

---

## [P] `--list` human-readable output

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full
```

**Expect**: Summary with `✓ Found N document(s)` header, Project, Version, Organization fields, then a list of documents showing `relativePath (size KB, contentType)`.

**Why**: Verifies the list-mode formatter displays document metadata without content.

---

## [P] `--list --json` returns full API response

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data | has("projectId", "version", "organizationId", "documents")'
```

**Expect**: `true`

**Why**: In `--list --json` mode, the raw API response is printed. It must contain the standard metadata fields.

---

## [P] Each document has correct metadata fields

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.documents[0] | keys'
```

**Expect**: Keys include `contentType`, `relativePath`, `sizeBytes`, `storagePath`, `uploadedAt`. When not in list mode, also includes `contentBase64`.

**Why**: Ensures the `StoredMetadataDocument` shape is respected.

---

## [P] `--version` flag fetches specific version

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --version "1.0" --profile cli-test-owner-full --json | jq '.data.version'
```

**Expect**: `"1.0"`

**Why**: Verifies the version parameter is passed to the API and the correct version's documents are returned.

---

## [P] Default fetches latest version

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq '.data.version'
```

**Expect**: A version string in `X.Y` format. Should be >= `"1.0"`.

**Why**: Confirms that omitting `--version` defaults to the latest deployed version.

---

## [P] `--no-data-ingestion` excludes DI documents

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --no-data-ingestion --profile cli-test-owner-full --json | jq '.data.dataIngestionVersion'
```

**Expect**: `null` — no data ingestion version is included.

**Why**: Verifies that `--no-data-ingestion` sets `includeDataIngestion: false` and the response omits DI documents.

---

## [P] Default includes data ingestion

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --profile cli-test-owner-full --json | jq 'has("data") and (.data | has("documents"))'
```

**Expect**: `true`. If the project has data ingestion, `dataIngestionVersion` should also be present in `data`.

**Why**: Verifies the default behavior includes data ingestion (`--with-data-ingestion` defaults to true).

---

## [P] `--di-version` flag

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --di-version "1.0" --profile cli-test-owner-full --json | jq '.data.dataIngestionVersion'
```

**Expect**: `"1.0"` (if a DI version 1.0 exists for the project). Otherwise an error about version not found.

**Why**: Verifies the `dataIngestionVersion` parameter is passed to the API.

---

## [N] Invalid version format

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --version "abc" --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error about version format must be "X.Y".

**Why**: Client-side validation rejects invalid version formats before the API call.

---

## [N] Invalid DI version format

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --di-version "v1" --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code non-zero, error about DI version format must be "X.Y".

**Why**: Same client-side validation for the `--di-version` flag.

---

## [N] Nonexistent project ID

```bash
codika get use-case nonexistent-project-id-here --list --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, `success: false`, error about project not found or no metadata.

**Why**: Standard 404 handling for a project that doesn't exist.

---

## [S] Scope enforcement — limited key has `deploy:use-case` scope

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

**Expect**: Exit code 1, `success: false`, error about not found or forbidden. The cross-org key must not access the test org's project.

**Why**: Proves organization isolation — the project belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`.

---

## [N] Invalid API key

```bash
codika get use-case h8iCqSgTjSsKySyufq36 --list --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Last tested

Not yet tested.
