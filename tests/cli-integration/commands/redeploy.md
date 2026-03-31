# `codika redeploy`

Redeploys a deployment instance with optional parameter overrides. Resolves the process instance ID from `--process-instance-id`, or auto-resolves from `project.json` (`devProcessInstanceId` for dev, `prodProcessInstanceId` for prod). Parameters can be provided via `--param KEY=VALUE` (repeatable), `--params` JSON string, or `--params-file` path, with layered priority.

**Scope required**: `deploy:use-case`
**Method**: POST (body: `{ processInstanceId, deploymentParameters?, forceRedeploy? }`)
**Cloud Function**: `redeployDeploymentInstancePublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (dev instance with workflows)

---

## [P] Happy path -- redeploy with explicit instance ID

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.deploymentStatus` = `"deployed"`, `data.deploymentInstanceId` present, `data.n8nWorkflowIds` is an array with at least one entry. Exit code 0.

**Why**: Core happy path -- verifies the redeploy flow with explicit instance targeting.

---

## [P] Human-readable output

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output shows "Redeploying instance...", Instance ID, Environment (dev), then `✓ Redeployed successfully!` with Status, Instance ID, Workflows count.

**Why**: Verifies the formatted output path.

---

## [P] `--param` flag for parameter override

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param COMPANY_NAME=TestCorp --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the deployment uses the overridden parameter. Human-readable output shows "Parameters: 1 override(s)".

**Why**: The `--param KEY=VALUE` flag is the primary way to override deployment parameters (INSTPARM placeholders) during redeploy.

---

## [P] Multiple `--param` flags

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param KEY1=value1 --param KEY2=value2 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both parameters are sent to the API. Parameters count shows "2 override(s)" in human-readable mode.

**Why**: `--param` is repeatable. Each occurrence adds to the deploymentParameters map.

---

## [P] `--params` JSON string

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params '{"COMPANY_NAME":"TestCorp","WEBHOOK_URL":"https://example.com"}' --profile cli-test-owner-full --json
```

**Expect**: `success: true`, both parameters are included in the deployment.

**Why**: The `--params` flag accepts a JSON string for bulk parameter override, useful for CI scripts.

---

## [P] `--params-file` flag

```bash
echo '{"COMPANY_NAME":"FromFile"}' > /tmp/test-params.json && codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --params-file /tmp/test-params.json --profile cli-test-owner-full --json
```

**Expect**: `success: true`, parameter from file is used. Parameters have layered priority: `--params-file` (lowest) < `--params` < `--param` (highest).

**Why**: File-based parameters are useful for complex parameter sets that don't fit on the command line.

---

## [P] `--force` flag

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --force --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `forceRedeploy: true` is sent to the API. Human-readable output shows "Force: yes".

**Why**: The `--force` flag triggers a full redeploy even when the system determines nothing has changed.

---

## [P] Auto-resolve instance ID from project.json (dev)

Run from a directory containing a `project.json` with `devProcessInstanceId`:

```bash
codika redeploy --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the instance ID is resolved from `project.json`.`devProcessInstanceId`.

**Why**: Auto-resolution eliminates the need to copy-paste instance IDs during iterative development.

---

## [P] Auto-resolve instance ID for prod environment

```bash
codika redeploy --path /path/to/use-case --environment prod --profile cli-test-owner-full --json
```

**Expect**: `success: true` (if `prodProcessInstanceId` exists in project.json), the prod instance is redeployed.

**Why**: The `--environment` flag switches between `devProcessInstanceId` and `prodProcessInstanceId` in project.json resolution.

---

## [N] No process instance ID available

```bash
codika redeploy --profile cli-test-owner-full
```

**Expect**: Exit code 2, error contains "No process instance ID found" with three resolution options.

**Why**: The CLI requires at least one way to resolve the instance ID. When all sources fail, it shows a helpful error.

---

## [N] Invalid `--param` format

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --param "no-equals-sign" --profile cli-test-owner-full
```

**Expect**: Exit code 2, error: `Invalid --param format: "no-equals-sign". Expected KEY=VALUE`.

**Why**: Client-side validation for the `KEY=VALUE` format before building the parameters map.

---

## [N] Nonexistent instance ID

```bash
codika redeploy --process-instance-id nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about instance not found.

**Why**: Standard 404 handling at the Cloud Function level.

---

## [S] Scope enforcement -- limited key

The limited key has `deploy:use-case` + `instances:read`, which includes the required scope.

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: true`, because `deploy:use-case` covers redeploy.

**Why**: Redeploy shares the `deploy:use-case` scope.

---

## [S] Cross-org isolation

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch.

**Why**: A key from a different organization cannot redeploy instances belonging to the test org.

---

## [S] Invalid API key

```bash
codika redeploy --process-instance-id 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_invalid_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
