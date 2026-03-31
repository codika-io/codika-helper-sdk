# `codika deploy documents <path>`

Uploads use case documentation (stage markdown files) to the Codika platform. Auto-discovers documents from the use case's `documents/` subfolder, expecting files named `1_*.md` through `4_*.md`. Extracts titles from filenames and summaries from content.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, documents: [{ stage, title, content, summary }] }`)
**Cloud Function**: `deployUseCaseDocuments`

**Test use case path**: Use a valid use case folder with a `documents/` subfolder containing at least one stage file (e.g., `1_business_requirements.md`).

---

## [P] Happy path -- deploy documents with JSON output

```bash
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `documentsCreated` array with entries containing `stage`, `version`, `documentId`. Exit code 0.

**Why**: Core happy path -- verifies document discovery, content reading, title extraction, summary extraction, and API call.

---

## [P] Human-readable output

```bash
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full
```

**Expect**: Output shows "Reading document files..." with each stage listed (stage number, filename, title, char count, word count), then "Uploading N document(s)...", then `✓ Documents Deployed Successfully` with stage/version/documentId per doc.

**Why**: Verifies the formatted output path with progress indicators.

---

## [P] `--project-id` overrides resolution chain

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, documents are deployed to project `h8iCqSgTjSsKySyufq36` regardless of project.json or config.ts content.

**Why**: The `--project-id` flag has highest priority, bypassing project.json and config.ts PROJECT_ID extraction.

---

## [P] Org-aware profile auto-selection

If `project.json` in the use case folder contains an `organizationId`, the CLI should auto-select the matching profile.

```bash
codika deploy documents /path/to/use-case-with-org-project-json --json
```

**Expect**: `success: true`, uses the profile that matches the organization in project.json. In human-readable mode, prints `Using profile "..." (matches project organization)`.

**Why**: The `resolveApiKeyForOrg` function ensures the correct org key is used when multiple profiles exist, preventing accidental cross-org deployments.

---

## [N] Nonexistent path

```bash
codika deploy documents /nonexistent/path --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Use case path does not exist". Exit code 1.

**Why**: Client-side path validation before any API call.

---

## [N] Missing `documents/` subfolder

```bash
codika deploy documents /path/to/use-case-without-docs --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "No documents/ folder found". Exit code 1.

**Why**: The command requires a `documents/` subfolder. This is validated before attempting to read any files.

---

## [N] Empty stage file

If a discovered stage file (e.g., `1_requirements.md`) is empty:

```bash
codika deploy documents /path/to/use-case-with-empty-doc --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "is empty -- refusing to upload". Exit code 1.

**Why**: Empty documents are rejected to prevent uploading blank content that provides no value.

---

## [N] No stage files in documents folder

If `documents/` exists but contains no `1_*.md` through `4_*.md` files:

```bash
codika deploy documents /path/to/use-case-with-empty-docs-dir --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "No stage files found in documents/ folder". Exit code 1.

**Why**: The command discovers files by stage prefix (1-4). Files not matching this pattern are ignored.

---

## [N] No project ID available

If no `--project-id`, no `project.json`, and no `PROJECT_ID` in config.ts:

```bash
codika deploy documents /path/to/orphan-use-case --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "Could not determine project ID". Exit code 1.

**Why**: The project ID resolution chain must have at least one source. Failing all three sources produces a helpful error with the three options.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true`, because `deploy:use-case` scope covers document deployment.

**Why**: Document deployment shares the `deploy:use-case` scope with use case deployment, not a separate scope.

---

## [S] Cross-org isolation

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or organization mismatch.

**Why**: Cross-org keys cannot deploy documents to another organization's project.

---

## [S] Invalid API key

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
