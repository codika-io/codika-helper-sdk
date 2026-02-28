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
        show.ts           # Display current configuration
        clear.ts          # Remove saved configuration
      deploy/
        index.ts          # Parent deploy command
        use-case.ts       # Deploy use cases to Codika platform
        process-data-ingestion.ts  # Deploy process-level data ingestion
      project/
        index.ts          # Parent project command
        create.ts         # Create projects via API key
      verify/
        index.ts          # Parent verify command
        use-case.ts       # Validate entire use-case folders
        workflow.ts       # Validate single workflow files
  utils/
    config.ts                     # Persistent config (API key, base URL) with resolution chains
    deploy-client.ts              # Low-level process deployment HTTP client
    use-case-deployer.ts          # High-level use case deployer
    data-ingestion-deploy-client.ts  # Low-level data ingestion deployment HTTP client
    data-ingestion-deployer.ts    # High-level data ingestion deployer
    project-client.ts             # Low-level project creation HTTP client
    project-json.ts               # Read/write project.json, resolve project ID
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
# Authentication — save API key once (interactive prompt)
codika-helper login
codika-helper login --api-key <key> --base-url <url>   # non-interactive / CI

# Show current config (masked key, base URL, source)
codika-helper config show

# Clear saved config
codika-helper config clear

# Deploy a use case
codika-helper deploy use-case <path> [--project-id <id>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Deploy process-level data ingestion
codika-helper deploy process-data-ingestion <path> [--project-id <id>] [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Validate a use-case folder
codika-helper verify use-case <path> [--json] [--fix] [--strict]

# Create a project via API key (--path writes project.json into the use case folder)
codika-helper project create --name "My Project" [--path <dir>] [--api-url <url>] [--api-key <key>] [--organization-id <id>] [--json]

# Validate a single workflow
codika-helper verify workflow <path> [--json] [--fix]
```

### Authentication Resolution

API key and base URL are resolved with this priority chain:

1. `--api-key` / `--api-url` flag (highest)
2. Environment variable (`CODIKA_API_KEY`, `CODIKA_BASE_URL`, or per-endpoint vars like `CODIKA_API_URL`)
3. Config file (`~/.config/codika-helper/config.json`)
4. Production default (base URL only)

Run `codika-helper login` to save credentials to the config file. Existing env-var workflows are unaffected.

### Project ID Resolution

The project ID (deployment target) is resolved with this priority chain:

1. `--project-id` flag (highest)
2. `project.json` file in the use case folder (`{"projectId": "..."}`)
3. `PROJECT_ID` export in `config.ts` (backward compatibility)

Use `codika-helper project create --name "..." --path ./my-use-case` to create a project and write `project.json` automatically. Existing use cases that export `PROJECT_ID` from `config.ts` continue to work unchanged.

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

## Key Files

- `src/cli/commands/verify/use-case.ts` - Use-case validation command with JSON output
- `src/validation/runner.ts` - Validation execution engine
- `src/validation/rules/` - Individual validation rules
