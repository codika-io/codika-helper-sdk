# Skipped Tests — Tracker

41 tests are currently skipped across the suite. This file documents each skip, why it exists, and what's needed to fix it.

Last updated: 2026-04-04 (v3 test run, 662/703 pass, 0 fail, 41 skip)

---

## Category 1: Missing test fixtures (21 skips)

These tests need files or resources that don't exist in the test directory yet. All are automatable: create the files once, commit them, tests run forever.

### deploy-data-ingestion.md (11 skips)

Tests copy the use case folder to `/tmp/` for isolation, but the copy doesn't include `node_modules/`. The config.ts file needs `node_modules` to resolve imports, so the command crashes.

| Test | What it tests | Fix |
|------|--------------|-----|
| #4 | --minor version strategy | Symlink `node_modules` into temp dir |
| #5 | --major version strategy | Same |
| #6 | --target-version explicit | Same |
| #8 | --project-file override | Same + create `project-staging.json` fixture |
| #10 | Org-aware profile auto-selection | Same |
| #11 | dataIngestionDeployments map deep-merges | Same |
| #12 | version.json created from scratch | Same |
| #17 | Missing data-ingestion/ folder | Same |
| #18 | No workflow JSON in data-ingestion/ | Same |
| #19 | Multiple workflow JSONs in data-ingestion/ | Same |
| #20 | No project ID found | Same |

**Fix**: Change the temp dir setup in each test from `cp -r` to a script that copies the folder and symlinks `node_modules`:
```bash
cp -r <use-case> /tmp/test-copy
ln -s $(realpath <use-case>/node_modules) /tmp/test-copy/node_modules
```
Or better: add a shared helper at the top of the playbook.

### deploy-use-case.md (10 skips)

| Test | What it tests | Fix |
|------|--------------|-----|
| #4 | --project-file override | Create `project-staging.json` in test use case with a different projectId |
| #14 | --additional-file single file | Create a test file (e.g., `test-extra.md`) in the test dir |
| #15 | --additional-file multiple files | Same, two files |
| #16 | --additional-file relative path | Same |
| #20 | Missing project ID (no project.json, no flag) | Create a use case fixture with config.ts but no project.json |
| #28 | --dry-run with failing validation | Create a fixture with valid config but intentionally broken workflow |
| #33 | Scope enforcement (key without deploy:use-case) | Create `cli-test-read-only` profile with only `projects:read` |
| #9 | --target-version explicit | Run with `--target-version` (was skipped to avoid accumulating versions, but could use --dry-run) |
| #4 (dup check) | --project-file reads from specified file | Create `project-staging.json` |
| (varies) | Other fixture gaps | Create missing test files |

**Fix**: Create these files in the test use case directory:
- `project-staging.json` — `{"projectId": "<different-id>", "organizationId": "l0gM8nHm2o2lpupMpm5x"}`
- `test-extra.md` — any markdown content
- `test-extra-2.md` — any markdown content
- A `broken-workflow-fixture/` directory with valid config.ts but invalid workflow JSON

---

## Category 2: Missing test profiles/resources (5 skips)

| Playbook | Test | What's missing | Fix |
|----------|------|---------------|-----|
| redeploy.md | #16 | `--project-file` fixture | Create `project-staging.json` (same as above) |
| redeploy.md | #31 | Key without `deploy:use-case` scope | Create `cli-test-read-only` key with only `projects:read` scope |
| trigger.md | #11 | `--project-file` fixture | Create `project-staging.json` |
| trigger.md | #12 | Payload display truncation (human-readable) | Run the test manually and update expectation |
| list-executions.md | #9 | No failed execution exists in test instance | Trigger a workflow with bad payload to create a failed execution |

**Fix**: 
1. Create `project-staging.json` in test use case folders (covers 3 skips)
2. Create a `cli-test-read-only` key:
```bash
codika organization create-key \
  --organization-id GuXOipBEJdgGmKkxujbR \
  --name "cli-test-read-only" \
  --scopes "projects:read" \
  --profile cli-test-owner-full-v2
```
3. Trigger a bad execution:
```bash
codika trigger <invalid-workflow-id> --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

---

## Category 3: Destructive tests (5 skips)

These tests need an empty config file (no profiles), which means wiping `~/.config/codika/config.json`. Running them would destroy all test profiles.

| Playbook | Test | What it tests |
|----------|------|--------------|
| config.md | #4 | `config show` with no profiles |
| config.md | #27 | `config clear` (wipe everything) |
| auth.md | #20 | `codika use` with no profiles |
| auth.md | #26 | `codika logout` with no profiles |
| auth.md | #27 | `codika logout` with no active profile |

**Fix options**:
1. **Best**: Add `CODIKA_CONFIG_DIR` env var support to the CLI, so tests can point to an empty temp config:
   ```bash
   CODIKA_CONFIG_DIR=/tmp/empty-config codika config show
   ```
2. **Acceptable**: Run these last, back up config, run tests, restore. Fragile but works.
3. **Minimal**: Accept as permanently skipped. They test rare edge cases.

---

## Category 4: Untriggerable edge cases (3 skips)

These test hypothetical error paths that can't be reliably triggered against a real API.

| Playbook | Test | Why untriggerable |
|----------|------|-------------------|
| publish.md | #26 | "Unexpected API response" — can't make the server return malformed JSON |
| organization-create-key.md | (varies) | "Unexpected API response" — same |
| get-instance.md | #13 | Extracts raw API key from `config show --json` — config show doesn't expose full keys |

**Fix**: Leave as-is. These are defense-in-depth code paths. Unit tests are more appropriate for testing JSON parse error handlers.

---

## Summary

| Category | Skips | Effort to fix | Priority |
|----------|-------|--------------|----------|
| Missing fixtures | 21 | ~30 min (create files + symlinks) | High |
| Missing profiles/resources | 5 | ~15 min (CLI commands) | High |
| Destructive tests | 5 | ~2 hours (add CODIKA_CONFIG_DIR) or skip | Medium |
| Untriggerable edge cases | 3 | Leave as-is | Low |
| **Total** | **41** | | |

**Quick win**: Fixing categories 1+2 (26 skips) takes ~45 minutes and is pure setup work, no code changes needed.
