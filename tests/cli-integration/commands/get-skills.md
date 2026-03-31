# `codika get skills [processInstanceId]`

Fetches skill documents from a deployed process instance. Downloads them as Claude-compatible skill directories (`{name}/SKILL.md`). Supports `--stdout` to print to terminal, `--json` for machine-readable output, and auto-resolution of process instance ID from `project.json`.

**Scope required**: `skills:read`
**Method**: GET (path: `/{processInstanceId}`)
**Cloud Function**: `getProcessSkillsPublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (Competitor Intelligence, dev, active)

---

## [P] Happy path — Fetch skills with explicit instance ID

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Confirms the basic flow — auth, scope check, skill document fetch, response shaping.

---

## [P] JSON output shape

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq 'keys'
```

**Expect**: `["processInstanceId", "skillCount", "skills", "success"]`

**Why**: Ensures the CLI wraps the API response in the documented JSON shape with `success`, `processInstanceId`, `skillCount`, and `skills`.

---

## [P] Each skill has correct fields

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq 'if .skillCount > 0 then .skills[0] | keys else ["no-skills"] end'
```

**Expect**: `["contentMarkdown", "description", "name", "workflowTemplateId"]` (if skills exist) or `["no-skills"]` (if the instance has no skills).

**Why**: Ensures each `SkillDocument` contains the four documented fields: `name`, `description`, `workflowTemplateId`, `contentMarkdown`.

---

## [P] `skillCount` matches array length

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '(.skillCount == (.skills | length))'
```

**Expect**: `true`

**Why**: Sanity check that the `skillCount` field matches the actual skills array length.

---

## [P] `--stdout` prints skill content to terminal

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --stdout --profile cli-test-owner-full
```

**Expect**: For each skill, a separator line (`===...`), `Skill: <name> (<workflowTemplateId>)`, another separator, then the markdown content. No files are written to disk.

**Why**: Verifies the `--stdout` mode prints content inline instead of writing files to the `./skills/` directory.

---

## [P] Default mode writes skill files to `./skills/`

```bash
cd /tmp && mkdir -p skills-test && cd skills-test && \
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/skills-test/skills --profile cli-test-owner-full && \
ls /tmp/skills-test/skills/
```

**Expect**: One directory per skill, each containing a `SKILL.md` file. Output shows `✓ Downloaded N skill(s) to /tmp/skills-test/skills/` and a list of each `<name>/SKILL.md` with description and trigger command.

**Why**: Verifies the file-writing mode creates Claude-compatible skill directories.

---

## [P] `-o` flag overrides output directory

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/custom-skills-dir --profile cli-test-owner-full && \
ls /tmp/custom-skills-dir/
```

**Expect**: Skills are written to `/tmp/custom-skills-dir/` instead of the default `./skills/`.

**Why**: Verifies the `--output` / `-o` flag changes the target directory.

---

## [P] Auto-resolve process instance ID from `project.json` via `--path`

```bash
mkdir -p /tmp/skills-path-test && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/skills-path-test/project.json && \
codika get skills --path /tmp/skills-path-test --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is auto-resolved from `project.json` in the `--path` directory.

**Why**: Verifies the resolution chain: positional arg > `--process-instance-id` > `project.json` in `--path` > `project.json` in cwd.

---

## [P] `--process-instance-id` flag as alternative to positional arg

```bash
codika get skills --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Verifies the `--process-instance-id` option works as an alternative to the positional argument.

---

## [P] `--project-file` flag for custom project file

```bash
mkdir -p /tmp/skills-projfile-test && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/skills-projfile-test/custom-project.json && \
codika get skills --path /tmp/skills-projfile-test --project-file custom-project.json --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is read from the custom project file.

**Why**: Verifies the `--project-file` flag works with `--path` for non-standard project file names.

---

## [N] Missing process instance ID (no arg, no flag, no project.json)

```bash
cd /tmp && codika get skills --profile cli-test-owner-full --json 2>&1
```

**Expect**: Exit code 1, `success: false`, error about process instance ID being required with instructions on how to provide it.

**Why**: The command requires a process instance ID from at least one source. Without it, the user gets a helpful error.

---

## [N] Nonexistent process instance ID

```bash
codika get skills nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: Exit code 1, `success: false`, error about not found or failed to fetch skills.

**Why**: Standard 404 handling for an instance that doesn't exist.

---

## [S] Scope enforcement — limited key lacks `skills:read`

The limited key has `deploy:use-case` + `instances:read` but NOT `skills:read`.

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: Exit code 1, `success: false`, error message contains `skills:read`.

**Why**: Proves the scope check works. The key is valid but lacks the required scope.

---

## [S] Cross-org key cannot fetch skills from test org instance

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: Exit code 1, `success: false`, error about not found or forbidden. The cross-org key must not access the test org's instance skills.

**Why**: Proves organization isolation — the instance belongs to `l0gM8nHm2o2lpupMpm5x` but the key belongs to `HF5DaJQamZxIeMj0zfWY`.

---

## [N] Invalid API key

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json
```

**Expect**: Exit code 1, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## Last tested

Not yet tested.
