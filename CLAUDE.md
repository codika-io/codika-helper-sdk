# Codika Helper SDK

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
      project/
        index.ts          # Parent project command
        create.ts         # Create projects via API key (saves organizationId)
      verify/
        index.ts          # Parent verify command
        use-case.ts       # Validate entire use-case folders
        workflow.ts       # Validate single workflow files
      init.ts             # Scaffold a new use case folder
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
    data-ingestion-deployer.ts    # High-level data ingestion deployer
    project-client.ts             # Low-level project creation HTTP client
    project-json.ts               # Read/write project.json (projectId, organizationId)
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
codika-helper login                                    # interactive prompt
codika-helper login --api-key <key>                    # non-interactive / CI
codika-helper login --api-key <key> --name my-profile  # custom profile name

# Identity & profile management
codika-helper whoami                    # show current identity (org, key, scopes)
codika-helper whoami --json             # machine-readable output
codika-helper use                       # list all profiles
codika-helper use <profile-name>        # switch active profile
codika-helper logout                    # remove active profile
codika-helper logout <profile-name>     # remove specific profile

# Configuration
codika-helper config show               # show all profiles
codika-helper config clear              # clear everything
codika-helper config clear --profile <name>  # clear one profile

# Scaffold a new use case
codika-helper init <path> [--name <name>] [--description <desc>] [--icon <icon>] [--no-project] [--project-id <id>] [--json]

# Deploy a use case
codika-helper deploy use-case <path> [--project-id <id>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Deploy process-level data ingestion
codika-helper deploy process-data-ingestion <path> [--project-id <id>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Validate a use-case folder
codika-helper verify use-case <path> [--json] [--fix] [--strict]

# Create a project via API key (--path writes project.json with projectId + organizationId)
codika-helper project create --name "My Project" [--path <dir>] [--api-url <url>] [--api-key <key>] [--organization-id <id>] [--json]

# Validate a single workflow
codika-helper verify workflow <path> [--json] [--fix]
```

### Authentication Resolution

API key and base URL are resolved with this priority chain:

1. `--api-key` / `--api-url` flag (highest)
2. Environment variable (`CODIKA_API_KEY`, `CODIKA_BASE_URL`, or per-endpoint vars like `CODIKA_API_URL`)
3. Active profile in config file (`~/.config/codika-helper/config.json`)
4. Production default (base URL only)

For deploy commands, if `project.json` contains an `organizationId`, the CLI auto-selects the profile matching that organization — even if a different profile is active.

Run `codika-helper login` to save credentials. Env-var workflows (CI/CD) are unaffected.

### Project ID Resolution

The project ID (deployment target) is resolved with this priority chain:

1. `--project-id` flag (highest)
2. `project.json` file in the use case folder (`{"projectId": "...", "organizationId": "..."}`)

Use `codika-helper project create --name "..." --path ./my-use-case` to create a project and write `project.json` automatically (includes `organizationId` from active profile).

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

When testing CLI commands via the Bash tool (Claude Code), commands that exit with a non-zero code will appear to print their output twice. This is a Bash tool display artifact — it shows stdout once in the main block and again in the error block. The actual command output is correct (single print). Verify by redirecting to a file: `codika-helper whoami > /tmp/out.txt 2>&1; cat /tmp/out.txt`.

## Key Files

- `src/cli/commands/verify/use-case.ts` - Use-case validation command with JSON output
- `src/validation/runner.ts` - Validation execution engine
- `src/validation/rules/` - Individual validation rules
