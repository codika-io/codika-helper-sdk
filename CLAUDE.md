# Codika Helper SDK

CLI tool for deploying and validating Codika use cases.

## Project Structure

```
src/
  cli/                    # CLI commands
    commands/
      deploy/
        index.ts          # Parent deploy command
        use-case.ts       # Deploy use cases to Codika platform
        process-data-ingestion.ts  # Deploy process-level data ingestion
      verify/
        index.ts          # Parent verify command
        use-case.ts       # Validate entire use-case folders
        workflow.ts       # Validate single workflow files
  utils/
    deploy-client.ts              # Low-level process deployment HTTP client
    use-case-deployer.ts          # High-level use case deployer
    data-ingestion-deploy-client.ts  # Low-level data ingestion deployment HTTP client
    data-ingestion-deployer.ts    # High-level data ingestion deployer
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
# Deploy a use case
codika-helper deploy use-case <path> [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Deploy process-level data ingestion
codika-helper deploy process-data-ingestion <path> [--api-url <url>] [--api-key <key>] [--version-strategy <strategy>] [--json]

# Validate a use-case folder
codika-helper verify use-case <path> [--json] [--fix] [--strict]

# Validate a single workflow
codika-helper verify workflow <path> [--json] [--fix]
```

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
