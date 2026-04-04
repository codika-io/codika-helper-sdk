# `codika verify use-case` / `codika verify workflow`

Local validation commands that check use-case folders and individual workflow JSON files for structural correctness, mandatory patterns, placeholder syntax, and cross-file consistency. No API call is made -- all checks run locally.

**Scope required**: None (local only)
**Method**: Local filesystem
**Cloud Function**: N/A

**Test fixtures**: `tests/validation/use-case-scripts/` (use-case-level fixtures) and `tests/validation/workflow-scripts/` (workflow-level fixtures). Paths below are relative to the SDK root.

---

## verify use-case

### [P] Valid use case passes — human-readable output

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 0. Output contains a pass indicator (check mark or "passed"). No `must` violations listed.

**Why**: Baseline -- a well-formed use case with config.ts + workflows/ should pass all rules in default mode.

---

### [P] Valid use case passes — JSON output

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json
```

**Expect**: Exit code 0. JSON with `valid: true`, `path` (absolute), `summary` object with `must: 0`, `findings` array with no `severity: "must"` items, `filesValidated` >= 1, `ruleCount` object.

**Why**: Machine-readable output is essential for agents and CI pipelines. Verifies the full JSON structure.

---

### [P] JSON output has correct shape

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq 'keys'
```

**Expect**: Keys include `valid`, `path`, `summary`, `ruleCount`, `filesValidated`, `findings`.

**Why**: Confirms the JSON contract matches what agents and CI consumers rely on.

---

### [P] JSON ruleCount field

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.ruleCount'
```

**Expect**: Object mapping rule names to occurrence counts. May be empty `{}` if all rules pass with zero findings.

**Why**: `ruleCount` helps identify which rules produced findings -- useful for debugging and tracking rule coverage.

---

### [N] Invalid use case fails — missing config exports

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. JSON with `valid: false`, `findings` array contains at least one item with `severity: "must"`. Rule name should be config-exports related (e.g. `UC-CONFIG-EXPORTS`).

**Why**: A use case with a broken config.ts should be caught by the config-exports validation script.

---

### [N] Invalid use case fails — missing config entirely

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/missing-config --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1 or 2. Error about missing config.ts or invalid use case folder structure.

**Why**: A use case folder without config.ts is fundamentally broken and must be caught.

---

### [P] `--strict` promotes should to must

Run without strict first to establish baseline, then with strict:

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.summary'
```

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --strict --json | jq '.summary'
```

**Expect**: In strict mode, any `should`-severity findings are promoted to `must`. If the baseline had `should` warnings, strict mode increases the `must` count accordingly and may flip `valid` to `false`.

**Why**: `--strict` is for pre-release gates where even soft recommendations should block deployment.

---

### [P] `--fix` applies auto-fixes

```bash
cp -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-fix-test && codika verify use-case /tmp/verify-fix-test --fix --json | jq '{valid, findings: [.findings[] | select(.fixable == true)]}'
```

**Expect**: Exit code 0. Any auto-fixable findings (e.g. WF-SETTINGS, WF-SANITIZATION) are applied. The `findings` array may show `fixable: true` items that were resolved.

**Why**: `--fix` modifies workflow JSON files in place to fix known issues (missing settings, transient IDs).

**Cleanup**:
```bash
rm -rf /tmp/verify-fix-test
```

---

### [P] `--dry-run` shows changes without modifying files

```bash
cp -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-dryrun-test && codika verify use-case /tmp/verify-dryrun-test --dry-run 2>&1; echo "EXIT:$?"
```

**Expect**: Output shows what changes `--fix` would apply. No files are actually modified -- verify with `diff` against the original:

```bash
diff -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-dryrun-test
```

**Expect**: No differences (files unchanged).

**Why**: Users can preview fixes before committing to them.

**Cleanup**:
```bash
rm -rf /tmp/verify-dryrun-test
```

---

### [P] `--fix` modifies files but `--dry-run` does not

This test proves `--fix` and `--dry-run` differ in file mutation behavior. Use a fixture with a fixable issue (WF-SANITIZATION):

```bash
cp tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json /tmp/fixable-wf.json && BEFORE=$(md5 -q /tmp/fixable-wf.json) && cp -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-fix-mutation-test
```

Replace the workflow in the temp use case with the fixable one, run `--dry-run`, confirm no change, then run `--fix`, confirm change:

```bash
cp /tmp/fixable-wf.json /tmp/verify-fix-mutation-test/workflows/main-workflow.json && codika verify use-case /tmp/verify-fix-mutation-test --dry-run > /dev/null 2>&1 && AFTER_DRY=$(md5 -q /tmp/verify-fix-mutation-test/workflows/main-workflow.json) && codika verify use-case /tmp/verify-fix-mutation-test --fix > /dev/null 2>&1 && AFTER_FIX=$(md5 -q /tmp/verify-fix-mutation-test/workflows/main-workflow.json) && echo "dry-run changed: $( [ "$BEFORE" = "$AFTER_DRY" ] && echo NO || echo YES )" && echo "fix changed: $( [ "$BEFORE" = "$AFTER_FIX" ] && echo NO || echo YES )"
```

**Expect**: `dry-run changed: NO`, `fix changed: YES`.

**Why**: Critical correctness check -- `--dry-run` must never mutate files, `--fix` must actually write changes.

**Cleanup**:
```bash
rm -rf /tmp/verify-fix-mutation-test /tmp/fixable-wf.json
```

---

### [P] `--rules` runs only specified rules

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --rules "UC-CONFIG-EXPORTS" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: Array contains only `"UC-CONFIG-EXPORTS"` (or is empty if the rule passes). No findings from other rules like `CK-INIT`, `WF-SETTINGS`, etc.

**Why**: Targeted validation lets developers focus on specific rules during development without noise from unrelated checks.

---

### [P] `--rules` with multiple comma-separated values

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --rules "UC-CONFIG-EXPORTS,CK-INIT" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: Only `UC-CONFIG-EXPORTS` and/or `CK-INIT` findings (or empty if both pass). No other rule names present.

**Why**: Verifies comma-separated rule filtering works for multiple rules.

---

### [P] `--exclude-rules` skips specified rules

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --exclude-rules "UC-CONFIG-EXPORTS" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: No findings with rule `UC-CONFIG-EXPORTS`. All other rules still run normally.

**Why**: Users may want to suppress known rules during migration while keeping all other checks active.

---

### [P] `--exclude-rules` with multiple values

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --exclude-rules "UC-CONFIG-EXPORTS,WF-SETTINGS" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: No findings with rule `UC-CONFIG-EXPORTS` or `WF-SETTINGS`. Other rules still run.

**Why**: Verifies comma-separated exclusion works for multiple rules.

---

### [P] `--skip-workflows` skips individual workflow validation

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.filesValidated'
```

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --skip-workflows --json | jq '.filesValidated'
```

**Expect**: The `--skip-workflows` count is lower than the default count. Only config-level and use-case-level checks run; individual workflow files are not validated. Workflow-specific rules (CK-INIT, WF-SETTINGS, CK-PLACEHOLDERS, etc.) should not appear in findings.

**Why**: For large use cases with many workflows, skipping workflow validation speeds up config-only checks.

---

### [N] Missing path argument

```bash
codika verify use-case 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander error about missing required argument `<path>`.

**Why**: Client-side validation -- the path argument is required by Commander.

---

### [N] Nonexistent path

```bash
codika verify use-case /tmp/nonexistent-use-case-path-xyz 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2. Error message about the path not existing or not being a valid use case folder.

**Why**: The command should fail gracefully with a clear error when pointed at a nonexistent path.

---

### [N] Path is a file, not a directory

```bash
codika verify use-case tests/validation/workflow-scripts/workflow-sanitization/fixtures/valid-clean.json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2. Error about the path not being a valid use case folder (it's a file, not a directory).

**Why**: The use-case command expects a directory. Passing a file should produce a clear error, not a confusing crash.

---

## verify workflow

### [P] Valid workflow passes — human-readable output

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/main-workflow.json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 0. Output contains a pass indicator (check mark or "passed"). No `must` violations.

**Why**: Single-workflow validation baseline -- ensures workflow-level rules pass independently of use-case context.

---

### [P] Valid workflow passes — JSON output

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/main-workflow.json --json
```

**Expect**: Exit code 0. JSON with `valid: true`, `path` (absolute), `summary` with `must: 0`, `findings` array with no `must`-severity items.

**Why**: Machine-readable output for the workflow subcommand.

---

### [P] Workflow JSON output has correct shape

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/main-workflow.json --json | jq 'keys'
```

**Expect**: Keys include `valid`, `path`, `summary`, `findings`. Each finding (if any) has `rule`, `severity`, `message`, `fixable`.

**Why**: Validates the JSON output contract for workflow-level verification.

---

### [P] Workflow findings include expected fields

```bash
codika verify workflow tests/validation/workflow-scripts/placeholder-syntax/fixtures/invalid-placeholder-suffix.json --json | jq '.findings[0] | keys'
```

**Expect**: Keys include at least `rule`, `severity`, `message`, `fixable`. May also include `details`, `line`, `nodeId`.

**Why**: Confirms each finding object has the documented shape.

---

### [N] Invalid workflow — bad placeholder syntax

```bash
codika verify workflow tests/validation/workflow-scripts/placeholder-syntax/fixtures/invalid-placeholder-suffix.json --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. `valid: false`, findings contain at least one `CK-PLACEHOLDERS` rule violation with `severity: "must"`.

**Why**: Invalid placeholder suffixes must be caught by the placeholder syntax rule.

---

### [N] Invalid workflow — unsanitized fields

```bash
codika verify workflow tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. `valid: false`, findings contain `WF-SANITIZATION` rule violation. The finding should have `fixable: true`.

**Why**: Workflows with transient IDs (versionId, meta, active) must be flagged, and these are auto-fixable.

---

### [P] `--json` flag on workflow

```bash
codika verify workflow tests/validation/workflow-scripts/workflow-sanitization/fixtures/valid-clean.json --json | jq '.valid'
```

**Expect**: `true`.

**Why**: Confirms `--json` flag works for a passing workflow.

---

### [P] `--strict` on workflow

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/main-workflow.json --strict --json | jq '.summary'
```

**Expect**: In strict mode, `should`-severity findings are promoted to `must`. The `must` count in the summary is >= the non-strict `must` count.

**Why**: `--strict` must work identically on the workflow subcommand.

---

### [P] `--fix` on workflow

```bash
cp tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json /tmp/fix-workflow-test.json && codika verify workflow /tmp/fix-workflow-test.json --fix --json | jq '.valid'
```

**Expect**: `true` (or at least the WF-SANITIZATION finding is resolved). The file at `/tmp/fix-workflow-test.json` is modified in place.

**Why**: `--fix` must apply auto-fixes to individual workflow files, not just use-case folders.

**Cleanup**:
```bash
rm /tmp/fix-workflow-test.json
```

---

### [P] `--dry-run` on workflow does not modify file

```bash
cp tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json /tmp/dryrun-workflow-test.json && BEFORE=$(md5 -q /tmp/dryrun-workflow-test.json) && codika verify workflow /tmp/dryrun-workflow-test.json --dry-run > /dev/null 2>&1 && AFTER=$(md5 -q /tmp/dryrun-workflow-test.json) && echo "changed: $( [ "$BEFORE" = "$AFTER" ] && echo NO || echo YES )"
```

**Expect**: `changed: NO`.

**Why**: `--dry-run` must never mutate files, even when fixable violations exist.

**Cleanup**:
```bash
rm /tmp/dryrun-workflow-test.json
```

---

### [P] `--rules` on workflow

```bash
codika verify workflow tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json --rules "WF-SANITIZATION" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: Only `"WF-SANITIZATION"` findings (or empty). No findings from other rules like `CK-INIT`, `CK-PLACEHOLDERS`.

**Why**: Rule filtering must work on the workflow subcommand.

---

### [P] `--exclude-rules` on workflow

```bash
codika verify workflow tests/validation/workflow-scripts/workflow-sanitization/fixtures/invalid-has-id.json --exclude-rules "WF-SANITIZATION" --json | jq '[.findings[] | .rule] | unique'
```

**Expect**: No `WF-SANITIZATION` findings. Other rules still run and may produce findings.

**Why**: Rule exclusion must work on the workflow subcommand.

---

### [N] Invalid JSON file — not a workflow

```bash
echo '{"not": "a workflow"}' > /tmp/bad-workflow.json && codika verify workflow /tmp/bad-workflow.json --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. `valid: false`, findings contain errors about missing required workflow structure (no `nodes` array, etc.).

**Why**: Arbitrary JSON that is not a valid n8n workflow should fail with specific structural errors.

**Cleanup**:
```bash
rm /tmp/bad-workflow.json
```

---

### [N] Non-JSON file

```bash
echo 'this is not json' > /tmp/not-json.txt && codika verify workflow /tmp/not-json.txt 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2. Error about failing to parse the file as JSON.

**Why**: The command should fail gracefully on non-JSON input with a clear parse error.

**Cleanup**:
```bash
rm /tmp/not-json.txt
```

---

### [N] Missing path argument

```bash
codika verify workflow 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander error about missing required argument `<path>`.

**Why**: Client-side validation -- the path argument is required by Commander.

---

### [N] Nonexistent file path

```bash
codika verify workflow /tmp/nonexistent-workflow-xyz.json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2. Error about the file not existing.

**Why**: The command should fail gracefully when pointed at a nonexistent file.

---

## Last tested

Not yet tested.
