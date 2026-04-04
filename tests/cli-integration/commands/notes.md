# `codika notes upsert|list|get`

Manage project notes -- a versioned project knowledge base. Upsert creates or updates documents, list shows all current documents, get retrieves content and history.

**Scope required**: `deploy:use-case`
**Methods**: POST (body varies per endpoint)
**Cloud Functions**: `upsertProjectNote`, `getProjectNotes`

**Test project**: `h8iCqSgTjSsKySyufq36` (owner project)

---

## Upsert

### [P] Create first document (JSON output)

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "This is a test project brief for CLI integration testing." --summary "Initial version" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.0"`, `data.isNew: true`, `data.documentTypeId: "test-brief"`. Exit code 0.

**Why**: Core happy path -- first upsert creates v0.0.0.

---

### [P] Update existing document (PATCH version increment)

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "Updated content for the test brief." --summary "Updated content" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.1"`, `data.isNew: false`. Exit code 0.

**Why**: Second upsert of same type increments PATCH version.

---

### [P] `--major-change` bumps MINOR version

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "Major rewrite of the brief." --summary "Major rewrite" --major-change --profile cli-test-owner-full --json
```

**Expect**: `success: true`, version is `0.1.0` (minor bumped, patch reset). Exit code 0.

**Why**: `--major-change` flag triggers MINOR increment instead of PATCH.

---

### [P] `--file` reads content from disk

```bash
echo "# Known Issues\n\n- Timeout on large files" > /tmp/test-known-issues.md
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-known-issues --file /tmp/test-known-issues.md --summary "Initial known issues" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.0"`, `data.isNew: true`. Exit code 0.

**Why**: Verifies `--file` flag reads content from disk instead of `--content`.

---

### [P] `--file -` reads content from stdin

```bash
echo "Content piped from stdin" | codika notes upsert h8iCqSgTjSsKySyufq36 --type test-stdin --summary "Stdin test" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.0"`, `data.isNew: true`. Exit code 0.

**Why**: When neither `--content` nor `--file` is provided and stdin is piped, content is read from stdin. This is the third content source path in the code (`!process.stdin.isTTY` branch).

---

### [P] `--agent-id` sets provenance metadata

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-changelog --title "Changelog" --content "v1: Initial deployment" --summary "First entry" --agent-id "use-case-builder" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.isNew: true`. Exit code 0.

**Why**: Agent ID is stored as provenance metadata. Verifies `--agent-id` flag is passed through to the API.

---

### [P] `--title` defaults to type ID when omitted

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-no-title --content "Content without explicit title" --summary "No title test" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.isNew: true`. Exit code 0.

**Why**: When `--title` is omitted, the code defaults to the type ID (`options.title || options.type`). A subsequent get should show `title: "test-no-title"`.

---

### [P] Human-readable output

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-hr --title "Human Readable Test" --content "Test content" --summary "Test" --profile cli-test-owner-full
```

**Expect**: Output contains "Created test-hr", version, document ID, project ID. No JSON wrapper. Exit code 0.

**Why**: Verifies human-readable formatting path (the `isUpsertSuccess` branch without `--json`).

---

### [P] `--api-key` flag overrides profile

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-apikey --content "API key test" --summary "Key test" --api-key "$(codika config show --profile cli-test-owner-full --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Verifies `--api-key` flag works as an alternative to `--profile` for authentication.

---

### [N] Missing `--summary` (Commander required option)

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-fail --content "test" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "required option '--summary". Exit code 1 (Commander).

**Why**: `--summary` is defined with `requiredOption()` -- Commander rejects before reaching business logic.

---

### [N] Missing `--type` (Commander required option)

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --content "test" --summary "test" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "required option '--type". Exit code 1 (Commander).

**Why**: `--type` is defined with `requiredOption()` -- Commander rejects before reaching business logic.

---

### [N] No content, no file, no stdin (TTY)

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-fail --summary "test" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "content" or "file" or "stdin". Exit code 1 (from `exitWithError`).

**Why**: The `runUpsert` function checks `if (!content)` after resolving all three sources and calls `exitWithError('Either --content, --file, or piped stdin is required')`.

---

### [N] `--file` with nonexistent path

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-fail --file /tmp/does-not-exist-xyz.md --summary "test" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: `success: false` in JSON output (or stderr error), error about file not found. Exit code 1.

**Why**: `readFileSync` throws when the file does not exist. The outer catch block handles this and exits with code 1.

---

### [N] Nonexistent project ID

```bash
codika notes upsert nonexistent-project-id --type test-brief --content "test" --summary "test" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about project not found. Exit code 1.

**Why**: Server validates project existence and returns an error.

---

### [N] Invalid type format

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type "Invalid Type!" --content "test" --summary "test" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about documentTypeId format. Exit code 1.

**Why**: Type IDs must be lowercase alphanumeric with hyphens. Server-side validation rejects invalid formats.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika notes upsert h8iCqSgTjSsKySyufq36 --type test-fail --content "test" --summary "test" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key". Exit code 1 (from `exitWithError(API_KEY_MISSING_MESSAGE)`).

**Why**: The `runUpsert` function checks `if (!apiKey)` and calls `exitWithError` before making any HTTP call. Note: unlike some other commands, upsert uses exit code 1 (not 2) for this guard.

---

## List

### [P] All documents (JSON output)

```bash
codika notes list h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` array contains entries for each document type created above (test-brief, test-known-issues, test-changelog, test-hr, etc.). Each has `status: "current"`. Exit code 0.

**Why**: List returns all current documents for the project.

---

### [P] `--type` filter

```bash
codika notes list h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` has exactly 1 entry with `documentTypeId: "test-brief"`, `status: "current"`. Exit code 0.

**Why**: `--type` filter returns only the current version of that specific document type.

---

### [P] Human-readable output

```bash
codika notes list h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full
```

**Expect**: Formatted output with each document type, version, title in quotes, summary, word count in parentheses. Footer shows total count (e.g. "N document(s)"). No JSON wrapper. Exit code 0.

**Why**: Verifies human-readable list formatting path.

---

### [P] Empty results (type with no documents)

```bash
codika notes list h8iCqSgTjSsKySyufq36 --type nonexistent-type-xyz --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` is empty array. Exit code 0.

**Why**: Filtering by a type that does not exist returns an empty result, not an error. Exercises the `documents.length === 0` branch.

---

### [P] `--api-key` flag overrides profile

```bash
codika notes list h8iCqSgTjSsKySyufq36 --api-key "$(codika config show --profile cli-test-owner-full --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Verifies `--api-key` flag works for authentication on the list subcommand.

---

### [N] Missing project ID argument

```bash
codika notes list --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "missing required argument 'projectId'". Exit code 1 (Commander).

**Why**: `<projectId>` is a required positional argument defined with `.argument()`.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika notes list h8iCqSgTjSsKySyufq36 --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key". Exit code 1.

**Why**: The `runList` function checks `if (!apiKey)` and exits before making any HTTP call.

---

## Get

### [P] Current version (JSON output)

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents[0].status: "current"`, content is the latest upserted content ("Major rewrite of the brief."), version is `0.1.0`. Exit code 0.

**Why**: Get without `--target-version` or `--history` returns the current (latest) version.

---

### [P] `--target-version` retrieves specific version

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --target-version 0.0.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents[0].version: "0.0.0"`, content is the original ("This is a test project brief..."). Exit code 0.

**Why**: Specific version retrieval returns the immutable historical version, not the current one.

---

### [P] `--history` shows all versions

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --history --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` has 3 entries (v0.0.0, v0.0.1, v0.1.0) ordered by versionFilterKey desc. First has `status: "current"`, rest have `status: "superseded"`. Exit code 0.

**Why**: History returns all versions of a document type, newest first. Validates the full versioning chain.

---

### [P] Human-readable output (single document)

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full
```

**Expect**: Shows document type, version, title in quotes, summary, word count, status, then a `---` separator followed by the full markdown content. No JSON wrapper. Exit code 0.

**Why**: Verifies human-readable get formatting for the single-document path.

---

### [P] `--history` human-readable output

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --history --profile cli-test-owner-full
```

**Expect**: Shows "Version history for" header, list with `*` marker on the current version, version numbers, statuses, summaries in quotes, and total count footer. No JSON wrapper. Exit code 0.

**Why**: Verifies human-readable history formatting (the `options.history` branch without `--json`).

---

### [P] `--api-key` flag overrides profile

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --api-key "$(codika config show --profile cli-test-owner-full --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Verifies `--api-key` flag works for authentication on the get subcommand.

---

### [P] Nonexistent type returns empty (not error)

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type nonexistent-type --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` is empty array. Exit code 0.

**Why**: Querying a type that does not exist returns empty results, not an error. Exercises the `documents.length === 0` path.

---

### [N] Missing `--type` (Commander required option)

```bash
codika notes get h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "required option '--type". Exit code 1 (Commander).

**Why**: `--type` is defined with `requiredOption()` on the get command -- Commander rejects before reaching business logic.

---

### [N] Missing project ID argument

```bash
codika notes get --type test-brief --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "missing required argument 'projectId'". Exit code 1 (Commander).

**Why**: `<projectId>` is a required positional argument.

---

### [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key". Exit code 1.

**Why**: The `runGet` function checks `if (!apiKey)` and exits before making any HTTP call.

---

## Security

### [S] Scope enforcement -- limited key (has `deploy:use-case`)

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope for notes.

```bash
codika notes list h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Project note operations require the `deploy:use-case` scope. The limited key has it.

---

### [S] Scope enforcement -- limited key can upsert

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-limited --content "Limited key test" --summary "Scope test" --profile cli-test-limited --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Upsert also requires `deploy:use-case`. Confirms write operations work with the limited key, not just reads.

---

### [S] Scope enforcement -- limited key can get

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-limited --profile cli-test-limited --json
```

**Expect**: `success: true`, `data.documents` has 1 entry. Exit code 0.

**Why**: Get also requires `deploy:use-case`. Confirms all three subcommands work with the limited key.

---

### [S] Cross-org isolation -- list

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not access test org's project.

```bash
codika notes list h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about unauthorized or project not found. Exit code 1.

**Why**: Cross-org keys cannot access another organization's project documents. Confirms tenant isolation.

---

### [S] Cross-org isolation -- upsert

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-xorg --content "Cross-org write" --summary "Should fail" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about unauthorized or project not found. Exit code 1.

**Why**: Cross-org keys must not be able to write to another organization's project notes.

---

### [S] Cross-org isolation -- get

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about unauthorized or project not found. Exit code 1.

**Why**: Cross-org keys must not be able to read another organization's project notes.

---

### [S] Invalid API key -- upsert

```bash
codika notes upsert h8iCqSgTjSsKySyufq36 --type test-brief --content "test" --summary "test" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before reaching business logic.

---

### [S] Invalid API key -- list

```bash
codika notes list h8iCqSgTjSsKySyufq36 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys on the list endpoint too.

---

### [S] Invalid API key -- get

```bash
codika notes get h8iCqSgTjSsKySyufq36 --type test-brief --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys on the get endpoint too.

---

### [S] Member access -- list

```bash
codika notes list h8iCqSgTjSsKySyufq36 --profile cli-test-member --json
```

**Expect**: `success: false` or `success: true` depending on whether members can access owner projects' notes. If the member is not a project collaborator, expect unauthorized/not-found. If notes follow project-level access, the member should not see the owner's project notes.

**Why**: Tests member-level access control. The member user (`rILcnT0NfogoBEXbSTHPqxvTEEA2`) is not the owner of project `h8iCqSgTjSsKySyufq36`. Verifies whether project-scoped authorization applies to note operations.

---

## Cleanup

After running tests, remove test documents from the project. Project notes do not have a delete endpoint, so cleanup requires manual Firestore deletion if needed. Test document types to clean up:

- `test-brief`, `test-known-issues`, `test-changelog`, `test-hr`, `test-no-title`, `test-stdin`, `test-apikey`, `test-limited`

---

## Last tested

Not yet tested.
