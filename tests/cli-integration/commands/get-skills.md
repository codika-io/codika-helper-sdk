# `codika get skills [processInstanceId]`

Fetches skill documents from a deployed process instance. Downloads them as Claude-compatible skill directories (`{name}/SKILL.md`). Supports `--stdout` to print to terminal, `--json` for machine-readable output, `-o` to override the output directory, and auto-resolution of process instance ID from `project.json`.

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

## [P] Human-readable output

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/cli-test-skills-hr --profile cli-test-owner-full
```

**Expect**: Output contains `Downloaded` and `skill(s) to`, lists each `<name>/SKILL.md` with a description and `Trigger: codika trigger <workflowTemplateId>`, and ends with the Claude Code usage hint `codika get skills --output .claude/skills`.

**Why**: Verifies the default human-readable output format (not just the JSON path). This is what users see interactively.

**Cleanup**: `rm -rf /tmp/cli-test-skills-hr`

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
cd /tmp && mkdir -p cli-test-skills-default && cd cli-test-skills-default && \
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full && \
ls skills/
```

**Expect**: One directory per skill inside `./skills/`, each containing a `SKILL.md` file. Output shows `Downloaded N skill(s) to` and lists each `<name>/SKILL.md`.

**Why**: Verifies the default file-writing mode creates Claude-compatible skill directories at `./skills/` when no `-o` flag is provided.

**Cleanup**: `rm -rf /tmp/cli-test-skills-default`

---

## [P] `-o` flag overrides output directory

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/cli-test-custom-skills --profile cli-test-owner-full && \
ls /tmp/cli-test-custom-skills/
```

**Expect**: Skills are written to `/tmp/cli-test-custom-skills/` instead of the default `./skills/`. One directory per skill, each with a `SKILL.md` file.

**Why**: Verifies the `--output` / `-o` flag changes the target directory.

**Cleanup**: `rm -rf /tmp/cli-test-custom-skills`

---

## [P] Skill file content is valid markdown

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 -o /tmp/cli-test-skills-content --profile cli-test-owner-full && \
FIRST_SKILL=$(ls /tmp/cli-test-skills-content/ | head -1) && \
head -5 /tmp/cli-test-skills-content/$FIRST_SKILL/SKILL.md
```

**Expect**: The SKILL.md file starts with YAML frontmatter (`---`) containing at least a `name` field. The file is non-empty and contains valid markdown.

**Why**: Ensures the `contentMarkdown` field is written correctly and produces a usable Claude Code skill file.

**Cleanup**: `rm -rf /tmp/cli-test-skills-content`

---

## [P] Auto-resolve process instance ID from `project.json` via `--path`

```bash
mkdir -p /tmp/cli-test-skills-path && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/cli-test-skills-path/project.json && \
codika get skills --path /tmp/cli-test-skills-path --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is auto-resolved from `project.json` in the `--path` directory.

**Why**: Verifies resolution chain step 3: `project.json` in `--path` directory. This is the typical flow when running from a use case folder.

**Cleanup**: `rm -rf /tmp/cli-test-skills-path`

---

## [P] `--process-instance-id` flag as alternative to positional arg

```bash
codika get skills --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true`

**Why**: Verifies resolution chain step 2: `--process-instance-id` option works as an alternative to the positional argument.

---

## [P] `--project-file` flag for custom project file name

```bash
mkdir -p /tmp/cli-test-skills-projfile && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/cli-test-skills-projfile/custom-project.json && \
codika get skills --path /tmp/cli-test-skills-projfile --project-file custom-project.json --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is read from the custom project file.

**Why**: Verifies the `--project-file` flag overrides the default `project.json` filename. Useful for multi-target deployments (e.g., `project-client-a.json`).

**Cleanup**: `rm -rf /tmp/cli-test-skills-projfile`

---

## [P] Auto-resolve from `project.json` in cwd (step 4)

```bash
mkdir -p /tmp/cli-test-skills-cwd && \
echo '{"projectId":"test","devProcessInstanceId":"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"}' > /tmp/cli-test-skills-cwd/project.json && \
cd /tmp/cli-test-skills-cwd && \
codika get skills --profile cli-test-owner-full --json | jq '.success'
```

**Expect**: `true` — the process instance ID is auto-resolved from `project.json` in the current working directory.

**Why**: Verifies resolution chain step 4: falls back to `project.json` in cwd when no positional arg, no `--process-instance-id`, and no `--path` are provided.

**Cleanup**: `rm -rf /tmp/cli-test-skills-cwd`

---

## [P] Resolution priority — positional arg wins over project.json

```bash
mkdir -p /tmp/cli-test-skills-priority && \
echo '{"projectId":"test","devProcessInstanceId":"nonexistent-id-from-project-json"}' > /tmp/cli-test-skills-priority/project.json && \
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --path /tmp/cli-test-skills-priority --profile cli-test-owner-full --json | jq '.processInstanceId'
```

**Expect**: `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"` — the positional arg wins over the (invalid) project.json value.

**Why**: Confirms the resolution chain priority: positional arg > `--process-instance-id` > `project.json` in `--path` > `project.json` in cwd.

**Cleanup**: `rm -rf /tmp/cli-test-skills-priority`

---

## [N] Missing process instance ID — no arg, no flag, no project.json

No positional argument, no `--process-instance-id`, no `--path`, and no `project.json` in cwd. This hits the `throw new Error('Process instance ID is required...')` path.

```bash
cd /tmp && codika get skills --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. JSON output with `success: false` and error message containing `Process instance ID is required`. The error message includes guidance on how to provide it (argument, `--process-instance-id`, or `project.json`).

**Why**: Verifies the early guard when no process instance ID can be resolved from any source.

---

## [N] Missing API key — no profile, no env, no flag

No `--profile`, no `--api-key`, no `CODIKA_API_KEY` env var. This hits the `throw new Error(API_KEY_MISSING_MESSAGE)` path.

```bash
cd /tmp && env -u CODIKA_API_KEY codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. JSON output with `success: false` and error message containing `API key is required`. Unlike `list projects` (which uses `exitWithError` with exit code 2), this command throws through the catch block so all errors exit with code 1.

**Why**: Verifies the API key resolution guard. The process instance ID resolves fine, but no API key is available.

---

## [N] Nonexistent process instance ID

```bash
codika get skills nonexistent-instance-id --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. JSON output with `success: false`, error message about failed to fetch skills or not found.

**Why**: Standard 404 handling for an instance that does not exist in Firestore.

---

## [N] Missing process instance ID — non-JSON mode

```bash
cd /tmp && codika get skills --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`. Stderr contains `Error:` followed by `Process instance ID is required`. No JSON wrapping — the catch block uses `console.error` when `--json` is not set.

**Why**: Verifies the non-JSON error path. The catch block branches on `options.json` — when false, it writes a colored error to stderr instead of structured JSON.

---

## [S] Scope enforcement — limited key lacks `skills:read`

The limited key (`cli-test-limited`) has `deploy:use-case` + `instances:read` but NOT `skills:read`.

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error message contains `skills:read`.

**Why**: Proves the `hasScope('skills:read')` check in the Cloud Function works. The key authenticates fine (valid key, right org) but is rejected for lacking the required scope.

---

## [S] Cross-org key cannot fetch skills from test org instance

The cross-org key belongs to org `HF5DaJQamZxIeMj0zfWY`. It must not access the test org's (`l0gM8nHm2o2lpupMpm5x`) instance skills.

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about not found or forbidden.

**Why**: Confirms organization-level data isolation. A valid key from org B cannot access org A's process instance skills, even though both exist in the same Firestore database.

---

## [N] Invalid API key

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key_here" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about unauthorized.

**Why**: Verifies the auth middleware rejects invalid keys before reaching the business logic.

---

## [P] `--api-url` flag overrides endpoint

```bash
codika get skills 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-url "https://invalid.example.com" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, `success: false`, error about network failure or fetch error. The request goes to the wrong URL and fails.

**Why**: Verifies the `--api-url` flag is actually used to construct the request URL. If the flag were ignored, the request would succeed against the production endpoint.

---

## Cleanup

After running all tests, remove any leftover temporary directories:

```bash
rm -rf /tmp/cli-test-skills-default \
       /tmp/cli-test-skills-hr \
       /tmp/cli-test-custom-skills \
       /tmp/cli-test-skills-content \
       /tmp/cli-test-skills-path \
       /tmp/cli-test-skills-projfile \
       /tmp/cli-test-skills-cwd \
       /tmp/cli-test-skills-priority
```

---

## Last tested

Not yet tested.
