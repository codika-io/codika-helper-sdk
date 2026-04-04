# `codika status [path]`

Shows identity, use case context, and deploy readiness — like `git status` for Codika. Reads local files (config.ts, project.json, version.json, workflows/) and the active profile to build a snapshot. Optionally runs validation with `--verify`. No API calls unless `--verify` triggers local validation.

**Scope required**: None (purely local)
**Method**: Local filesystem reads + profile config
**Cloud Function**: N/A

**Exit codes**:
- `0` — No use case detected, or use case is ready
- `1` — Use case detected but not ready (missing items)
- `2` — Unexpected error (catch block)

---

## [P] Happy path — JSON output from a valid use-case folder

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json
```

**Expect**: Exit code 0. JSON with three top-level keys: `identity`, `useCase`, `readiness`. `identity.loggedIn` = `true`, `identity.organizationName` = `"Test Organization from CLI"`, `identity.organizationId` = `"l0gM8nHm2o2lpupMpm5x"`. `useCase` is non-null with `hasConfigTs: true`, `hasWorkflowsDir: true`, `workflowCount` = `1`, `hasProjectJson: true`, `projectId` = `"test-project-id-12345"`. `readiness.ready` = `true`, `readiness.missing` = `[]`.

**Why**: Core happy path — verifies that status gathers identity + use case context correctly from a known-good fixture. Exit 0 because the use case has everything needed. Note: `status` does not support `--profile` — it uses the active profile.

---

## [P] Happy path — Human-readable output

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case
```

**Expect**: Exit code 0. Output contains an `Identity` heading with Organization (including org ID), Profile (with count), and Key (masked prefix). A `Use Case: valid-use-case` heading with Path, Version, Workflows (`1 file`), Project ID (`test-project-id-12345`), and Profile Match line. A readiness line at the bottom (`Ready to deploy`).

**Why**: Human-readable output is the primary UX. Verifies all three sections render and all fields appear.

---

## [P] Identity section — all fields present

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.identity | keys'
```

**Expect**: Exactly 8 keys: `keyPrefix`, `keySource`, `loggedIn`, `organizationId`, `organizationName`, `profileCount`, `profileName`, `type`.

**Why**: Ensures the identity shape matches the `StatusResult` interface. No extra fields leaked, no fields missing.

---

## [P] Identity section — profile count

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.identity.profileCount'
```

**Expect**: Number >= 4 (at least the 4 test profiles from setup.md).

**Why**: Profile count helps users understand how many profiles are configured without running `codika use`.

---

## [P] Identity section — key source shows "profile"

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq -r '.identity.keySource'
```

**Expect**: String containing `"profile"` (the key came from the named profile, not env var or flag).

**Why**: `keySource` tells users where the API key was resolved from — important for debugging auth issues.

---

## [P] Use case section — all fields present

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase | keys'
```

**Expect**: Exactly 11 keys: `currentVersion`, `hasConfigTs`, `hasProjectJson`, `hasVersionJson`, `hasWorkflowsDir`, `name`, `organizationId`, `path`, `profileMatch`, `projectId`, `workflowCount`.

**Why**: Ensures the use case shape matches the interface. Guards against accidentally adding or removing fields.

---

## [P] Use case detection — config.ts presence

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.hasConfigTs'
```

**Expect**: `true`.

**Why**: `config.ts` is one of two signals (along with `workflows/`) that a folder is a use case. Both trigger detection.

---

## [P] Use case detection — workflows directory

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.hasWorkflowsDir'
```

**Expect**: `true`.

**Why**: The `workflows/` directory is the other detection signal. It must exist and be a directory.

---

## [P] Use case — workflow count

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.workflowCount'
```

**Expect**: `1` (the valid fixture has one `main-workflow.json`).

**Why**: Workflow count is a quick health check — zero workflows means the use case isn't deployable.

---

## [P] Use case — version and version.json detection

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '{version: .useCase.currentVersion, hasVersionJson: .useCase.hasVersionJson}'
```

**Expect**: `currentVersion` is a semver string (e.g., `"1.0.0"`). `hasVersionJson` is `true` if a `version.json` exists in the fixture, `false` if the version is a default. In human-readable mode, a missing `version.json` shows `(default)` suffix.

**Why**: Version tracking is essential for deployment — status should surface the current version and whether it's explicit or defaulted.

---

## [P] Use case — name derived from folder basename

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq -r '.useCase.name'
```

**Expect**: `"valid-use-case"` (the folder name, via `basename()`).

**Why**: The name is used in human-readable output (`Use Case: valid-use-case`). Verifies `basename()` is applied to the resolved path.

---

## [P] Use case — path is resolved to absolute

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq -r '.useCase.path'
```

**Expect**: An absolute path ending with `/valid-use-case` (not a relative path).

**Why**: The source calls `resolve(targetPath)`. Verifies that relative CLI arguments are resolved to absolute paths in the output.

---

## [P] Profile match — `no-org-in-project` (fixture has no organizationId)

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.profileMatch'
```

**Expect**: `{ "status": "no-org-in-project" }`. The valid fixture's `project.json` has `projectId` but no `organizationId`, so profile matching can't compare orgs.

**Why**: Tests the third branch of the profile match logic — `projectOrgId` is null. In human-readable output this shows as `n/a (no org in project.json)`.

---

## [P] Profile match — `no-profile` (no auth)

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile nonexistent-profile --json | jq '.useCase.profileMatch'
```

**Expect**: `{ "status": "no-profile" }`.

**Why**: Tests the first branch — when `activeProfile` is null, the match status is `no-profile`. In human-readable output: `n/a (not logged in)`. Using `--profile nonexistent-profile` forces no-auth.

---

## [P] Readiness — ready when all requirements met

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.readiness'
```

**Expect**: `ready: true`, `missing: []`, `warnings` is an array (may be empty or contain expiry warning). No `validation` key (since `--verify` was not passed).

**Why**: A valid use case with auth should be ready. The `missing` array being empty is the signal.

---

## [P] Readiness — missing items for incomplete use case (no workflows, no project.json)

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --json | jq '.readiness'
```

**Expect**: Exit code 1. `ready: false`. `missing` array contains entries for missing workflows (`"No workflow files in workflows/"`) and missing project.json (`"Missing project.json"`). The fixture has `config.ts` but no `workflows/` directory and no `project.json`.

**Why**: The `missing` array is the actionable output — it tells users exactly what to fix. Exit 1 because a use case was detected (has config.ts) but isn't ready.

---

## [P] Readiness — missing config.ts (only workflows/ exists)

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/missing-config --json | jq '.readiness.missing'
```

**Expect**: Exit code 1. Array includes `"Missing config.ts"` and `"Missing project.json"`.

**Why**: The `missing-config` fixture has only a `workflows/` directory. Tests the detection path where `hasWorkflowsDir` is true but `hasConfigTs` is false.

---

## [P] Status from a non-use-case folder — JSON

```bash
codika status /tmp --json
```

**Expect**: Exit code 0. `useCase` = `null`. `readiness.ready` = `false`. `readiness.missing` = `[]`. `identity` section is fully populated (loggedIn, profileName, etc.).

**Why**: Running status from a random directory should gracefully report "no use case detected" without failing. Exit 0 because the command itself succeeded — there's no use case to be "not ready".

---

## [P] Non-use-case folder — human-readable output

```bash
codika status /tmp
```

**Expect**: Exit code 0. Output contains the Identity section. No `Use Case:` section. Readiness line shows `No use case detected at this path` (dim text, no error styling).

**Why**: Verifies the human-readable path for non-use-case directories renders the correct message.

---

## [P] Default path is current directory

```bash
cd /tmp && codika status --json | jq '.useCase'
```

**Expect**: `null` (since `/tmp` is not a use case). The command uses `.` (cwd) as the default path argument.

**Why**: `codika status` without a path should check the cwd, matching the `git status` mental model.

---

## [P] `--json` flag — output is valid JSON

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq type
```

**Expect**: `"object"`. The entire output is parseable JSON (no ANSI escape codes, no extra text).

**Why**: Machine-readable output must be clean JSON. The human-readable path uses ANSI codes that would break JSON parsing.

---

## [P] `--verify` flag — runs validation on valid use case

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --verify --json | jq '.readiness.validation'
```

**Expect**: Non-null object with `valid` (boolean), `mustViolations` (number), `shouldWarnings` (number). The fixture currently has 3 must violations (WORKFLOW-SETTINGS, WEBHOOK-ID, WEBHOOK-AUTH): `valid: false`, `mustViolations: 3`.

**Why**: `--verify` adds an inline validation pass. The fixture has known violations that are reflected in the validation result.

---

## [P] `--verify` flag — validation failure adds to missing

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --verify --json | jq '.readiness'
```

**Expect**: Exit code 1. `validation` object present with `valid: false`, `mustViolations` > 0. `missing` array includes a `"Validation failed"` entry alongside the structural missing items.

**Why**: When `--verify` finds violations, they are added to the `missing` array so readiness reflects validation state too.

---

## [P] `--verify` flag — human-readable shows validation section

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --verify
```

**Expect**: Exit code 0. Output contains a `Validation failed (3 must, 1 should)` line between the Use Case section and the Readiness section. The fixture currently has 3 must violations (WORKFLOW-SETTINGS, WEBHOOK-ID, WEBHOOK-AUTH) and 1 should warning.

**Why**: Verifies the human-readable formatter renders the validation section when `--verify` is used. The fixture has known violations.

---

## [P] `--verify` without a use case is a no-op

```bash
codika status /tmp --verify --json | jq '.readiness.validation'
```

**Expect**: `null` (validation is skipped when `isUseCase` is false). No error.

**Why**: Source code gates on `runVerify && isUseCase`. Running `--verify` on a non-use-case path should not crash.

---

## [P] `--project-file` flag — custom project file name

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --project-file "project-staging.json" --json | jq '.useCase.hasProjectJson'
```

**Expect**: `false` (no `project-staging.json` exists in the fixture). `projectId` = `null`. `readiness.missing` includes the project.json entry.

**Why**: `--project-file` overrides the default `project.json` filename. When the custom file doesn't exist, the status reflects that.

---

## [P] `--project-file` flag — reads from specified file

This test requires the custom file to exist. If `project.json` is the only file in the fixture, this test documents the expected behavior: the flag changes which file is read.

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --project-file "project.json" --json | jq '.useCase.hasProjectJson'
```

**Expect**: `true` (the fixture has `project.json`). `projectId` = `"test-project-id-12345"`.

**Why**: Passing the default name explicitly should produce the same result as omitting the flag. Confirms the flag is wired through to `readProjectJson()`.

---

## [N] Not logged in — identity reflects no auth

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile nonexistent-profile --json | jq '.identity'
```

**Expect**: `loggedIn: false`, `profileName: null`, `organizationName: null`, `keyPrefix: null`.

**Why**: Without authentication, the identity section should clearly show the user is not logged in. Using `--profile nonexistent-profile` forces no-auth.

---

## [N] Not logged in — readiness blocked

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile nonexistent-profile --json | jq '.readiness'
```

**Expect**: Exit code 1. `ready: false`. `missing` includes `"No API key (run 'codika login')"`.

**Why**: Without an API key, deployment is impossible. Status should surface this as a missing prerequisite. Using `--profile nonexistent-profile` forces no-auth.

---

## [N] Exit code 1 — use case detected but not ready

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --json > /tmp/status-out.json 2>&1; echo "EXIT:$?"
```

**Expect**: `EXIT:1`. The output is valid JSON with `readiness.ready: false`.

**Why**: The source code exits with code 1 when `hasUseCase && !result.readiness.ready`. The `invalid-config` fixture (has config.ts but missing workflows + project.json) triggers this path.

---

## [N] Exit code 0 — no use case detected (not an error)

```bash
codika status /tmp --json > /tmp/status-out.json 2>&1; echo "EXIT:$?"
```

**Expect**: `EXIT:0`. No use case means the command is informational, not a failure.

**Why**: Important distinction from exit code 1. Non-use-case directories get exit 0 because there's nothing to be "not ready" about.

---

## [P] Readiness warnings — profile mismatch

This test requires a use case whose `project.json` has an `organizationId` that differs from the active profile's org. If the valid fixture gains an `organizationId` that doesn't match the test org, this test becomes active.

```bash
# Hypothetical: if project.json had organizationId "different-org-id"
codika status <path-with-mismatched-org> --json | jq '.readiness.warnings'
```

**Expect**: Warnings array contains a message about active profile org not matching project.json org, with a `try: codika use <name>` suggestion if a matching profile exists.

**Why**: Profile mismatch is a common deployment mistake — deploying with a key from org A to a project in org B will fail at the Cloud Function level.

---

## [P] Readiness warnings — key expiry (observational)

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.readiness.warnings'
```

**Expect**: Array. May contain an expiry warning (`"API key expires in N days"` or `"API key has expired"`) if the test profile's key is near expiry. Otherwise empty.

**Why**: The `checkProfileExpiry()` function adds warnings for keys expiring within 7 days or already expired. This is observational — the actual warning depends on the key's expiry date.

---

## [S] Use case detection — config.ts alone is sufficient

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --json | jq '.useCase != null'
```

**Expect**: `true`. The `invalid-config` fixture has `config.ts` but no `workflows/` directory. The source uses `hasConfigTs || hasWorkflowsDir` for detection, so `config.ts` alone triggers use case mode.

**Why**: Edge case — a use case folder might have config.ts before workflows are created. Status should still detect it.

---

## [S] Use case detection — workflows/ alone is sufficient

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/missing-config --json | jq '.useCase != null'
```

**Expect**: `true`. The `missing-config` fixture has only a `workflows/` directory. Detection triggers because `hasWorkflowsDir` is true.

**Why**: Edge case — workflows/ without config.ts should still be detected as a (incomplete) use case.

---

## Last tested

2026-04-04
