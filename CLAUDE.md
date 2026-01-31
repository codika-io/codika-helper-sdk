# Codika Helper SDK

CLI tool for deploying and validating Codika use cases.

## Project Structure

```
src/
  cli/                    # CLI commands
    commands/
      deploy.ts           # Deploy use cases to Codika platform
      verify/
        use-case.ts       # Validate entire use-case folders
        workflow.ts       # Validate single workflow files
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
# Validate a use-case folder
codika-helper verify use-case <path> [--json] [--fix] [--strict]

# Validate a single workflow
codika-helper verify workflow <path> [--json] [--fix]

# Deploy a use case
codika-helper deploy <path>
```

## Key Files

- `src/cli/commands/verify/use-case.ts` - Use-case validation command with JSON output
- `src/validation/runner.ts` - Validation execution engine
- `src/validation/rules/` - Individual validation rules
