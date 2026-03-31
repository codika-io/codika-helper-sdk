# `codika instance activate/deactivate [instanceId]`

Activates or deactivates (pauses) a process instance's workflows. The instance ID can be passed as an argument, or auto-resolved from `project.json` in the current directory or `--path` directory. The `--environment` flag selects between `devProcessInstanceId` and `prodProcessInstanceId`.

**Scope required**: `instances:manage`
**Method**: POST (body: `{ processInstanceId }`)
**Cloud Function**: `activateProcessInstancePublic` / `deactivateProcessInstancePublic`

**Test instance**: `019d444d-1bd0-70f5-b6ff-21d1b5ed5b71` (dev instance with workflows)

**Important**: These tests toggle real workflow activation state. Run activate and deactivate in pairs to restore original state.

---

## [P] Deactivate instance -- JSON output

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"`, `data.workflowCount` is a number (workflows paused). Exit code 0.

**Why**: Deactivate first so we can test activate next. Verifies the deactivate flow with explicit instance ID.

---

## [P] Activate instance -- JSON output

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.processInstanceId` = `"019d444d-1bd0-70f5-b6ff-21d1b5ed5b71"`, `data.workflowCount` is a number (workflows activated). Exit code 0.

**Why**: Activate the previously deactivated instance. Core happy path for the activate command.

---

## [P] Deactivate -- human-readable output

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output shows `Deactivating instance "..."...`, then `⏸ Instance deactivated` with Instance ID and Workflows count (paused).

**Why**: Verifies the formatted output path for deactivate.

**Cleanup**: Re-activate the instance.

---

## [P] Activate -- human-readable output

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-owner-full
```

**Expect**: Output shows `Activating instance "..."...`, then `✓ Instance activated` with Instance ID and Workflows count (activated).

**Why**: Verifies the formatted output path for activate.

---

## [P] Auto-resolve instance ID from project.json (dev)

Run from a directory containing a `project.json` with `devProcessInstanceId`:

```bash
codika instance activate --path /path/to/use-case --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the instance ID is resolved from `project.json`.`devProcessInstanceId`.

**Why**: Auto-resolution from project.json means users don't need to copy-paste instance IDs during development.

---

## [P] Auto-resolve instance ID for prod environment

```bash
codika instance deactivate --path /path/to/use-case --environment prod --profile cli-test-owner-full --json
```

**Expect**: `success: true` (if `prodProcessInstanceId` exists in project.json), resolves from `prodProcessInstanceId`.

**Why**: The `--environment` flag switches the auto-resolution between dev and prod instance IDs.

**Cleanup**: Re-activate the prod instance if deactivated.

---

## [N] No instance ID available

```bash
codika instance activate --profile cli-test-owner-full
```

**Expect**: Exit code 2, error contains "Process instance ID is required" with three resolution options (argument, project.json, --path).

**Why**: The CLI requires at least one way to resolve the instance ID. When all sources fail, it shows a helpful error.

---

## [N] Nonexistent instance ID

```bash
codika instance activate nonexistent-instance-id --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about instance not found.

**Why**: Standard 404 handling at the Cloud Function level.

---

## [S] Scope enforcement -- limited key lacks `instances:manage`

The limited key has `deploy:use-case` + `instances:read` but NOT `instances:manage`.

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `instances:manage`.

**Why**: Activating/deactivating instances requires the `instances:manage` scope, which is separate from `instances:read`. The limited key is rejected at the scope layer.

---

## [S] Scope enforcement -- limited key for deactivate

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --profile cli-test-limited --json
```

**Expect**: `success: false`, error contains `instances:manage`.

**Why**: Both activate and deactivate require the same `instances:manage` scope.

---

## [S] Cross-org isolation -- activate

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch.

**Why**: A key from a different organization cannot activate instances belonging to the test org.

---

## [S] Cross-org isolation -- deactivate

```bash
codika instance deactivate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about instance not found or org mismatch.

**Why**: A key from a different organization cannot deactivate instances belonging to the test org.

---

## [S] Invalid API key

```bash
codika instance activate 019d444d-1bd0-70f5-b6ff-21d1b5ed5b71 --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
