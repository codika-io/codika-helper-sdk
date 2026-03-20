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
      integration/
        index.ts          # Parent integration command
        set.ts            # Create or update an integration (encrypt + POST)
        list.ts           # List integrations and connection status
        delete.ts         # Delete an integration (two-phase confirmation)
      init.ts             # Scaffold a new use case folder
      redeploy.ts         # Redeploy a deployment instance with parameter overrides
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
codika deploy use-case <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Deploy process-level data ingestion
codika deploy process-data-ingestion <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Deploy use case documents (stage markdown files)
codika deploy documents <path> [--project-id <id>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--json]

# Fetch a deployed use case (includes data ingestion by default)
codika get use-case <projectId> [outputPath] [--version <X.Y>] [--di-version <X.Y>] [--no-data-ingestion] [--list] [--json]

# Validate a use-case folder
codika verify use-case <path> [--json] [--fix] [--strict]

# Create a project via API key (--path writes project.json with projectId + organizationId)
codika project create --name "My Project" [--path <dir>] [--project-file <path>] [--api-url <url>] [--api-key <key>] [--organization-id <id>] [--json]

# Redeploy a deployment instance with parameter overrides
codika redeploy [--process-instance-id <id>] [--path <path>] [--project-file <path>] [--environment <dev|prod>] [--param <KEY=VALUE>]... [--params <json>] [--params-file <path>] [--force] [--api-url <url>] [--api-key <key>] [--json]

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

## Key Files

- `src/cli/commands/verify/use-case.ts` - Use-case validation command with JSON output
- `src/validation/runner.ts` - Validation execution engine
- `src/validation/rules/` - Individual validation rules
