# `codika deploy documents <path>`

Uploads use case documentation (stage markdown files) to the Codika platform. Auto-discovers documents from the use case's `documents/` subfolder, expecting files named `1_*.md` through `4_*.md`. Extracts titles from filenames and summaries from content.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ projectId, documents: [{ stage, title, content, summary }] }`)
**Cloud Function**: `deployUseCaseDocuments`

**Test use case path**: Use a valid use case folder with a `documents/` subfolder containing at least one stage file (e.g., `1_business_requirements.md`). The folder must also have a resolvable project ID (via `project.json`, `config.ts`, or the `--project-id` flag).

---

## [P] Happy path -- deploy documents with JSON output

```bash
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `projectId` present, `documentsCreated` array with entries each containing `stage` (number), `version` (string), `documentId` (string), `status: "accepted"`. `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies document discovery, content reading, title extraction, summary extraction, API call, and JSON response shaping.

---

## [P] Human-readable output

```bash
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full
```

**Expect**: Output shows `Reading document files...` followed by one line per stage (`Stage N: filename -> "Title" (X chars, ~Y words)`), then `Uploading N document(s)...`, then the green `Documents Deployed Successfully` banner with `Stage N: vX.Y.Z (docId)` per document and a `Request ID:` line. Exit code 0.

**Why**: Verifies the formatted output path with progress indicators and per-document detail lines.

---

## [P] `--project-id` overrides resolution chain

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `projectId` = `h8iCqSgTjSsKySyufq36` regardless of any `project.json` or `config.ts` content in the use case folder.

**Why**: The `--project-id` flag has highest priority in the resolution chain, bypassing `project.json` and `config.ts` extraction.

---

## [P] `--project-file` overrides default project.json

Use a use case folder with a custom project file (e.g., `project-client-a.json` containing `{"projectId": "h8iCqSgTjSsKySyufq36"}`).

```bash
codika deploy documents /path/to/use-case --project-file project-client-a.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, documents deployed to the project ID from `project-client-a.json`, not from the default `project.json`.

**Why**: The `--project-file` flag lets users target different projects from the same use case folder. Verifies the custom project file path is passed through to `readProjectJson`.

---

## [P] Project ID resolved from config.ts fallback

Use a use case folder with no `project.json` but a `config.ts` that exports `PROJECT_ID`.

```bash
codika deploy documents /path/to/use-case-with-config-ts --profile cli-test-owner-full --json
```

**Expect**: `success: true`, project ID extracted from `config.ts` via the `PROJECT_ID` regex match.

**Why**: Verifies the third-level fallback in the project ID resolution chain (`--project-id` > `project.json` > `config.ts`).

---

## [P] Org-aware profile auto-selection

If `project.json` in the use case folder contains an `organizationId`, the CLI should auto-select the matching profile.

```bash
codika deploy documents /path/to/use-case-with-org-project-json --json
```

**Expect**: `success: true`, uses the profile that matches the organization in `project.json`.

```bash
codika deploy documents /path/to/use-case-with-org-project-json
```

**Expect** (human-readable): Prints `Using profile "..." (matches project organization)` before the reading output. Exit code 0.

**Why**: The `resolveApiKeyForOrg` function auto-selects the correct org key when multiple profiles exist. The auto-selection message is suppressed in `--json` mode.

---

## [P] Subset of stages (not all 4 required)

Use a `documents/` folder containing only `1_business_requirements.md` and `3_detailed_design.md` (skipping stages 2 and 4).

```bash
codika deploy documents /path/to/partial-stages --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `documentsCreated` has exactly 2 entries (stages 1 and 3). Exit code 0.

**Why**: Not all stages are required. The `discoverStageFiles` function iterates stages 1-4 and only includes those with matching files.

---

## [P] Title extraction from filename

Use a document named `2_solution_architecture.md`.

```bash
codika deploy documents /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: The document for stage 2 has title `"Solution Architecture"` (underscores become spaces, each word capitalized, stage prefix stripped).

**Why**: Verifies `titleFromFilename` — strips the `N_` prefix, splits on underscores, and title-cases each word.

---

## [P] Summary extraction from content

Use a document where the first non-heading, non-empty, non-separator line is a paragraph.

**Expect**: Summary is that paragraph, truncated to 200 characters with `...` suffix if longer. If no such line exists, summary defaults to `"Use case documentation"`.

**Why**: Verifies `extractSummary` — skips lines starting with `#` or `---`, takes the first real paragraph, caps at 200 chars.

---

## [P] Re-deploy increments version

Deploy the same documents twice.

```bash
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full --json
# Run again:
codika deploy documents /path/to/use-case-with-docs --profile cli-test-owner-full --json
```

**Expect**: Second deploy succeeds. The `version` field in `documentsCreated` is incremented (e.g., `1.0.0` on first deploy, `1.1.0` on second).

**Why**: Verifies platform-side document versioning works correctly through the CLI.

---

## [P] `--api-key` flag overrides profile

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_KBucJBHX..." --json
```

**Expect**: `success: true`. The explicit `--api-key` is used instead of any profile or environment variable.

**Why**: Verifies the highest-priority auth resolution path. Important for CI/CD usage.

---

## [P] `--api-url` flag overrides default endpoint

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-url http://localhost:5001/codika-app/europe-west1/deployUseCaseDocuments --profile cli-test-owner-full --json
```

**Expect**: The request is sent to the custom URL. If the local emulator is not running, the error comes from the connection failure (not from the default production URL).

**Why**: Verifies the `--api-url` flag is passed through to `resolveEndpointUrl` and used for the HTTP call.

---

## [N] Nonexistent path

```bash
codika deploy documents /nonexistent/path --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"Use case path does not exist"`. Exit code `2` (CLI validation via `exitWithError`). No JSON output on stdout because `exitWithError` writes to stderr and exits before the JSON catch block.

**Why**: Client-side path validation before any API call. Exit code 2 distinguishes CLI validation errors from API errors.

---

## [N] Missing `documents/` subfolder

Use a valid path that exists but has no `documents/` subfolder.

```bash
codika deploy documents /path/to/use-case-without-docs --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"No documents/ folder found"`. Exit code `2`.

**Why**: The command requires a `documents/` subfolder. Validated with `exitWithError` before attempting file reads.

---

## [N] No stage files in documents folder

`documents/` exists but contains no files matching `{1,2,3,4}_*.md` (e.g., only a `README.md` or `notes.txt`).

```bash
codika deploy documents /path/to/use-case-with-empty-docs-dir --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"No stage files found in documents/ folder"`. Exit code `2`.

**Why**: The `discoverStageFiles` function only matches files starting with `1_` through `4_`. Other files are silently ignored. If zero matches, `exitWithError` fires.

---

## [N] Empty stage file

A discovered stage file (e.g., `1_requirements.md`) exists but is empty or whitespace-only.

```bash
codika deploy documents /path/to/use-case-with-empty-doc --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"is empty — refusing to upload"` (with the em dash). Exit code `2`.

**Why**: Empty documents are rejected to prevent uploading blank content. The check is `!content.trim()`.

---

## [N] No project ID available

No `--project-id`, no `project.json`, and no `PROJECT_ID` in `config.ts`.

```bash
codika deploy documents /path/to/orphan-use-case --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"Could not determine project ID"` and the three resolution options. Exit code `2`.

**Why**: The project ID resolution chain must have at least one source. Failing all three produces a helpful error message listing all options.

---

## [N] Missing API key -- no profile, no env, no flag

```bash
codika deploy documents /path/to/use-case-with-docs --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] API returns error (server-side rejection)

Use a valid path and auth but deploy to a nonexistent project ID.

```bash
codika deploy documents /path/to/use-case-with-docs --project-id "nonexistent_project_id_12345" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, `error` object with `code` and `message` fields. Exit code `1` (API error, not CLI validation).

**Why**: Verifies the error path through the `deployDocuments` HTTP client when the server rejects the request. The catch block in the action handler produces JSON output and exits with code 1.

---

## [N] API error in human-readable mode

```bash
codika deploy documents /path/to/use-case-with-docs --project-id "nonexistent_project_id_12345" --profile cli-test-owner-full
```

**Expect**: Red `Document Deployment Failed` banner, followed by `Error:`, `Error Code:`, and optionally `Details:` and `Request ID:` lines. Exit code `1`.

**Why**: Verifies the human-readable error output path (the `else` branch after `isDeployDocumentsSuccess` check).

---

## [S] Scope enforcement -- limited key succeeds

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true`, because `deploy:use-case` scope covers document deployment.

**Why**: Document deployment shares the `deploy:use-case` scope with use case deployment -- it does not require a separate scope.

---

## [S] Scope enforcement -- key without deploy:use-case

If a key exists that has other scopes (e.g., `projects:read` only) but not `deploy:use-case`:

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "<key-with-only-projects-read>" --json
```

**Expect**: `success: false`, error message contains `deploy:use-case`. Exit code `1`.

**Why**: Proves the scope check on the Cloud Function side. The key authenticates fine but is rejected for lacking the required scope. (Note: this test requires a key with scopes that exclude `deploy:use-case`; if no such test key exists, document it as a gap.)

---

## [S] Cross-org isolation

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or organization mismatch. Exit code `1`.

**Why**: The cross-org key (org `HF5DaJQamZxIeMj0zfWY`) cannot deploy documents to a project in the test org (`l0gM8nHm2o2lpupMpm5x`). Confirms data isolation holds.

---

## [S] Invalid API key

```bash
codika deploy documents /path/to/use-case-with-docs --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code `1`.

**Why**: Auth middleware rejects invalid keys before business logic. The error flows through the `deployDocuments` HTTP client error path.

---

## Exit code summary

| Code | Meaning | Triggered by |
|------|---------|-------------|
| `0` | Documents deployed successfully | `result.success === true` |
| `1` | API error or runtime failure | Server rejection, invalid key, cross-org, catch block |
| `2` | CLI validation error | `exitWithError`: bad path, missing docs folder, no stage files, empty file, no project ID, no API key |

---

## Last tested

Not yet tested.
