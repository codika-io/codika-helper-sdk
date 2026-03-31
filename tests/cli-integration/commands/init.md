# `codika init <path>`

Scaffolds a new use case folder with config.ts, workflow JSON templates, skill files, version.json, and optionally creates a project on the platform. Also sets up workspace files (package.json, tsconfig.json, .gitignore, .editorconfig, .prettierignore) if no parent workspace with `codika` dependency is found.

**Scope required**: None (local scaffolding) + `projects:create` scope if project auto-creation is enabled
**Method**: Local + POST (createProject, optional)
**Cloud Function**: `createProjectPublic` (only when project creation is not skipped)

---

### [P] Basic scaffold with --name and --no-project

```bash
codika init /tmp/init-test-basic --name "Test Use Case" --no-project --no-install --json
```

**Expect**: `success: true`, `path` = `/tmp/init-test-basic`, `name` = `"Test Use Case"`, `slug` = `"test-use-case"`, `files` array includes `config.ts`, `CLAUDE.md`, `workflows/main-workflow.json`, `workflows/scheduled-report.json`, `workflows/text-processor.json`, `skills/main-workflow/SKILL.md`, `skills/scheduled-report/SKILL.md`, `version.json`, `package.json`, `.gitignore`, `tsconfig.json`, `.editorconfig`, `.prettierignore`. `project` = `null`, `projectSkipped` = `true`.

**Why**: Core happy path — scaffolds the full use case structure without any network calls. `--no-install` prevents npm install from running during tests.

**Cleanup**:
```bash
rm -rf /tmp/init-test-basic
```

---

### [P] Human-readable output

```bash
codika init /tmp/init-test-human --name "Human Output Test" --no-project --no-install
```

**Expect**: Output contains `Creating use case "Human Output Test"...`, `Scaffolded files:` section with green checkmarks for each file, `Done! Next steps:` section with numbered instructions. `npm install skipped (--no-install)` warning shown.

**Why**: Verifies the human-readable formatter displays progress, file list, and next steps correctly.

**Cleanup**:
```bash
rm -rf /tmp/init-test-human
```

---

### [P] --description flag

```bash
codika init /tmp/init-test-desc --name "Desc Test" --description "Custom description here" --no-project --no-install --json | jq '.name'
```

**Expect**: `"Desc Test"`. The generated `config.ts` file contains `"Custom description here"` as the description.

**Why**: Custom descriptions should propagate to the generated config.ts instead of the default `"A Codika use case for Desc Test"`.

**Cleanup**:
```bash
rm -rf /tmp/init-test-desc
```

---

### [P] --icon flag

```bash
codika init /tmp/init-test-icon --name "Icon Test" --icon "Zap" --no-project --no-install --json && grep -c "Zap" /tmp/init-test-icon/config.ts
```

**Expect**: JSON shows `success: true`. `grep` returns `1` or more (the icon name appears in config.ts). Default icon `Workflow` is not present.

**Why**: The `--icon` flag overrides the default Lucide icon in the generated config.ts.

**Cleanup**:
```bash
rm -rf /tmp/init-test-icon
```

---

### [P] --project-id uses existing project

```bash
codika init /tmp/init-test-projid --name "Existing Project" --project-id "h8iCqSgTjSsKySyufq36" --no-install --json | jq '.project'
```

**Expect**: `{ "projectId": "h8iCqSgTjSsKySyufq36" }`. A `project.json` file is created in the use case folder containing this project ID. No API call is made to create a new project.

**Why**: Users with existing projects should be able to link them during scaffold without creating duplicates.

**Cleanup**:
```bash
rm -rf /tmp/init-test-projid
```

---

### [P] --with-data-ingestion scaffolds extra folder

```bash
codika init /tmp/init-test-di --name "DI Test" --with-data-ingestion --no-project --no-install --json | jq '.files[]' | grep "data-ingestion"
```

**Expect**: Output includes a file path containing `data-ingestion/` (e.g., `data-ingestion/di-test-embedding-ingestion.json`). The `data-ingestion/` directory exists on disk.

**Why**: The `--with-data-ingestion` flag adds a template embedding workflow for use cases that need vector store ingestion.

**Cleanup**:
```bash
rm -rf /tmp/init-test-di
```

---

### [P] --project-file creates custom-named project file

```bash
codika init /tmp/init-test-pf --name "PF Test" --project-id "abc123" --project-file "project-staging.json" --no-install --json | jq '.files[]' | grep "project-staging"
```

**Expect**: Output includes `project-staging.json` in the files list. File exists at `/tmp/init-test-pf/project-staging.json`.

**Why**: The `--project-file` flag lets users create per-environment project files (e.g., `project-staging.json`, `project-client-a.json`).

**Cleanup**:
```bash
rm -rf /tmp/init-test-pf
```

---

### [P] Slug generation from name

```bash
codika init /tmp/init-test-slug --name "My Complex Use-Case Name!" --no-project --no-install --json | jq '.slug'
```

**Expect**: A URL-safe slug like `"my-complex-use-case-name"` (lowercase, hyphens, no special characters).

**Why**: The slug is used for workflow file naming conventions and webhook paths — it must be clean.

**Cleanup**:
```bash
rm -rf /tmp/init-test-slug
```

---

### [P] Workspace detection — skips package.json if parent workspace exists

```bash
# Create a parent workspace with codika dependency
mkdir -p /tmp/init-workspace-test && echo '{"dependencies":{"codika":"^1.0.0"}}' > /tmp/init-workspace-test/package.json && codika init /tmp/init-workspace-test/my-use-case --name "Workspace Child" --no-project --no-install --json | jq '.workspace'
```

**Expect**: `workspace.created` = `false`, `workspace.existingWorkspacePath` = `/tmp/init-workspace-test`. No `package.json` is created inside the use case folder (it uses the parent's).

**Why**: When the use case is scaffolded inside a monorepo that already has `codika` as a dependency, creating a nested package.json would cause dependency confusion.

**Cleanup**:
```bash
rm -rf /tmp/init-workspace-test
```

---

### [N] Path already contains config.ts

```bash
mkdir -p /tmp/init-test-exists && touch /tmp/init-test-exists/config.ts && codika init /tmp/init-test-exists --name "Duplicate" --no-project --no-install 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2, error message contains `Directory already contains a config.ts`.

**Why**: Idempotency guard — prevents accidentally overwriting an existing use case.

**Cleanup**:
```bash
rm -rf /tmp/init-test-exists
```

---

### [N] Existing config.ts — JSON output

```bash
mkdir -p /tmp/init-test-exists-json && touch /tmp/init-test-exists-json/config.ts && codika init /tmp/init-test-exists-json --name "Duplicate" --no-project --no-install --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, JSON output with `success: false`, `error.message` contains `already contains a config.ts`.

**Why**: The `--json` flag should produce machine-readable error output even for local validation failures.

**Cleanup**:
```bash
rm -rf /tmp/init-test-exists-json
```

---

### [N] Missing path argument

```bash
codika init 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander error about missing required argument `<path>`.

**Why**: The path argument is required by Commander's argument definition.

---

### [P] Project creation with valid API key

```bash
codika init /tmp/init-test-project --name "Project Create Test" --profile cli-test-owner-full --no-install --json | jq '{project, projectSkipped}'
```

**Expect**: `project` is non-null with a `projectId` string. `projectSkipped` = `false`. A `project.json` file is created containing the new project ID and organization ID.

**Why**: Default behavior (no `--no-project`) creates a project on the platform during scaffold. This is the end-to-end path.

**Cleanup**:
```bash
rm -rf /tmp/init-test-project
```

---

### [P] Project creation skipped when no API key

```bash
CODIKA_API_KEY="" codika init /tmp/init-test-nokey --name "No Key Test" --no-install --json | jq '{projectSkipped, projectSkipReason}'
```

**Expect**: `projectSkipped` = `true`, `projectSkipReason` contains `No API key found`.

**Why**: When no API key is available, project creation is gracefully skipped with a helpful message telling the user how to create one later.

**Cleanup**:
```bash
rm -rf /tmp/init-test-nokey
```

---

## Last tested

Not yet tested.
