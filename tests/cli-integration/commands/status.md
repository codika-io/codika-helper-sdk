# `codika status [path]`

Shows identity, use case context, and deploy readiness — like `git status` for Codika. Reads local files (config.ts, project.json, version.json, workflows/) and the active profile to determine if a use case is ready to deploy. Optionally runs validation with `--verify`.

**Scope required**: None (local only, unless `--verify` triggers validation that itself is local)
**Method**: Local
**Cloud Function**: N/A

---

### [P] Status from a valid use-case folder — JSON

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile cli-test-owner-full --json
```

**Expect**: JSON with three top-level sections: `identity`, `useCase`, `readiness`. `identity.loggedIn` = `true`, `identity.profileName` = `"cli-test-owner-full"`, `identity.organizationName` = `"Test Organization from CLI"`. `useCase` is non-null with `hasConfigTs: true`, `hasWorkflowsDir: true`, `workflowCount` >= 1.

**Why**: Core happy path — verifies that status gathers identity + use case context correctly from a known-good fixture.

---

### [P] Status human-readable output

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile cli-test-owner-full
```

**Expect**: Output contains `Identity` section with Organization, Profile, Key. `Use Case:` section with Path, Version, Workflows count, Project ID (or `not configured`), Profile Match status. Readiness section at the bottom.

**Why**: Human-readable output is the primary UX — verifies the formatting and all sections are present.

---

### [P] Identity section shows profile count

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile cli-test-owner-full --json | jq '.identity.profileCount'
```

**Expect**: Number >= 4 (at least the 4 test profiles from setup.md).

**Why**: The profile count helps users understand how many profiles are configured without running `codika use`.

---

### [P] Use case detection — config.ts presence

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.hasConfigTs'
```

**Expect**: `true`.

**Why**: The presence of `config.ts` is one of two signals (along with `workflows/` directory) that a folder is a use case.

---

### [P] Use case shows workflow count

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.workflowCount'
```

**Expect**: Number >= 1 (the valid fixture has at least one workflow JSON file).

**Why**: Workflow count is a quick health check — zero workflows means the use case isn't ready for deployment.

---

### [P] Use case shows version

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.useCase.currentVersion'
```

**Expect**: A semver string (e.g., `"1.0.0"`). `hasVersionJson` indicates whether a `version.json` exists or the version is a default.

**Why**: Version tracking is essential for deployment — status should surface the current version.

---

### [P] Profile match detection — match

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile cli-test-owner-full --json | jq '.useCase.profileMatch'
```

**Expect**: If the fixture's `project.json` has an `organizationId` matching the owner profile's org, `status` = `"match"` with `profileName` = `"cli-test-owner-full"`. If no `organizationId` in project.json, `status` = `"no-org-in-project"`.

**Why**: Profile match detection prevents deploying to the wrong organization — it compares the active profile's org with project.json's org.

---

### [P] Status from a non-use-case folder

```bash
codika status /tmp --profile cli-test-owner-full --json
```

**Expect**: Exit code 0. `useCase` = `null`. `readiness.ready` = `false`. `identity` section is still populated. Output does not contain error — it's informational.

**Why**: Running status from a random directory should gracefully report "no use case detected" without failing. Exit 0 because the command itself succeeded.

---

### [P] --verify flag runs validation

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --verify --json | jq '.readiness.validation'
```

**Expect**: Non-null `validation` object with `valid: true`, `mustViolations: 0`, `shouldWarnings` (number).

**Why**: `--verify` adds a quick validation pass to the status output, showing whether the use case would pass `codika verify use-case`.

---

### [P] --project-file flag

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --project-file "project-staging.json" --json | jq '.useCase.hasProjectJson'
```

**Expect**: `false` (assuming no `project-staging.json` exists in the fixture). The command looks for the custom project file instead of the default `project.json`.

**Why**: Users with per-environment project files need status to read the correct one.

---

### [P] Readiness — missing items

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --profile cli-test-owner-full --json | jq '.readiness.missing'
```

**Expect**: Non-empty array listing what's missing for deployment (e.g., `"Missing project.json"`, or validation failures).

**Why**: The `missing` array is the actionable output — it tells users exactly what to fix before deploying.

---

### [P] Default path is current directory

```bash
cd /tmp && codika status --profile cli-test-owner-full --json | jq '.useCase'
```

**Expect**: `null` (since `/tmp` is not a use case folder). The command uses `.` (current directory) as the default path when no argument is provided.

**Why**: Convenience — `codika status` without a path should check the current directory, matching the `git status` mental model.

---

### [N] Not logged in

```bash
CODIKA_API_KEY="" codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.identity.loggedIn'
```

**Expect**: `false`. `readiness.missing` includes `"No API key"` entry. `readiness.ready` = `false`.

**Why**: Without authentication, deployment is impossible. Status should surface this as a missing prerequisite.

---

### [P] Readiness warnings — profile mismatch

If the active profile's `organizationId` doesn't match the use case's `project.json` `organizationId`:

```bash
codika status tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --profile cli-test-owner-full --json | jq '.readiness.warnings'
```

**Expect**: If there's a mismatch, the warnings array contains a message about active profile org not matching project.json org, with a `try: codika use <name>` suggestion. If there's a match (or no org in project.json), warnings may be empty.

**Why**: Profile mismatch is a common deployment mistake — deploying with a key from org A to a project in org B will fail at the Cloud Function level. Status catches this early.

---

## Last tested

Not yet tested.
