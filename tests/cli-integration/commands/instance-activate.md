# `codika instance activate` / `codika instance deactivate`

Activates or deactivates (pauses) a process instance's workflows. The instance ID can be passed as a positional argument, or auto-resolved from `project.json` in the current directory or `--path` directory. The `--environment` flag selects between `devProcessInstanceId` and `prodProcessInstanceId`.

**Scope required**: `instances:manage`
**Method**: POST (body: `{ processInstanceId }`)
**Cloud Functions**: `activateProcessInstancePublic` / `deactivateProcessInstancePublic`

**Test instance (dev)**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71`
**Test instance (prod)**: `019d444e-290a-721b-9ce3-f3d454eb6d0e`

**Important**: These tests toggle real workflow activation state. Tests are ordered so that each pair (deactivate then activate, or vice versa) restores the instance to its original state.

---

## [P] Deactivate dev instance -- JSON output

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"`, `data.workflowCount` is a number (workflows paused). Exit code 0.

**Why**: Deactivate first so we can test activate next. Verifies JSON output for the deactivate command with an explicit positional instance ID.

---

## [P] Activate dev instance -- JSON output

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"`, `data.workflowCount` is a number (workflows activated). Exit code 0.

**Why**: Core happy path for the activate command. Re-activates the instance deactivated in the previous test.

---

## [P] Deactivate dev instance -- human-readable output

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output contains `Deactivating instance "019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"...`, then `⏸ Instance deactivated` with `Instance ID:` and `Workflows:` lines showing the count with `paused`.

**Why**: Verifies the human-readable formatter path for deactivate. The `⏸` icon and `paused` wording distinguish it from activate output.

---

## [P] Activate dev instance -- human-readable output

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output contains `Activating instance "019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"...`, then `✓ Instance activated` with `Instance ID:` and `Workflows:` lines showing the count with `activated`.

**Why**: Verifies the human-readable formatter path for activate. Restores the instance from the previous deactivate test.

---

## [P] `--environment dev` resolves `devProcessInstanceId` from `--path`

Run from a directory containing a `project.json` with `devProcessInstanceId` set to the test dev instance.

```bash
codika instance deactivate --path /path/to/use-case-with-project-json --environment dev --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"` (resolved from `project.json`.`devProcessInstanceId`). Exit code 0.

**Why**: Validates the `--path` + `--environment dev` resolution chain. `dev` is the default but testing it explicitly ensures the flag is wired correctly.

**Cleanup**: Re-activate the instance.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

---

## [P] `--environment prod` resolves `prodProcessInstanceId` from `--path`

```bash
codika instance deactivate --path /path/to/use-case-with-project-json --environment prod --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444e-290a-721b-9ce3-f3d454eb6d0e"` (resolved from `project.json`.`prodProcessInstanceId`). Exit code 0.

**Why**: Validates the `--environment prod` flag switches resolution from `devProcessInstanceId` to `prodProcessInstanceId` in `project.json`.

**Cleanup**: Re-activate the prod instance.

```bash
codika instance activate 019d444e-290a-721b-9ce3-f3d454eb6d0e --profile cli-test-owner-full --json
```

---

## [P] `--project-file` reads from a custom file

Create a `project-test.json` in the test use case folder with `devProcessInstanceId` set, then:

```bash
codika instance deactivate --path /path/to/use-case --project-file project-test.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, instance ID resolved from `project-test.json` instead of `project.json`. Exit code 0.

**Why**: Validates the `--project-file` option overrides the default `project.json` filename. This supports multi-tenant setups where different clients have different project files.

**Cleanup**: Re-activate the instance.

---

## [P] CWD resolution -- auto-resolve from current directory

Run from inside a use case folder that contains a `project.json` with `devProcessInstanceId`:

```bash
cd /path/to/use-case-with-project-json && codika instance deactivate --profile cli-test-owner-full --json
```

**Expect**: `success: true`, instance ID resolved from `project.json` in the current working directory. Exit code 0.

**Why**: Tests the lowest-priority resolution path: no positional arg, no `--path`, falls back to `process.cwd()`. This is the most common developer workflow (run from inside the use case folder).

**Cleanup**: Re-activate the instance.

---

## [P] Positional argument takes priority over `--path` resolution

Pass an explicit instance ID AND `--path` pointing to a folder with a different instance in `project.json`:

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --path /path/to/different-use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"` (the positional arg), NOT the ID from the `--path` project.json.

**Why**: Validates the resolution priority chain: positional > `--path` > cwd. The explicit argument must always win.

**Cleanup**: Re-activate the instance.

---

## [P] `--profile` flag selects a different profile

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner --json
```

**Expect**: `success: true`. The `cli-test-owner` profile (different from `cli-test-owner-full`) is used for authentication. Both have `instances:manage` scope so both succeed.

**Why**: Validates the `--profile` flag routes to the correct profile's API key.

**Cleanup**: Re-activate.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner --json
```

---

## [P] `--api-key` flag overrides profile

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "$(codika config show --profile cli-test-owner-full --json | jq -r '.apiKey')" --json
```

**Expect**: `success: true`. The `--api-key` flag bypasses all profile resolution and uses the provided key directly.

**Why**: Validates the highest-priority auth resolution path (`--api-key` > env var > profile). Important for CI/CD pipelines.

**Cleanup**: Re-activate.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

---

## [N] Missing instance ID -- no arg, no path, no cwd project.json

```bash
cd /tmp && codika instance activate --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains `Process instance ID is required` with the three resolution options (argument, project.json, --path). Exit code `2`.

**Why**: All three resolution sources fail. The `exitWithError()` path produces exit code 2 (CLI validation error, not API error). The `--json` flag is not tested here because `exitWithError` always writes to stderr and never produces JSON.

---

## [N] Missing instance ID -- deactivate

```bash
cd /tmp && codika instance deactivate --profile cli-test-owner-full 2>&1; echo "EXIT:$?"
```

**Expect**: Same behavior as activate: stderr contains `Process instance ID is required`, exit code `2`.

**Why**: Both activate and deactivate use the same `resolveProcessInstanceId` function and `exitWithError` path. Testing both confirms symmetry.

---

## [N] Missing API key -- no profile, no env, no flag

```bash
env -u CODIKA_API_KEY codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr contains "API key" (the `API_KEY_MISSING_MESSAGE` constant). Exit code `2`.

**Why**: Verifies the early-exit guard when no authentication source is available. Exit code 2 distinguishes CLI validation errors from API errors (exit code 1).

---

## [N] Nonexistent instance ID

```bash
codika instance activate nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about instance not found. Exit code 1.

**Why**: Standard 404 handling at the Cloud Function level. The API key is valid, the scope is correct, but the resource does not exist.

---

## [N] Nonexistent instance ID -- deactivate

```bash
codika instance deactivate nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about instance not found. Exit code 1.

**Why**: Confirms the deactivate endpoint handles 404 identically to activate.

---

## [N] Invalid `--environment` value

```bash
codika instance activate --path /path/to/use-case --environment staging --profile cli-test-owner-full --json 2>&1; echo "EXIT:$?"
```

**Expect**: Either exit code 2 with a validation error about invalid environment, or the command falls through to "Process instance ID is required" because neither `devProcessInstanceId` nor `prodProcessInstanceId` matches `staging`. Either way, the command does not succeed.

**Why**: The `--environment` flag only accepts `dev` or `prod`. Tests that invalid values do not silently resolve to a default.

---

## [S] Scope enforcement -- limited key lacks `instances:manage` (activate)

The limited key has `deploy:use-case` + `instances:read` but NOT `instances:manage`.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `instances:manage`. Exit code 1.

**Why**: Activating instances requires `instances:manage`, which is separate from `instances:read`. The limited key authenticates successfully but is rejected at the scope check layer.

---

## [S] Scope enforcement -- limited key lacks `instances:manage` (deactivate)

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `instances:manage`. Exit code 1.

**Why**: Both activate and deactivate require the same `instances:manage` scope. Testing both confirms the scope check is applied symmetrically.

---

## [S] Cross-org isolation -- activate

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch. Exit code 1.

**Why**: The cross-org key (org `HF5DaJQamZxIeMj0zfWY`) must not be able to activate instances in the test org (`l0gM8nHm2o2lpupMpm5x`). The Cloud Function filters by the caller's organization.

---

## [S] Cross-org isolation -- deactivate

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch. Exit code 1.

**Why**: Same isolation check for deactivate. A valid key from org B cannot deactivate instances belonging to org A.

---

## [S] Invalid API key

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before any business logic runs. The JSON error wrapper in the `catch` block (not `exitWithError`) produces the output.

---

## [S] Invalid API key -- deactivate

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Confirms the deactivate endpoint rejects invalid keys identically to activate.

---

## [S] Member key can activate/deactivate

The member key (`cli-test-member`) has `instances:manage` scope.

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-member --json
```

**Expect**: `success: true` or `success: false` with an access/sharing error (depends on whether the member has access to this specific instance). Either way, the error must NOT be about scope -- the member has `instances:manage`.

**Why**: Validates that member keys with the correct scope can reach the business logic layer. Whether the instance is accessible depends on the sharing model, not scope.

**Cleanup**: If succeeded, re-activate with owner key.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

---

## Last tested

Not yet tested.
