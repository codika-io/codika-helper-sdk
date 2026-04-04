# `codika init <path>`

Scaffolds a new use case folder with config.ts, workflow JSON templates, skill files, CLAUDE.md, version.json, and optionally creates a project on the platform. Also sets up workspace files (package.json, tsconfig.json, .gitignore, .editorconfig, .prettierignore) if no parent workspace with `codika` dependency is found.

**Scope required**: None (local scaffolding) + `projects:create` scope if project auto-creation is enabled
**Method**: Local + POST (createProject, optional)
**Cloud Function**: `createProjectPublic` (only when project creation is not skipped)

---

## [P] Basic scaffold with --name and --no-project

Core happy path -- scaffolds the full use case structure without any network calls.

```bash
codika init /tmp/init-test-basic --name "Test Use Case" --no-project --no-install --json
```

**Expect**: `success: true`, `path` = `/tmp/init-test-basic`, `name` = `"Test Use Case"`, `slug` = `"test-use-case"`. `files` array includes all of: `config.ts`, `CLAUDE.md`, `workflows/main-workflow.json`, `workflows/scheduled-report.json`, `workflows/text-processor.json`, `skills/main-workflow/SKILL.md`, `skills/scheduled-report/SKILL.md`, `version.json`, `package.json`, `.gitignore`, `tsconfig.json`, `.editorconfig`, `.prettierignore`. `project` = `null`, `projectSkipped` = `true`, `projectSkipReason` = `"--no-project flag was set"`. `workspace.created` = `true`, `workspace.npmInstall` = `"skipped"`.

**Why**: Confirms the full scaffolding works end-to-end without any API calls. `--no-install` prevents npm install during tests, `--no-project` avoids needing auth.

**Cleanup**:
```bash
rm -rf /tmp/init-test-basic
```

---

## [P] Human-readable output

```bash
codika init /tmp/init-test-human --name "Human Output Test" --no-project --no-install
```

**Expect**: Output contains `Creating use case "Human Output Test"...`, a `Scaffolded files:` section with green checkmarks for each file, `--no-project flag was set` warning, `npm install skipped (--no-install)` warning, and `Done! Next steps:` section with numbered instructions (edit workflows, edit skills, update config, verify, deploy).

**Why**: Verifies the human-readable formatter displays progress, file list, skip warnings, and next steps correctly.

**Cleanup**:
```bash
rm -rf /tmp/init-test-human
```

---

## [P] Scaffolded files exist on disk

Verify that the JSON `files` array matches what actually exists on the filesystem.

```bash
codika init /tmp/init-test-files --name "Files Check" --no-project --no-install --json && ls /tmp/init-test-files/config.ts /tmp/init-test-files/CLAUDE.md /tmp/init-test-files/version.json /tmp/init-test-files/package.json /tmp/init-test-files/tsconfig.json /tmp/init-test-files/.gitignore /tmp/init-test-files/.editorconfig /tmp/init-test-files/.prettierignore /tmp/init-test-files/workflows/main-workflow.json /tmp/init-test-files/workflows/scheduled-report.json /tmp/init-test-files/workflows/text-processor.json /tmp/init-test-files/skills/main-workflow/SKILL.md /tmp/init-test-files/skills/scheduled-report/SKILL.md
```

**Expect**: `ls` exits 0. All 13 files exist on disk.

**Why**: The JSON output lists files, but this confirms they are actually written to disk and the directory structure is correct.

**Cleanup**:
```bash
rm -rf /tmp/init-test-files
```

---

## [P] --description flag

```bash
codika init /tmp/init-test-desc --name "Desc Test" --description "Custom description here" --no-project --no-install --json && grep "Custom description here" /tmp/init-test-desc/config.ts
```

**Expect**: JSON shows `success: true`, `name` = `"Desc Test"`. `grep` finds `"Custom description here"` in config.ts.

**Why**: Custom descriptions should propagate to the generated config.ts instead of the default `"A Codika use case for Desc Test"`.

**Cleanup**:
```bash
rm -rf /tmp/init-test-desc
```

---

## [P] Default description when --description omitted

```bash
codika init /tmp/init-test-defdesc --name "Auto Desc" --no-project --no-install --json && grep "A Codika use case for Auto Desc" /tmp/init-test-defdesc/config.ts
```

**Expect**: `grep` finds the auto-generated description string in config.ts.

**Why**: Confirms the fallback description is generated from the name when `--description` is not provided.

**Cleanup**:
```bash
rm -rf /tmp/init-test-defdesc
```

---

## [P] --icon flag

```bash
codika init /tmp/init-test-icon --name "Icon Test" --icon "Zap" --no-project --no-install --json && grep "Zap" /tmp/init-test-icon/config.ts
```

**Expect**: JSON shows `success: true`. `grep` finds `"Zap"` in config.ts. Default icon `"Workflow"` is NOT present in config.ts.

**Why**: The `--icon` flag overrides the default Lucide icon in the generated config.ts.

**Cleanup**:
```bash
rm -rf /tmp/init-test-icon
```

---

## [P] Default icon when --icon omitted

```bash
codika init /tmp/init-test-deficon --name "Default Icon" --no-project --no-install --json && grep "Workflow" /tmp/init-test-deficon/config.ts
```

**Expect**: `grep` finds `"Workflow"` in config.ts (the default Lucide icon).

**Why**: Confirms the default icon value is applied when `--icon` is not specified.

**Cleanup**:
```bash
rm -rf /tmp/init-test-deficon
```

---

## [P] --no-project flag

```bash
codika init /tmp/init-test-noproject --name "No Project" --no-project --no-install --json | jq '{project, projectSkipped, projectSkipReason}'
```

**Expect**: `project` = `null`, `projectSkipped` = `true`, `projectSkipReason` = `"--no-project flag was set"`. No `project.json` in the `files` array.

**Why**: Confirms the `--no-project` flag suppresses project creation entirely with the correct reason.

**Cleanup**:
```bash
rm -rf /tmp/init-test-noproject
```

---

## [P] --project-id uses existing project

```bash
codika init /tmp/init-test-projid --name "Existing Project" --project-id "h8iCqSgTjSsKySyufq36" --no-install --json | jq '{project, projectSkipped}'
```

**Expect**: `project` = `{ "projectId": "h8iCqSgTjSsKySyufq36" }`, `projectSkipped` = `false`. The `files` array includes `project.json`.

**Why**: Users with existing projects should be able to link them during scaffold without creating duplicates. No API call is made.

**Verify on disk**:
```bash
cat /tmp/init-test-projid/project.json | jq '.projectId'
```

**Expect**: `"h8iCqSgTjSsKySyufq36"`

**Cleanup**:
```bash
rm -rf /tmp/init-test-projid
```

---

## [P] --project-file creates custom-named project file

```bash
codika init /tmp/init-test-pf --name "PF Test" --project-id "abc123" --project-file "project-staging.json" --no-install --json | jq '.files[]' | grep "project-staging"
```

**Expect**: Output includes `"project-staging.json"` in the files list. File exists at `/tmp/init-test-pf/project-staging.json` with `"projectId": "abc123"`.

**Why**: The `--project-file` flag lets users create per-environment project files (e.g., `project-staging.json`, `project-client-a.json`).

**Cleanup**:
```bash
rm -rf /tmp/init-test-pf
```

---

## [P] --no-install flag

```bash
codika init /tmp/init-test-noinst --name "No Install" --no-project --no-install --json | jq '.workspace.npmInstall'
```

**Expect**: `"skipped"`. No `node_modules/` directory exists in `/tmp/init-test-noinst/`.

**Why**: Confirms `--no-install` prevents npm install from running. The workspace files (package.json, etc.) are still created.

**Cleanup**:
```bash
rm -rf /tmp/init-test-noinst
```

---

## [P] --with-data-ingestion scaffolds extra folder

```bash
codika init /tmp/init-test-di --name "DI Test" --with-data-ingestion --no-project --no-install --json | jq '.files[]' | grep "data-ingestion"
```

**Expect**: Output includes a file path containing `data-ingestion/` (specifically `data-ingestion/di-test-embedding-ingestion.json`). The `data-ingestion/` directory exists on disk with the workflow file.

**Why**: The `--with-data-ingestion` flag adds a template embedding workflow for use cases that need vector store ingestion.

**Cleanup**:
```bash
rm -rf /tmp/init-test-di
```

---

## [P] --json flag produces valid JSON

```bash
codika init /tmp/init-test-json --name "JSON Test" --no-project --no-install --json | jq type
```

**Expect**: `"object"`. The `jq type` command succeeds, confirming the output is valid parseable JSON.

**Why**: Machine-readable output must be well-formed JSON for scripting and CI pipelines.

**Cleanup**:
```bash
rm -rf /tmp/init-test-json
```

---

## [P] --profile flag for project creation

```bash
codika init /tmp/init-test-profile --name "Profile Test" --profile cli-test-owner-full --no-install --json | jq '{project, projectSkipped}'
```

**Expect**: `project` is non-null with a `projectId` string and `organizationId` string. `projectSkipped` = `false`.

**Why**: Confirms the `--profile` flag is used to resolve the API key and create a project on the platform. The profile's org ID should be written to project.json.

**Cleanup**:
```bash
rm -rf /tmp/init-test-profile
```

---

## [P] --api-key flag for project creation

```bash
codika init /tmp/init-test-apikey --name "API Key Test" --api-key "$(codika config show --json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --no-install --json | jq '.projectSkipped'
```

**Expect**: `false`. A project is created using the explicitly-provided API key.

**Why**: The `--api-key` flag takes highest priority in the resolution chain and should override any profile or env var.

**Cleanup**:
```bash
rm -rf /tmp/init-test-apikey
```

---

## [P] Slug generation from name

```bash
codika init /tmp/init-test-slug --name "My Complex Use-Case Name!" --no-project --no-install --json | jq '.slug'
```

**Expect**: A URL-safe slug like `"my-complex-use-case-name"` (lowercase, hyphens, no special characters).

**Why**: The slug is used for workflow file naming conventions and webhook paths -- it must be clean and deterministic.

**Cleanup**:
```bash
rm -rf /tmp/init-test-slug
```

---

## [P] version.json starts at 1.0.0

```bash
codika init /tmp/init-test-version --name "Version Test" --no-project --no-install --json && cat /tmp/init-test-version/version.json | jq '.version'
```

**Expect**: `"1.0.0"`

**Why**: New use cases must start at version 1.0.0 per the platform's version tracking convention.

**Cleanup**:
```bash
rm -rf /tmp/init-test-version
```

---

## [P] config.ts contains correct name, slug, and icon

```bash
codika init /tmp/init-test-config --name "Config Check" --icon "Bell" --description "Testing config content" --no-project --no-install --json && cat /tmp/init-test-config/config.ts
```

**Expect**: config.ts file contains `"Config Check"` (name), `"config-check"` (slug), `"Bell"` (icon), and `"Testing config content"` (description). The file should also reference all three workflow files in a WORKFLOW_FILES array.

**Why**: config.ts is the deployment manifest -- every flag value must propagate correctly into the generated file.

**Cleanup**:
```bash
rm -rf /tmp/init-test-config
```

---

## [P] Workspace detection -- skips package.json if parent workspace exists

```bash
mkdir -p /tmp/init-workspace-test && echo '{"dependencies":{"codika":"^1.0.0"}}' > /tmp/init-workspace-test/package.json && codika init /tmp/init-workspace-test/my-use-case --name "Workspace Child" --no-project --no-install --json | jq '.workspace'
```

**Expect**: `workspace.created` = `false`, `workspace.existingWorkspacePath` = `/tmp/init-workspace-test`. The `files` array does NOT include `package.json`, `tsconfig.json`, `.gitignore`, `.editorconfig`, or `.prettierignore`. These workspace files are NOT created inside the use case folder.

**Why**: When the use case is scaffolded inside a monorepo that already has `codika` as a dependency, creating a nested package.json would cause dependency confusion.

**Cleanup**:
```bash
rm -rf /tmp/init-workspace-test
```

---

## [P] Project creation with valid profile (end-to-end)

```bash
codika init /tmp/init-test-project --name "Project Create Test" --profile cli-test-owner-full --no-install --json | jq '{project, projectSkipped}'
```

**Expect**: `project` is non-null with a `projectId` string. `projectSkipped` = `false`. A `project.json` file is created containing the new project ID and organization ID.

**Why**: Default behavior (no `--no-project`) creates a project on the platform during scaffold. This is the full end-to-end path.

**Cleanup**:
```bash
rm -rf /tmp/init-test-project
```

---

## [P] Project creation gracefully skipped when no API key

```bash
CODIKA_API_KEY="" codika init /tmp/init-test-nokey --name "No Key Test" --no-install --json --profile __nonexistent__ | jq '{projectSkipped, projectSkipReason}'
```

**Expect**: `projectSkipped` = `true`, `projectSkipReason` contains `"No API key found"`.

**Why**: When no API key is available (no flag, no env var, no profile), project creation is gracefully skipped with a helpful message. The scaffold itself still succeeds.

**Cleanup**:
```bash
rm -rf /tmp/init-test-nokey
```

---

## [N] Path already contains config.ts -- human-readable

```bash
mkdir -p /tmp/init-test-exists && touch /tmp/init-test-exists/config.ts && codika init /tmp/init-test-exists --name "Duplicate" --no-project --no-install 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2. Error message contains `Directory already contains a config.ts`.

**Why**: Idempotency guard -- prevents accidentally overwriting an existing use case. The `exitWithError` function uses exit code 2 for validation errors.

**Cleanup**:
```bash
rm -rf /tmp/init-test-exists
```

---

## [N] Path already contains config.ts -- JSON output

```bash
mkdir -p /tmp/init-test-exists-json && touch /tmp/init-test-exists-json/config.ts && codika init /tmp/init-test-exists-json --name "Duplicate" --no-project --no-install --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Note: the `exitWithError` function writes to stderr and calls `process.exit(2)` before the `--json` catch handler runs, so the output may be the plain error format rather than JSON. If the code reaches the catch handler, JSON output with `success: false`, `error.message` contains `"already contains a config.ts"`, exit code 1.

**Why**: Tests the error path when `--json` is set. The current implementation calls `exitWithError()` which bypasses the JSON error handler -- this test documents that behavior.

**Cleanup**:
```bash
rm -rf /tmp/init-test-exists-json
```

---

## [N] Missing path argument

```bash
codika init 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander error about missing required argument `path`.

**Why**: The `<path>` argument is required by Commander's argument definition. Commander handles this before the action runs.

---

## [N] Missing --name in non-interactive mode (piped input)

```bash
echo "" | codika init /tmp/init-test-noname --no-project --no-install --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Error message contains `"Use case name is required"`.

**Why**: When stdin is piped (non-interactive), providing an empty name should fail with a clear error. The interactive prompt receives empty input.

**Cleanup**:
```bash
rm -rf /tmp/init-test-noname
```

---

## [N] Invalid API key causes project creation to fail gracefully

```bash
codika init /tmp/init-test-badkey --name "Bad Key Test" --api-key "cko_garbage_key_here" --no-install --json | jq '{projectSkipped, projectSkipReason}'
```

**Expect**: `projectSkipped` = `true`, `projectSkipReason` contains `"Project creation failed"`. The scaffold itself still succeeds (`success: true`).

**Why**: A bad API key should not prevent scaffolding. The project creation failure is a warning, not a fatal error. Users can create the project later.

**Cleanup**:
```bash
rm -rf /tmp/init-test-badkey
```

---

## [S] Project creation uses correct org from profile

```bash
codika init /tmp/init-test-org --name "Org Check" --profile cli-test-owner-full --no-install --json && cat /tmp/init-test-org/project.json | jq '.organizationId'
```

**Expect**: Organization ID matches the profile's org (`"l0gM8nHm2o2lpupMpm5x"` for cli-test-owner-full).

**Why**: The project must be created in the correct organization. The org ID from the profile should be written to project.json so subsequent deploys target the right org.

**Cleanup**:
```bash
rm -rf /tmp/init-test-org
```

---

## [S] Scope enforcement -- limited key without projects:create

The `cli-test-limited` profile has only `deploy:use-case` + `instances:read` scopes, not `projects:create`.

```bash
codika init /tmp/init-test-limited --name "Limited Key" --profile cli-test-limited --no-install --json | jq '{projectSkipped, projectSkipReason}'
```

**Expect**: `projectSkipped` = `true`, `projectSkipReason` contains a failure message (either scope error or project creation failed). The scaffold itself succeeds.

**Why**: A key without `projects:create` scope should fail at the API level. The init command should handle this gracefully -- scaffold succeeds, project creation is skipped with a reason.

**Cleanup**:
```bash
rm -rf /tmp/init-test-limited
```

---

## [S] Cross-org key creates project in its own org

```bash
codika init /tmp/init-test-crossorg --name "Cross Org" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --no-install --json | jq '.project'
```

**Expect**: If the cross-org key has `projects:create` scope, the project is created in org `HF5DaJQamZxIeMj0zfWY` (the cross-org). If not, `projectSkipped` = `true`. In either case, the project should NOT be created in the test org `l0gM8nHm2o2lpupMpm5x`.

**Why**: API keys are bound to their organization. A key from org B must never create resources in org A. This tests cross-org isolation at the init level.

**Cleanup**:
```bash
rm -rf /tmp/init-test-crossorg
```

---

## [P] Workflow JSON files are valid JSON

```bash
codika init /tmp/init-test-validjson --name "JSON Valid" --no-project --no-install --json && jq type /tmp/init-test-validjson/workflows/main-workflow.json && jq type /tmp/init-test-validjson/workflows/scheduled-report.json && jq type /tmp/init-test-validjson/workflows/text-processor.json
```

**Expect**: All three `jq type` calls return `"object"`. The workflow JSON files are well-formed.

**Why**: Malformed workflow JSON would cause deployment failures. Template generation must produce valid JSON.

**Cleanup**:
```bash
rm -rf /tmp/init-test-validjson
```

---

## [P] Skill files are generated for triggerable workflows only

```bash
codika init /tmp/init-test-skills --name "Skills Test" --no-project --no-install --json && ls /tmp/init-test-skills/skills/main-workflow/SKILL.md /tmp/init-test-skills/skills/scheduled-report/SKILL.md && test ! -d /tmp/init-test-skills/skills/text-processor; echo "EXIT:$?"
```

**Expect**: `ls` succeeds for main-workflow and scheduled-report skills. The `text-processor` skills directory does NOT exist (exit 0 from the `test ! -d`).

**Why**: Skills are only created for triggerable workflows (HTTP and schedule). Sub-workflows like text-processor are not directly triggerable and should not have skills.

**Cleanup**:
```bash
rm -rf /tmp/init-test-skills
```

---

## [P] --with-data-ingestion uses slug in filename

```bash
codika init /tmp/init-test-dislug --name "My Cool Bot" --with-data-ingestion --no-project --no-install --json | jq '.files[]' | grep "data-ingestion"
```

**Expect**: The data ingestion file is named `data-ingestion/my-cool-bot-embedding-ingestion.json` (using the slug, not the original name).

**Why**: The data ingestion workflow filename is derived from the slug to maintain consistent naming conventions.

**Cleanup**:
```bash
rm -rf /tmp/init-test-dislug
```

---

## [P] Without --with-data-ingestion, no data-ingestion folder

```bash
codika init /tmp/init-test-nodi --name "No DI" --no-project --no-install --json && test ! -d /tmp/init-test-nodi/data-ingestion; echo "EXIT:$?"
```

**Expect**: Exit 0 from `test ! -d` -- the data-ingestion directory does not exist.

**Why**: The data-ingestion folder should only be created when `--with-data-ingestion` is explicitly passed.

**Cleanup**:
```bash
rm -rf /tmp/init-test-nodi
```

---

## Last tested

Not yet tested.
