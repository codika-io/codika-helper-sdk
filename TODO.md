# codika CLI — Future Improvements

## 1. `codika status` — Context-aware overview command

### What it does

A single command that answers "where am I and what will happen if I deploy?" by combining identity info with local directory context. Think of it as `git status` for Codika.

### Example output

```
Codika Status

  Identity:
    Profile:       propale-ai-3
    Organization:  Propale AI 3 (DyqqOZZgCM42s2FmAmzp)
    Key:           cko_q0Ws...

  Use Case:  ./use-cases/marketplace/email-responder
    Project ID:     sk8I3e6JQHTw5ptcHz6q  (from project.json)
    Organization:   Propale AI 3           (matches active profile)
    Local version:  1.2.3                  (from version.json)
    Workflows:      3 files in workflows/
    Validation:     passing                (last verify: 2 min ago)

  Ready to deploy: codika deploy use-case .
```

When there's a mismatch (e.g., project.json has a different org than the active profile), it should warn clearly:

```
  Organization:   Other Org Inc           ! will use profile "other-org" (org mismatch)
```

### Analysis

**Files to read:**
- `src/utils/config.ts` — `getActiveProfile()`, `findProfileByOrgId()`
- `src/utils/project-json.ts` — `readProjectJson()`
- `src/utils/version-manager.ts` — `readVersion()`
- `src/cli/commands/whoami.ts` — reuse the identity display logic

**Implementation approach:**
- New file `src/cli/commands/status.ts`
- Register in `src/cli/index.ts`
- Accept optional `[path]` argument (defaults to `.`)
- Read project.json, version.json, list workflows/ directory
- Cross-reference project.json `organizationId` with profiles
- Optionally run a quick `verify use-case` check (behind a `--verify` flag to avoid slowness by default)

**Complexity:** Low-medium. Mostly composing existing utilities into a formatted output. No new APIs or config changes needed.

---

## 2. Profile expiry warnings

### What it does

When the active profile's API key is nearing expiration (< 7 days) or already expired, show a warning banner on every command — not just `whoami`. This prevents surprise auth failures during deployments.

### Example output

```
⚠ API key "propale-ai-3" expires in 3 days (2026-03-04). Run 'codika login' to refresh.

Deploying use case...
✓ Deployment Successful
  ...
```

For already-expired keys:

```
⚠ API key "propale-ai-3" expired on 2026-02-28. Run 'codika login' to replace it.
```

### Analysis

**Files to modify:**
- `src/utils/config.ts` — add a `checkActiveProfileExpiry()` function that returns `null | { daysLeft: number; expiresAt: string; expired: boolean }`
- Every command that calls `resolveApiKey()` should also call the expiry check and print the warning

**Implementation approach:**

Option A (simple): Add a helper function `warnIfExpiring()` that commands call at the top of their action. This is explicit but requires touching every command file.

Option B (cleaner): Create a Commander hook/middleware that runs before any action. Commander doesn't have built-in middleware, but you can use `program.hook('preAction', ...)` (available since Commander v9). This would be a single hook in `src/cli/index.ts` that checks expiry once, before any subcommand runs.

Recommend **Option B** — single point of change, applies to all commands automatically.

**Edge cases:**
- `expiresAt` is null (key never expires) — skip the check
- The check is purely local (reads `expiresAt` from the stored profile data). No API call.
- The warning goes to stderr so it doesn't pollute `--json` output

**Complexity:** Low. The expiry data is already stored in profiles. Just need the check + warning logic.

---

## 3. Tab completion (bash/zsh/fish)

### What it does

Enable shell tab completion for commands, subcommands, options, and dynamic values like profile names.

```bash
codika de<TAB>          → codika deploy
codika deploy u<TAB>    → codika deploy use-case
codika use <TAB>        → propale-ai-3  admin  other-org
codika deploy use-case ./use-cases/m<TAB>  → ./use-cases/marketplace/
```

### Analysis

**Commander v12.1.0 does NOT have native completion support.** This is a known gap (GitHub issue #2008, open since 2015).

**Third-party options:**

| Library | Recommendation | Shell support |
|---------|---------------|---------------|
| `@gutenye/commander-completion-carapace` | Best option — modern, multi-shell | bash, zsh, fish, nushell |
| `@naerth/commander-autocomplete` | Simpler, bash-focused | bash |
| Custom generation script | Most control, more work | any |

**Recommended approach:**

Add a `codika completion` command with two modes:

```bash
# Manual: output the completion script to stdout
codika completion bash >> ~/.bashrc
codika completion zsh >> ~/.zshrc
codika completion fish > ~/.config/fish/completions/codika.fish

# Automatic: detect shell, check for duplicates, append, and report
codika completion --install
```

**`--install` flag behavior:**

1. Detect the user's shell from `$SHELL` (fallback: check if `.zshrc`/`.bashrc` exists)
2. Determine the target file (`~/.zshrc` for zsh, `~/.bashrc` for bash, `~/.config/fish/completions/codika.fish` for fish)
3. Read the target file and check if the completion line is already present (grep for `codika`)
4. If already installed → print "Completions already installed in ~/.zshrc" and exit 0
5. If not installed → append the completion script with a comment marker (`# codika completion — added by codika completion --install`)
6. Print: "✓ Completions installed in ~/.zshrc. Restart your terminal or run: source ~/.zshrc"

**`--uninstall` flag:** Remove the completion block (everything between the comment markers). Clean uninstall.

**What needs completion:**
1. **Static:** command names (`deploy`, `verify`, `config`, `login`, `whoami`, `use`, `logout`), subcommands (`use-case`, `workflow`, `set`, `show`, `clear`), option flags (`--json`, `--api-key`, `--fix`, etc.)
2. **Dynamic:** profile names for `use <TAB>` and `logout <TAB>` — requires calling `listProfiles()` at completion time
3. **File paths:** for `<path>` arguments — default shell completion handles this

**Files to create:**
- `src/cli/commands/completion.ts` — generates shell-specific completion scripts
- Register in `src/cli/index.ts`

**Alternative (simpler):** Generate a static completion script at build time from the Commander command tree, without a runtime dependency. Walk `program.commands` recursively and emit a bash/zsh completion function.

**Complexity:** Medium. The static part is straightforward. Dynamic profile name completion requires the completion script to invoke `codika use --list-names` (a hidden subcommand that prints profile names one per line).

---

## 4. `codika init` — Interactive use case scaffolding

### What it does

Interactively creates a complete use case folder structure with config.ts, workflows, project.json, and version.json. Asks a few questions and generates a ready-to-verify, ready-to-deploy use case.

### Interactive flow

```
$ codika init ./my-use-case

Creating a new use case...

  Project name: My Translation Service
  Description: Translates text between languages using AI
  Icon (Lucide name): Languages

  Workflows:
    1. HTTP-triggered workflow (always included)
    2. Add a scheduled workflow? (y/N): y
       Schedule: every Monday at 9am
    3. Add a sub-workflow? (y/N): y
       Sub-workflow name: text-processor

  Integrations:
    - anthropic (detected from LLM usage)

  Creating project on platform...
  ✓ Project created: abc123

  Scaffolding files:
    ✓ project.json        (projectId + organizationId)
    ✓ version.json        (1.0.0)
    ✓ config.ts           (3 workflows configured)
    ✓ workflows/translate.json           (HTTP trigger)
    ✓ workflows/weekly-report.json       (schedule trigger)
    ✓ workflows/text-processor.json      (sub-workflow)

  ✓ Done! Next steps:
    1. Edit the workflow JSON files with your business logic
    2. Run: codika verify use-case ./my-use-case
    3. Run: codika deploy use-case ./my-use-case
```

### Default template: "Simple Translator" variant

The default scaffolded use case should be a practical, non-trivial example that demonstrates the key patterns. Based on the existing demos at:
- `codika-processes-lib/use-cases-demo/simple-translator`
- `codika-processes-lib/use-cases-demo/subworkflow-demo`

The template should produce a **translation use case** with three workflows:

1. **`translate.json`** — HTTP-triggered main workflow
   - Webhook trigger → Codika Init → LLM call (Anthropic, using `FLEXCRED` placeholder) → IF success → Submit Result / Report Error
   - Input schema: `{ text: string, target_language: string }`
   - Output schema: `{ translated_text: string }`
   - Uses `{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}` for credentials

2. **`weekly-report.json`** — Schedule-triggered workflow
   - Schedule trigger (once a week, e.g., Monday 9am) → Codika Init → Aggregate weekly translation stats → Submit Result / Report Error
   - Config uses `type: 'schedule'` trigger with `cronExpression`
   - Has a `manualTriggerUrl` for on-demand execution

3. **`text-processor.json`** — Sub-workflow (called by translate.json)
   - Starts with `executeWorkflowTrigger` (NOT HTTP webhook)
   - No Codika Init/Submit/Report nodes
   - Input: `{ text: string, instructions: string }`
   - Does text preprocessing (normalize, trim, detect language)
   - Referenced in parent via `{{SUBWKFL_text-processor_LFKWBUS}}`
   - Config uses `type: 'subworkflow'` trigger with `calledBy: ['translate']`
   - Cost: 0 (sub-workflows don't cost credits)

### Analysis

**Files to create:**
- `src/cli/commands/init.ts` — main init command with interactive prompts
- `src/cli/templates/` — directory with template files (config.ts template, workflow JSON templates)

**Files to reuse:**
- `src/utils/project-client.ts` — `createProject()` to auto-create the project
- `src/utils/project-json.ts` — `writeProjectJson()` to write project.json with organizationId
- `src/utils/config.ts` — `getActiveProfile()` to get organizationId for project.json

**Key patterns from the demos:**

The generated `config.ts` must follow the exact pattern from `simple-translator/config.ts`:
- Import `loadAndEncodeWorkflow`, `FormInputSchema`, `FormOutputSchema`, `HttpTrigger`, `ScheduleTrigger`, `SubworkflowTrigger` from SDK
- Export `WORKFLOW_FILES` array with paths to all workflow JSONs
- Export `getConfiguration()` returning `ProcessDeploymentConfigurationInput`
- Webhook URLs use the standard placeholder pattern: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/endpoint-name`
- Credentials use `{{FLEXCRED_ANTHROPIC_ID_DERCXELF}}` pattern

The generated workflow JSONs must follow mandatory patterns:
- Parent workflows: Webhook → Codika Init → Logic → IF → Submit Result / Report Error
- Sub-workflows: executeWorkflowTrigger → Logic → return data
- Settings must include `executionOrder: "v1"` and `errorWorkflow: "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"`
- Codika Init extracts `organizationId`, `userId`, `processInstanceId` from `$json.body.executionMetadata.*`

**Complexity:** Medium-high. The templates need to produce valid, deployable use cases. The interactive prompts are straightforward (Commander's `createInterface` or a library like `inquirer`). The main challenge is generating correct workflow JSON with proper node connections, positions, and placeholder usage.

**Recommendation:** Start with a non-interactive version (`codika init ./path --name "My Project"`) that always generates the full 3-workflow template. Add interactivity later.

---

## 5. `codika deploy use-case --dry-run` — Deployment preview

### What it does

Validates, resolves everything, and shows exactly what *would* be deployed — without calling the API. Useful for verifying configuration before a real deploy, especially in CI/CD pipelines.

### Example output

```
$ codika deploy use-case . --dry-run

Dry Run — No changes will be made

  Use case:       ./use-cases/marketplace/email-responder
  Project ID:     sk8I3e6JQHTw5ptcHz6q  (from project.json)
  Organization:   Propale AI 3           (profile: propale-ai-3)
  API endpoint:   https://api.codika.io/deployProcessUseCase

  Version:
    Current:      1.2.3
    After deploy: 1.2.4  (patch bump)
    API strategy: minor_bump

  Configuration:
    Title:        Email Auto-Responder
    Workflows:    3
    Tags:         [email, automation, ai]
    Integrations: [gmail, anthropic]

  Workflows:
    1. email-responder       HTTP trigger     24.3 KB
    2. weekly-digest         Schedule trigger  18.1 KB
    3. email-parser          Sub-workflow      12.7 KB

  Metadata documents: 6 files (config.ts + 3 workflows + 2 additional)

  Validation: ✓ passing (0 errors, 0 warnings)

  To deploy for real, remove --dry-run
```

### Analysis

**Files to modify:**
- `src/cli/commands/deploy/use-case.ts` — add `--dry-run` flag
- `src/utils/use-case-deployer.ts` — the `deployUseCaseFromFolder()` function already does most of the resolution (reads config.ts, resolves project ID, collects metadata docs, base64-encodes workflows) before making the HTTP call. The dry-run just needs to stop before the `deployProcess()` call and return the resolved data.

**Implementation approach:**

The `deployUseCaseFromFolder()` function currently:
1. Validates use case structure
2. Dynamically imports config.ts
3. Validates required exports
4. Resolves project ID
5. Collects metadata documents
6. Calls `deployProcess()` via HTTP → **this is the only step to skip**

For dry-run, either:
- Add a `dryRun: boolean` option to `DeployUseCaseOptions` that makes it return before step 6
- Or extract steps 1-5 into a `resolveUseCaseDeployment()` function that both dry-run and real deploy use

Recommend the second approach — it's cleaner and the resolution logic is reusable.

Also run `codika verify use-case <path>` as part of the dry-run to include validation results.

**What to display:**
- Resolved project ID + source (flag/project.json)
- Resolved API key source (which profile or env var)
- Organization name (from profile)
- Version bump calculation (current → new, which strategy)
- Workflow list with sizes
- Metadata document count
- Validation results (pass/fail with counts)

**The `--json` flag** should work with `--dry-run` too, outputting the resolved configuration as JSON — useful for CI/CD to inspect what would be deployed.

**Complexity:** Low-medium. Most of the logic already exists in the deployer. The main work is extracting the resolution steps, formatting the output, and adding the flag.
