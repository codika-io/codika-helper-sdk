# Codika SDK

CLI tool for deploying and validating Codika use cases.

## Project Structure

```
src/
  cli/                    # CLI commands
    commands/
      config/
        index.ts          # Parent config command
        set.ts            # Save API key + base URL (also used by login alias)
        show.ts           # Display current configuration (multi-profile)
        clear.ts          # Remove saved configuration (supports --profile)
      deploy/
        index.ts          # Parent deploy command
        use-case.ts       # Deploy use cases (org-aware key selection)
        process-data-ingestion.ts  # Deploy process-level data ingestion
        documents.ts      # Deploy use case documents (stage markdown files)
      project/
        index.ts          # Parent project command
        create.ts         # Create projects via API key (saves organizationId)
      verify/
        index.ts          # Parent verify command
        use-case.ts       # Validate entire use-case folders
        workflow.ts       # Validate single workflow files
      organization/
        index.ts          # Parent organization command
        create.ts         # Create organizations via API key
        update-key.ts     # Update organization API key scopes/name/description
        create-key.ts     # Create organization API keys via personal/admin key
      integration/
        index.ts          # Parent integration command
        set.ts            # Create or update an integration (encrypt + POST)
        list.ts           # List integrations and connection status
        delete.ts         # Delete an integration (two-phase confirmation)
      init.ts             # Scaffold a new use case folder
      rerun/
        index.ts          # Parent rerun command
        deployment.ts     # Rerun an existing deployment with refreshed credentials and parameter overrides
      whoami.ts           # Show current authenticated identity
      use.ts              # Switch active profile or list profiles
      logout.ts           # Remove a profile
    templates/
      slug.ts             # Name-to-slug utility
      config-template.ts  # config.ts generator
      workflow-templates.ts  # Workflow JSON generators (HTTP, schedule, subworkflow)
  utils/
    config.ts                     # Multi-profile config, resolution chains, profile CRUD
    deploy-client.ts              # Low-level process deployment HTTP client
    use-case-deployer.ts          # High-level use case deployer
    data-ingestion-deploy-client.ts  # Low-level data ingestion deployment HTTP client
    data-ingestion-deployer.ts    # High-level data ingestion deployer (auto-discovers from data-ingestion/ folder)
    document-deploy-client.ts     # Low-level document deployment HTTP client
    organization-client.ts          # Low-level organization creation HTTP client
    org-api-key-client.ts           # Low-level organization API key creation HTTP client
    project-client.ts             # Low-level project creation HTTP client
    redeploy-client.ts              # Low-level redeploy HTTP client
    integration-client.ts           # Low-level integration management HTTP client (set, list, delete)
    encryption.ts                   # RSA-OAEP + AES-GCM encryption for integration secrets
    project-json.ts               # Read/write project.json (projectId, organizationId, dataIngestionDeployments)
  data/
    integration-fields.ts          # Static registry of all 42+ integration field definitions
  validation/             # Validation rules and runner
scripts/
  toggle-cli.sh           # Toggle between local dev and npm versions
```

## Development Workflow

### Toggle Script

Use `scripts/toggle-cli.sh` to switch between local development and published npm versions:

```bash
# Switch to local development version (builds and links)
./scripts/toggle-cli.sh local

# Rebuild after making changes
./scripts/toggle-cli.sh rebuild

# Check current status
./scripts/toggle-cli.sh status

# Switch back to published npm version
./scripts/toggle-cli.sh public
```

**Project management:**
```bash
# Add a project to auto-link when switching to local
./scripts/toggle-cli.sh add ../my-project

# Remove a project from auto-link list
./scripts/toggle-cli.sh remove ../my-project
```

The script automatically detects sibling projects (like `codika-processes-lib`) in the parent directory.

### Build

```bash
npm run build
```

### CLI Usage

```bash
# Authentication — login saves a named profile with full metadata
codika login                                    # interactive prompt
codika login --api-key <key>                    # non-interactive / CI
codika login --api-key <key> --name my-profile  # custom profile name

# Identity & profile management
codika whoami                    # show current identity (org, key, scopes)
codika whoami --json             # machine-readable output
codika use                       # list all profiles
codika use <profile-name>        # switch active profile
codika logout                    # remove active profile
codika logout <profile-name>     # remove specific profile

# Configuration
codika config show               # show all profiles
codika config clear              # clear everything
codika config clear --profile <name>  # clear one profile

# Scaffold a new use case
codika init <path> [--name <name>] [--description <desc>] [--icon <icon>] [--no-project] [--project-id <id>] [--project-file <path>] [--no-install] [--json]

# Deploy a use case
codika deploy use-case <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--patch|--minor|--major|--target-version <version>] [--profile <name>] [--json] [--dry-run]

# Deploy process-level data ingestion
codika deploy process-data-ingestion <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--patch|--minor|--major|--target-version <version>] [--profile <name>] [--json]

# Deploy use case documents (stage markdown files)
codika deploy documents <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--json]

# Fetch a deployed use case (includes data ingestion by default)
codika get use-case <projectId> [outputPath] [--target-version <X.Y>] [--di-version <X.Y>] [--no-data-ingestion] [--list] [--json]

# Validate a use-case folder
codika verify use-case <path> [--json] [--fix] [--strict]

# Create a project via API key (--path writes project.json with projectId + organizationId)
codika project create --name "My Project" [--path <dir>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--organization-id <id>] [--json]

# Create an organization via API key (requires organizations:create scope)
codika organization create --name "My Org" [--description <desc>] [--size <size>] [--logo <path>] [--n8n-base-url <url>] [--n8n-api-key <key>] [--store-credential-copy] [--api-key <key>] [--json]

# Create an organization API key (requires api-keys:manage scope, personal/admin key only)
codika organization create-key --organization-id <id> --name <name> --scopes <scopes> [--description <desc>] [--expires-in-days <days>] [--api-key <key>] [--json]

# Update an organization API key's scopes, name, or description
codika organization update-key --key-id <id> [--scopes <scopes>] [--name <name>] [--description <desc>] [--api-key <key>] [--json]

# List projects in the organization
codika list projects [--archived] [--limit <n>] [--api-key <key>] [--json]

# Get project details
codika get project <projectId> [--api-key <key>] [--json]

# Get instance with expanded workflow details
codika get instance [processInstanceId] [--workflows] [--environment <env>] [--api-key <key>] [--json]

# Rerun an existing deployment with refreshed credentials and parameter overrides
codika rerun deployment [--process-instance-id <id>] [--path <path>] [--project-file <path>] [--environment <dev|prod>] [--param <KEY=VALUE>]... [--params <json>] [--params-file <path>] [--force] [--api-url <url>] [--api-key <key>] [--json]

# Validate a single workflow
codika verify workflow <path> [--json] [--fix]

# Manage integrations (requires integrations:manage scope)
codika integration set openai --secret OPENAI_API_KEY=sk-xxx [--json]
codika integration set supabase --path . --secret SUPABASE_HOST=https://xxx.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJ...
codika integration list [--context-type organization|process_instance] [--path <path>] [--json]
codika integration delete openai [--confirm] [--json]
```

### Authentication Resolution

API key and base URL are resolved with this priority chain:

1. `--api-key` / `--api-url` flag (highest)
2. Environment variable (`CODIKA_API_KEY`, `CODIKA_BASE_URL`, or per-endpoint vars like `CODIKA_API_URL`)
3. Active profile in config file (`~/.config/codika/config.json`)
4. Production default (base URL only)

For deploy commands, if `project.json` contains an `organizationId`, the CLI auto-selects the profile matching that organization — even if a different profile is active.

Run `codika login` to save credentials. Env-var workflows (CI/CD) are unaffected.

### Project ID Resolution

The project ID (deployment target) is resolved with this priority chain:

1. `--project-id` flag (highest)
2. `--project-file` flag — reads from the specified file instead of `project.json`
3. `project.json` file in the use case folder (`{"projectId": "...", "organizationId": "..."}`)

Use `--project-file` to target different projects from the same use case folder (e.g., `--project-file project-client-a.json`).

Use `codika project create --name "..." --path ./my-use-case` to create a project and write `project.json` automatically (includes `organizationId` from active profile). Add `--project-file <name>` to write to a custom filename.

## Development Guidelines

### Adding New Validation Rules

**Always use test-driven development (TDD):**

1. **Write the test first** - Create test cases in the appropriate test file before implementing the rule
2. **Implement the feature** - Write the validation rule to make the tests pass
3. **Refactor** - Clean up the implementation while keeping tests green

This approach ensures:
- Rules are well-tested from the start
- Edge cases are considered upfront
- The rule's behavior is documented through tests

## Testing Notes

When testing CLI commands via the Bash tool (Claude Code), commands that exit with a non-zero code will appear to print their output twice. This is a Bash tool display artifact — it shows stdout once in the main block and again in the error block. The actual command output is correct (single print). Verify by redirecting to a file: `codika whoami > /tmp/out.txt 2>&1; cat /tmp/out.txt`.

## Releases (automated via GitHub Actions)

Publishing `codika` to npm is fully automated. **Never run `npm publish` manually** — tag the version and let CI do it.

`codika` is a dual package: it ships both the library exports (`.` and `./validation`) and the `codika` CLI binary. A single `npm publish` ships both — no separate handling needed.

### Flow

```bash
# 1. Make sure main is clean and green locally
npm test && npm run build

# 2. Bump the version (commits the change + creates the git tag in one shot)
npm version patch    # 3.5.0 → 3.5.1   (bug fix)
npm version minor    # 3.5.0 → 3.6.0   (new feature, backward-compatible)
npm version major    # 3.5.0 → 4.0.0   (breaking)

# 3. Push the commit and the tag — the tag is what triggers the publish
git push origin master --follow-tags
```

### What each workflow does

- **`.github/workflows/ci.yml`** — runs on every push to `master` and every PR. Installs deps, runs `npm test`, runs `npm run build`, executes the built CLI binary with `--help` as a smoke test. Matrix'd across Node 20 and 22.
- **`.github/workflows/publish.yml`** — runs on tag pushes matching `v*.*.*`. Before publishing it (a) verifies the tag matches `package.json#version`, (b) re-runs tests, (c) re-runs the build, then publishes with `--access public --provenance` so the package carries a signed attestation from GitHub Actions.

### Prerequisites

- `NPM_TOKEN` secret configured on the `codika-io/codika-helper-sdk` GitHub repo — must be an **automation token** (classic type), NOT a granular access token, so it bypasses npm's 2FA OTP prompt at publish time. The token's npm account must have publish rights on the `codika` package.
- Regenerate it via https://www.npmjs.com/settings/~/tokens/new → "Classic Token" → "Automation".

### Troubleshooting

| Symptom | Likely cause |
|---|---|
| `EOTP: This operation requires a one-time password` | `NPM_TOKEN` is a granular/publish token; replace with an automation token. |
| `Tag vX.Y.Z does not match package.json version` | You tagged without running `npm version`. Delete the tag (`git tag -d vX.Y.Z && git push --delete origin vX.Y.Z`), run `npm version`, re-push. |
| Publish succeeds but `npm view codika version` is stale | CDN propagation; usually resolves in 30s. |

### What NOT to do

- **Don't** bump the version by hand-editing `package.json` and then tagging — `npm version` does both atomically and protects against mismatch.
- **Don't** push a tag that points at a commit that isn't on `master`. The workflow doesn't enforce this; if you do it accidentally, delete the tag before the workflow completes.
- **Don't** run `npm publish` locally to "fix" a failed CI publish — fix the CI or rotate the token instead, so the npm registry's source of truth stays GitHub Actions.

## Key Files

- `src/cli/commands/verify/use-case.ts` - Use-case validation command with JSON output
- `src/validation/runner.ts` - Validation execution engine
- `src/validation/rules/` - Individual validation rules
