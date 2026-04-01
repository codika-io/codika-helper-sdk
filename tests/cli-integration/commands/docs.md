# `codika docs upsert|list|get`

Manage agent documents — a versioned project knowledge base. Upsert creates or updates documents, list shows all current documents, get retrieves content and history.

**Scope required**: `deploy:use-case`
**Methods**: POST (body varies per endpoint)
**Cloud Functions**: `upsertAgentDocument`, `getAgentDocuments`

**Test project**: `h8iCqSgTjSsKySyufq36` (owner project)

---

## [P] Upsert -- create first document (JSON output)

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "This is a test project brief for CLI integration testing." --summary "Initial version" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.0"`, `data.isNew: true`, `data.documentTypeId: "test-brief"`. Exit code 0.

**Why**: Core happy path — first upsert creates v0.0.0.

---

## [P] Upsert -- update existing document (version increments)

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "Updated content for the test brief." --summary "Updated content" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.1"`, `data.isNew: false`. Exit code 0.

**Why**: Second upsert of same type increments PATCH version.

---

## [P] Upsert -- with --file flag

```bash
echo "# Known Issues\n\n- Timeout on large files" > /tmp/test-known-issues.md
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-known-issues --file /tmp/test-known-issues.md --summary "Initial known issues" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.version: "0.0.0"`, `data.isNew: true`. Exit code 0.

**Why**: Verifies --file flag reads content from disk.

---

## [P] Upsert -- major change bumps MINOR

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-brief --title "Test Brief" --content "Major rewrite of the brief." --summary "Major rewrite" --major-change --profile cli-test-owner-full --json
```

**Expect**: `success: true`, version is `0.1.0` (minor bumped, patch reset). Exit code 0.

**Why**: `--major-change` flag triggers MINOR increment instead of PATCH.

---

## [P] Upsert -- with agent-id

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-changelog --title "Changelog" --content "v1: Initial deployment" --summary "First entry" --agent-id "use-case-builder" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.isNew: true`. Exit code 0.

**Why**: Agent ID is stored as provenance metadata.

---

## [P] Upsert -- human-readable output

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-hr --title "Human Readable Test" --content "Test content" --summary "Test" --profile cli-test-owner-full
```

**Expect**: Output contains "Created test-hr" or "Updated test-hr", version, document ID, project ID. Exit code 0.

**Why**: Verifies human-readable formatting path.

---

## [P] List -- all documents

```bash
codika docs list h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` array contains entries for each document type created above (test-brief, test-known-issues, test-changelog, test-hr). Each has `status: "current"`. Exit code 0.

**Why**: List returns all current documents for the project.

---

## [P] List -- filter by type

```bash
codika docs list h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` has exactly 1 entry with `documentTypeId: "test-brief"`, `status: "current"`. Exit code 0.

**Why**: Type filter returns only the current version of that specific type.

---

## [P] List -- human-readable output

```bash
codika docs list h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full
```

**Expect**: Formatted output showing each document type, version, title, summary, and word count. Shows total count. Exit code 0.

**Why**: Verifies human-readable list formatting.

---

## [P] Get -- current version

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents[0].status: "current"`, content is the latest upserted content ("Major rewrite of the brief."), version is `0.1.0`. Exit code 0.

**Why**: Get returns the current (latest) version of a document type.

---

## [P] Get -- specific version

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type test-brief --version 0.0.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents[0].version: "0.0.0"`, content is the original ("This is a test project brief..."). Exit code 0.

**Why**: Specific version retrieval returns the immutable historical version.

---

## [P] Get -- version history

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type test-brief --history --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` has 3 entries (v0.0.0, v0.0.1, v0.1.0) ordered by versionFilterKey desc. First has `status: "current"`, rest have `status: "superseded"`. Exit code 0.

**Why**: History shows all versions of a document type, newest first.

---

## [P] Get -- human-readable output

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type test-brief --profile cli-test-owner-full
```

**Expect**: Shows document type, version, title, summary, word count, status, then the full markdown content after a `---` separator. Exit code 0.

**Why**: Verifies human-readable get formatting.

---

## [P] Get -- history human-readable

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type test-brief --history --profile cli-test-owner-full
```

**Expect**: Shows version history list with `*` marker on current version, version numbers, statuses, summaries, and total count. Exit code 0.

**Why**: Verifies human-readable history formatting.

---

## [N] Upsert -- missing required fields

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-fail --profile cli-test-owner-full --json
```

**Expect**: Error from commander about missing `--summary`. Exit code 1.

**Why**: Summary is a required option.

---

## [N] Upsert -- no content and no file

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-fail --summary "test" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error contains "content" or "file". Exit code 1.

**Why**: Either --content or --file must be provided.

---

## [N] Upsert -- invalid type format

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type "Invalid Type!" --content "test" --summary "test" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about documentTypeId format. Exit code 1.

**Why**: Type IDs must be lowercase alphanumeric with hyphens.

---

## [N] Upsert -- nonexistent project

```bash
codika docs upsert nonexistent-project-id --type test-brief --content "test" --summary "test" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about project not found. Exit code 1.

**Why**: Server validates project existence.

---

## [N] Get -- nonexistent type

```bash
codika docs get h8iCqSgTjSsKySyufq36 --type nonexistent-type --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.documents` is empty array. Exit code 0.

**Why**: Querying a type that doesn't exist returns empty results, not an error.

---

## [N] Get -- version requires type

```bash
codika docs get h8iCqSgTjSsKySyufq36 --version 0.0.0 --profile cli-test-owner-full --json
```

**Expect**: Error from commander about missing `--type`. Exit code 1.

**Why**: Version queries require a document type.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika docs list h8iCqSgTjSsKySyufq36 --profile cli-test-limited --json
```

**Expect**: `success: true`. Exit code 0.

**Why**: Agent document operations use the `deploy:use-case` scope.

---

## [S] Cross-org isolation

```bash
codika docs list h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about unauthorized or project not found. Exit code 1.

**Why**: Cross-org keys cannot access another org's project documents.

---

## [S] Invalid API key

```bash
codika docs upsert h8iCqSgTjSsKySyufq36 --type test-brief --content "test" --summary "test" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys.

---

## Cleanup

After running tests, remove test documents from the project. (Agent documents don't have a delete endpoint yet, so this is manual Firestore cleanup if needed.)

---

## Last tested

Not yet tested.
