# CLI Improvement Opportunities

Discovered during the 2026-04-04 test run. Items marked **(done)** were implemented alongside bug fixes.

## Implemented

- **`config show --json`** — Added `--json` flag so agents can extract profile data programmatically instead of parsing the config file directly. **(done — A8)**
- **`update-key --scopes ""` validation** — Now catches empty string explicitly instead of falling through to the wrong error guard. **(done — A9)**

## Deferred

### `--no-profile` flag for auth-bypass testing
Several tests need to verify "what happens with no API key?" but the active profile always provides auth. Currently requires `--profile nonexistent-profile-name` as a workaround. A `--no-profile` flag would make this explicit and less hacky.

### Exit code 2 for `verify` with bad paths
`codika verify use-case /nonexistent` exits 1 (same as "violations found"). Could use exit 2 for "path doesn't exist" to distinguish CLI validation errors from verification results. Would be consistent with every other command's exit code convention.

### `get use-case --target-version` for nonexistent versions
Currently returns `success: true` with empty documents array. Could return 404 or add a warning when the requested version doesn't exist. Debatable — empty result is valid REST semantics, but confusing UX.
