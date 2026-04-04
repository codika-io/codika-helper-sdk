# `codika deploy use-case <path>`

Deploys a use case folder (config.ts + workflows/) to the Codika platform. Manages local version.json tracking, deployment archiving, and project.json updates. Supports dry-run mode, version strategy flags, and additional file attachments.

**Scope required**: `deploy:use-case`
**Method**: POST (body: use case configuration + base64-encoded workflows)
**Cloud Function**: `deployProcessUseCase`
**Exit codes**: 0 = success, 1 = API error or workflow-level failure, 2 = CLI validation error (`exitWithError`)

**Test use case path**: Use a known valid use case folder in the test org's project `h8iCqSgTjSsKySyufq36`. If no real use case folder is available, several tests validate CLI-side behavior (path validation, flag parsing, version validation) without hitting the API.

**Important**: After each successful deploy test that modifies `version.json`, note the version for context in subsequent tests. Deploy tests are stateful — each bump changes the version file. Consider resetting `version.json` between runs.

---

## [P] Happy path — deploy with JSON output

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, response contains `data.version` (string, e.g. `"1.3"`), `data.templateId` (string), `data.processInstanceId` (string), `data.deploymentStatus` (string, e.g. `"deployed"`). Exit code 0.

**Post-conditions**: `version.json` in the use case folder is bumped by patch (e.g. `1.0.0` -> `1.0.1`). `project.json` is updated with `devProcessInstanceId` matching `data.processInstanceId`, and `deployments` map contains an entry for the new API version with `templateId` and `createdAt`. A deployment archive is created under `deployments/{projectId}/process/{apiVersion}/`.

**Why**: Core happy path — verifies the full deploy pipeline: config parsing, workflow base64 encoding, API call, version bump, project.json update, and deployment archiving.

---

## [P] Human-readable output

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full
```

**Expect**: Output contains a success indicator, shows version, template ID, process instance ID, deployment status, and workflow summary. No JSON structure — formatted for human consumption. Exit code 0.

**Why**: Verifies the `formatSuccess` output path works end-to-end (not just the JSON path).

---

## [P] `--project-id` overrides project.json

```bash
codika deploy use-case /path/to/valid-use-case --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the deployment targets project `h8iCqSgTjSsKySyufq36` regardless of what `project.json` contains. The JSON output confirms the correct project was used.

**Why**: `--project-id` has highest priority in the resolution chain (`--project-id` > `--project-file` > `project.json`). Essential for deploying the same use case to multiple projects.

---

## [P] `--project-file` overrides default project.json

```bash
codika deploy use-case /path/to/valid-use-case --project-file project-test.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the deployment reads the project ID from `project-test.json` instead of the default `project.json`. The `project-test.json` file must exist in the use case folder and contain a valid `projectId`.

**Why**: Tests the middle tier of project ID resolution. Users use `--project-file` to target different clients from the same use case folder (e.g., `project-client-a.json`, `project-client-b.json`).

---

## [P] Default version strategy (patch)

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `version.json` is bumped by patch (e.g. `1.0.1` -> `1.0.2`). The API version strategy sent is `minor_bump` (the default API strategy for `--patch`).

**Why**: When no version flag is passed, the default is patch local bump with `minor_bump` API strategy. This is the most common deployment path.

---

## [P] `--patch` explicit flag

```bash
codika deploy use-case /path/to/valid-use-case --patch --profile cli-test-owner-full --json
```

**Expect**: Same as default — `success: true`, local version bumped by patch, API strategy `minor_bump`. Behavior is identical to omitting the flag.

**Why**: Confirms that `--patch` is truly the default and produces the same result as no flag.

---

## [P] `--minor` version strategy

```bash
codika deploy use-case /path/to/valid-use-case --minor --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `version.json` is bumped by minor (e.g. `1.0.2` -> `1.1.0`). The API version strategy is `minor_bump`.

**Why**: Tests the minor version flag which bumps both the minor component locally and uses `minor_bump` API strategy.

---

## [P] `--major` version strategy

```bash
codika deploy use-case /path/to/valid-use-case --major --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The local `version.json` is bumped by major (e.g. `1.1.0` -> `2.0.0`). The API version strategy is `major_bump`.

**Why**: Tests the major version flag. The API strategy changes to `major_bump` (unlike `--patch` and `--minor` which both use `minor_bump`).

---

## [P] `--target-version` explicit API version

```bash
codika deploy use-case /path/to/valid-use-case --target-version 5.0 --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The API receives `explicitVersion: "5.0"` and creates that specific version. The local `version.json` is bumped by patch (the default local strategy for explicit versions). `data.version` in the response should be `"5.0"`.

**Why**: Explicit version control is needed when the API version must match a specific release number rather than auto-incrementing. Confirms that `--target-version` sets `apiStrategy: 'explicit'` and `localStrategy: 'patch'`.

---

## [P] `--dry-run` with JSON output

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --profile cli-test-owner-full --json
```

**Expect**: JSON output contains all of these top-level fields:
- `useCasePath` (string) — absolute path to the use case folder
- `projectId` (string) — resolved project ID
- `projectIdSource` (string) — one of `"flag"` or `"project.json"`
- `apiKeySource` (string) — describes where the API key came from
- `apiUrl` (string) — resolved endpoint URL
- `version` (object) — `current` (current version.json), `next` (what it would bump to), `localStrategy`, `apiStrategy`
- `configuration` (object) — `title`, `subtitle`, `workflowCount`, `tags` (array), `integrations` (array)
- `workflows` (array) — each with `templateId`, `name`, `triggerTypes`, `base64Size`
- `metadataDocuments` (number) — count of metadata docs
- `validation` (object) — `valid` (boolean), `summary` (string)

No API call is made. `version.json` is NOT modified. Exit code 0 if validation passes, exit code 1 if validation fails.

**Why**: Dry-run is critical for CI/CD pipelines and pre-flight checks. Verifies that all resolution logic (project ID, API key, version) works without side effects. The extensive output lets users debug configuration before committing to a deploy.

---

## [P] `--dry-run` human-readable output

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --profile cli-test-owner-full
```

**Expect**: Formatted preview showing project ID and its source, version info (current and next), workflow summary with names and trigger types, validation results. No JSON structure. No actual deployment. Exit code 0 if validation passes.

**Why**: Verifies the `formatDryRunDeployment` output formatter produces readable output for interactive use.

---

## [P] `--dry-run` with `--project-id` shows flag source

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --project-id h8iCqSgTjSsKySyufq36 --profile cli-test-owner-full --json
```

**Expect**: `projectIdSource` is `"flag"` in the dry-run output. `projectId` is `"h8iCqSgTjSsKySyufq36"`.

**Why**: Confirms that the dry-run output correctly reports the project ID resolution source, helping users verify their flags are taking effect.

---

## [P] `--dry-run` with version flags

```bash
codika deploy use-case /path/to/valid-use-case --dry-run --minor --profile cli-test-owner-full --json
```

**Expect**: `version.localStrategy` is `"minor"`, `version.apiStrategy` is `"minor_bump"`, `version.next` reflects a minor bump from `version.current`. `version.json` is NOT modified.

**Why**: Verifies that version strategy resolution is reflected in dry-run output without side effects.

---

## [P] `--additional-file` flag

```bash
codika deploy use-case /path/to/valid-use-case --additional-file "/tmp/extra.json:docs/extra.json" --profile cli-test-owner-full --json
```

**Expect**: `success: true` if the file at `/tmp/extra.json` exists and the use case is valid. The additional file is included in the deployment payload with relative path `docs/extra.json`.

**Why**: Additional files allow attaching supplementary resources (documentation, schemas, PRDs) to a deployment without modifying the core use case structure. The colon-separated format maps an absolute local path to a relative archive path.

---

## [P] `--additional-file` repeatable (multiple files)

```bash
codika deploy use-case /path/to/valid-use-case \
  --additional-file "/tmp/prd.md:docs/prd.md" \
  --additional-file "/tmp/schema.json:data/schema.json" \
  --profile cli-test-owner-full --json
```

**Expect**: `success: true`. Both files are included in the deployment. The `--additional-file` option uses Commander's variadic accumulator pattern — each occurrence appends to an array.

**Why**: Verifies the repeatable flag works with multiple files. The Commander definition uses `(value, previous) => previous.concat([value])` to accumulate entries.

---

## [P] `--additional-file` with relative absolute path

```bash
cd /tmp && codika deploy use-case /path/to/valid-use-case --additional-file "./extra.json:docs/extra.json" --profile cli-test-owner-full --json
```

**Expect**: `success: true`. The CLI resolves `./extra.json` to an absolute path via `resolve()` before reading the file. The relative local path is converted to absolute automatically.

**Why**: The source code calls `isAbsolute(absPath) ? absPath : resolve(absPath)` on the left side of the colon, supporting both absolute and relative paths on the command line.

---

## [P] Org-aware profile auto-selection

Deploy to a use case whose `project.json` contains an `organizationId` that matches a non-active profile. The CLI should auto-select the matching profile.

```bash
codika deploy use-case /path/to/use-case-with-org-in-project-json --json
```

**Expect**: `success: true`. The CLI prints a message like `Using profile "cli-test-owner-full" (matches project organization)` to stderr, and uses the API key from that profile even though it may not be the active profile.

**Why**: Org-aware auto-selection is a key UX feature. When `project.json` has `organizationId`, the CLI scans all profiles for a matching org and uses that key. This prevents deploying to the wrong org when switching between projects.

---

## [N] Nonexistent path — exit code 2

```bash
codika deploy use-case /nonexistent/path --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"Use case path does not exist"`. Exit code `2` (CLI validation via `exitWithError`). The `--json` flag is irrelevant because `exitWithError` always writes to stderr and never produces JSON.

**Why**: CLI validates the path exists before any other logic. This is the first guard in `runDeployUseCase`.

---

## [N] Missing API key — no profile, no env, no flag

```bash
codika deploy use-case /path/to/valid-use-case --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `1`, error about profile not found.

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved.

---

## [N] Missing project ID — no project.json, no flag

Use a use case folder that has NO `project.json` and pass no `--project-id` flag.

```bash
codika deploy use-case /path/to/use-case-without-project-json --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Error message contains `"No project ID found"` with suggestions to create project.json or pass `--project-id`. Exit code `1` (thrown from `resolveProjectId`, caught by the try/catch which exits with 1).

**Why**: Tests the project ID resolution failure path. The error message includes actionable suggestions (run `codika project create`, add `project.json`, pass `--project-id`, or pass `--project-file`).

---

## [N] Invalid use case structure — missing config.ts

Use a folder that exists but has no `config.ts`.

```bash
codika deploy use-case /tmp --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Error message contains `"Invalid use case structure"` and mentions `"Missing config.ts"`. Exit code `1` (thrown from `resolveUseCaseDeployment`, caught by try/catch).

**Why**: The deployer validates that both `config.ts` and `workflows/` exist before proceeding. Missing either produces a clear structural error with the expected folder layout.

---

## [N] Invalid use case structure — missing workflows/ folder

Use a folder with `config.ts` but no `workflows/` directory.

```bash
codika deploy use-case /path/to/folder-with-config-but-no-workflows --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Error message contains `"Invalid use case structure"` and mentions `"Missing workflows/ folder"`. Exit code `1`.

**Why**: Both `config.ts` and `workflows/` are required for a valid use case. Testing each missing component separately ensures the error messages are specific.

---

## [N] Invalid `--additional-file` format — no colon separator

```bash
codika deploy use-case /path/to/valid-use-case --additional-file "no-colon-separator" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"Invalid --additional-file format"`. Exit code `2` (via `exitWithError`).

**Why**: The `--additional-file` flag requires `absolutePath:relativePath` format with a colon separator. The CLI checks `entry.indexOf(':') === -1` and calls `exitWithError` if missing.

---

## [N] Invalid `--additional-file` format — missing relative path

```bash
codika deploy use-case /path/to/valid-use-case --additional-file "/tmp/file:" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `"Missing relativePath in --additional-file"`. Exit code `2` (via `exitWithError`).

**Why**: When the colon exists but the right side is empty, the CLI catches this with a separate guard. Tests the second validation check in the additional-file parsing loop.

---

## [N] Invalid `--target-version` format

```bash
codika deploy use-case /path/to/valid-use-case --target-version "abc" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Error contains `"Invalid version format"` and mentions `"Expected \"X.Y\" format"`. Exit code `1` (thrown from `resolveVersionStrategies`, caught by try/catch).

```bash
codika deploy use-case /path/to/valid-use-case --target-version "1.2.3" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Same error — `"Invalid version format"`. The function checks `parts.length !== 2`, so three-part versions are rejected. Only `X.Y` format is accepted.

**Why**: The `resolveVersionStrategies` function validates that `--target-version` is exactly two dot-separated integers. Both non-numeric and wrong-part-count values are rejected.

---

## [N] Conflicting version flags — `--major` wins over `--minor`

```bash
codika deploy use-case /path/to/valid-use-case --minor --major --dry-run --profile cli-test-owner-full --json
```

**Expect**: The `version.localStrategy` is `"major"` and `version.apiStrategy` is `"major_bump"`. No error is thrown.

**Why**: `resolveVersionStrategies` checks `major` first, then `minor`, then `version`, then defaults to patch. When multiple flags are passed, the highest-priority flag wins silently. This is not an error — it follows a deterministic priority order: `--major` > `--minor` > `--target-version` > `--patch`.

---

## [N] `--dry-run` with failing validation — exit code 1

Use a use case folder with known validation issues (e.g., missing mandatory Codika Init node).

```bash
codika deploy use-case /path/to/invalid-use-case --dry-run --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: JSON output contains `validation.valid: false` and `validation.summary` describing the issues. Exit code `1` (dry-run exits with 1 when validation fails).

**Why**: Dry-run reports validation status. A failing validation returns exit code 1, which CI/CD pipelines can use to gate deployments.

---

## [P] project.json updated with devProcessInstanceId

After a successful deploy:

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full --json > /tmp/deploy-result.json
cat /path/to/valid-use-case/project.json | jq '.devProcessInstanceId'
```

**Expect**: The `devProcessInstanceId` in `project.json` matches `data.processInstanceId` from the deploy response.

```bash
cat /path/to/valid-use-case/project.json | jq '.deployments'
```

**Expect**: The `deployments` object contains an entry keyed by the API version (e.g., `"1.3"`), with `templateId` and `createdAt` fields.

**Why**: The CLI writes `devProcessInstanceId` and appends to the `deployments` map on every successful deploy. This is used by `codika publish` and `codika redeploy` to reference previous deployments.

---

## [P] version.json updated after successful deploy

```bash
cat /path/to/valid-use-case/version.json | jq '.version'
```

Run before and after deploy to confirm the version was bumped:

```bash
# Before: e.g., "1.0.3"
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner-full --json
# After: e.g., "1.0.4" (patch bump)
```

**Expect**: The version string in `version.json` reflects the bump strategy used. Default is patch.

**Why**: `version.json` is the local version tracker. Confirms `writeVersion` is called only on success, and the version matches the strategy.

---

## [P] Deployment archived locally

After a successful deploy, check for the archive:

```bash
ls /path/to/valid-use-case/deployments/h8iCqSgTjSsKySyufq36/process/
```

**Expect**: A folder named after the API version (e.g., `1.3/`) containing `deployment-info.json`, `config-snapshot.json`, and `workflows/*.json`.

**Why**: Deployment archiving preserves a snapshot of every deployment for audit, rollback reference, and debugging.

---

## [S] Scope enforcement — limited key has `deploy:use-case`

The `cli-test-limited` profile has scopes `deploy:use-case` + `instances:read`.

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-limited --json
```

**Expect**: `success: true` (assuming valid use case and project). The limited key has `deploy:use-case` scope, which is sufficient for deployment.

**Why**: Confirms that `deploy:use-case` is the only scope required. Unlike read commands that need `projects:read`, deployment has its own dedicated scope.

---

## [S] Scope enforcement — key without `deploy:use-case`

Use a key that has scopes but NOT `deploy:use-case`. The `cli-test-member` profile has all 11 scopes, so this test requires creating or using a key that specifically lacks `deploy:use-case` scope. If no such key is available, this test can be skipped.

```bash
codika deploy use-case /path/to/valid-use-case --api-key "<key-without-deploy-scope>" --json
```

**Expect**: `success: false`, error about insufficient scope / permission denied. Exit code 1.

**Why**: Verifies the Cloud Function's `hasScope('deploy:use-case')` check rejects keys that authenticate successfully but lack the required scope.

---

## [S] Cross-org isolation

A key from a different organization cannot deploy to the test org's project.

```bash
codika deploy use-case /path/to/valid-use-case --project-id h8iCqSgTjSsKySyufq36 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about project not found or organization mismatch. Exit code 1. The cross-org key (org `HF5DaJQamZxIeMj0zfWY`) must never deploy to project `h8iCqSgTjSsKySyufq36` in the test org (`l0gM8nHm2o2lpupMpm5x`).

**Why**: The Cloud Function validates that the API key's organization owns the target project. Cross-org deployment must be impossible regardless of the key's scopes.

---

## [S] Invalid API key

```bash
codika deploy use-case /path/to/valid-use-case --api-key "cko_invalid_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized / invalid API key. Exit code 1.

**Why**: Auth middleware rejects invalid keys before any business logic executes. The error comes from the API, not the CLI.

---

## [S] `--profile` selects specific profile

```bash
codika deploy use-case /path/to/valid-use-case --profile cli-test-owner --json
```

**Expect**: `success: true`. The deployment uses the API key from `cli-test-owner` profile, not the currently active profile. The response confirms the deployment went to the test org.

**Why**: The `--profile` flag bypasses the active profile and org-aware auto-selection. Users need this for explicit control in scripts.

---

## [P] `--api-url` overrides endpoint

```bash
codika deploy use-case /path/to/valid-use-case --api-url "https://invalid-url.example.com/deploy" --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Network error or connection refused. Exit code `1`. The CLI sends the request to the overridden URL instead of the default.

**Why**: Verifies that `--api-url` actually overrides the endpoint. Useful for testing against staging environments or local dev servers.

---

## Last tested

Not yet tested.
