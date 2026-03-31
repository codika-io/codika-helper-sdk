# `codika verify use-case / verify workflow`

Local validation commands that check use-case folders and individual workflow JSON files for structural correctness, mandatory patterns, placeholder syntax, and cross-file consistency. No API call is made — all checks are local.

**Scope required**: None (local only)
**Method**: Local
**Cloud Function**: N/A

**Test fixtures**: `tests/validation/use-case-scripts/` contains pre-built fixtures with valid and invalid use cases. Paths below are relative to the SDK root.

---

## verify use-case

### [P] Valid use case passes

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case
```

**Expect**: Exit code 0. Output contains a validation passed indicator (e.g., check mark or `valid`). No `must` violations reported.

**Why**: Baseline — a well-formed use case with config.ts + workflows/ should pass all rules.

---

### [P] Valid use case — JSON output

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json
```

**Expect**: Exit code 0. JSON output with `valid: true`, `path` (absolute), `summary` object with `must: 0`, `findings` array (may contain `should`-severity items but no `must`), `filesValidated` count >= 1.

**Why**: Machine-readable output is essential for agents and CI pipelines. Verifies the JSON structure matches the documented schema.

---

### [P] JSON output includes ruleCount

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --json | jq '.ruleCount'
```

**Expect**: Object mapping rule names to occurrence counts (may be empty if all rules pass with zero findings).

**Why**: The `ruleCount` field helps identify which rules produced findings, useful for debugging and tracking rule coverage.

---

### [N] Invalid use case fails

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/invalid-config --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1 or 2. JSON output with `valid: false`, `findings` array contains at least one item with `severity: "must"`.

**Why**: A use case with a broken config.ts should be caught by the config-exports validation script.

---

### [P] --strict mode promotes should to must

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --strict --json | jq '.summary'
```

**Expect**: In strict mode, any `should`-severity findings are treated as `must`. If the use case had `should` warnings in normal mode, they now count as `must` violations and `valid` may flip to `false`.

**Why**: `--strict` is for pre-release gates where even soft recommendations should block deployment.

---

### [P] --fix mode applies auto-fixes

```bash
# Use a temp copy to avoid mutating fixtures
cp -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-fix-test && codika verify use-case /tmp/verify-fix-test --fix --json | jq '.valid'
```

**Expect**: `true`. Any auto-fixable findings are applied. The `findings` array may show `fixable: true` items that were resolved.

**Why**: `--fix` is the auto-repair mode — it modifies workflow JSON files in place to fix known issues (e.g., missing node positions, formatting).

**Cleanup**:
```bash
rm -rf /tmp/verify-fix-test
```

---

### [P] --dry-run shows what --fix would change

```bash
cp -r tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case /tmp/verify-dryrun-test && codika verify use-case /tmp/verify-dryrun-test --dry-run
```

**Expect**: Output shows what changes `--fix` would apply, but no files are actually modified. Original files remain unchanged.

**Why**: Users can preview fixes before committing to them.

**Cleanup**:
```bash
rm -rf /tmp/verify-dryrun-test
```

---

### [P] --rules flag runs only specific rules

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --rules "config-exports" --json | jq '.findings[] | .rule' | sort -u
```

**Expect**: Only findings from the `config-exports` rule appear (or empty if it passes). No findings from other rules.

**Why**: Targeted validation lets developers focus on specific rules during development without noise from unrelated checks.

---

### [P] --exclude-rules flag skips specific rules

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --exclude-rules "config-exports" --json | jq '.findings[] | .rule' | sort -u
```

**Expect**: No findings with rule name `config-exports`. Other rules still run normally.

**Why**: Users may want to suppress known rules (e.g., during migration) while keeping all other checks active.

---

### [P] --skip-workflows flag

```bash
codika verify use-case tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case --skip-workflows --json | jq '.filesValidated'
```

**Expect**: `filesValidated` count is lower than without the flag (only config-level checks run, individual workflow files are not validated).

**Why**: For large use cases with many workflows, skipping workflow validation speeds up config-only checks.

---

### [N] Missing path argument

```bash
codika verify use-case 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander error about missing required argument `<path>`.

**Why**: Client-side validation — the path argument is required.

---

### [N] Nonexistent path

```bash
codika verify use-case /tmp/nonexistent-use-case-path 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2, error message about the path not existing or not being a valid use case folder.

**Why**: The command should fail gracefully with a clear error when pointed at a path that doesn't exist.

---

## verify workflow

### [P] Valid workflow passes

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/*.json --json 2>/dev/null | head -1 | jq '.valid'
```

**Expect**: `true` for a well-formed workflow JSON file.

**Why**: Single-workflow validation baseline — ensures the workflow-level rules pass independently of use-case context.

---

### [P] Workflow JSON output structure

```bash
codika verify workflow tests/validation/use-case-scripts/config-exports/fixtures/valid-use-case/workflows/*.json --json 2>/dev/null | head -1 | jq 'keys'
```

**Expect**: Keys include `valid`, `path`, `summary`, `findings`. Each finding has `rule`, `severity`, `message`, `fixable`.

**Why**: Validates the JSON output contract for workflow-level verification.

---

### [N] Invalid JSON file

```bash
echo '{"not": "a workflow"}' > /tmp/bad-workflow.json && codika verify workflow /tmp/bad-workflow.json --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, `valid: false`, findings array contains errors about missing required workflow structure (e.g., no `nodes` array).

**Why**: Arbitrary JSON that isn't a valid n8n workflow should fail with specific structural errors.

**Cleanup**:
```bash
rm /tmp/bad-workflow.json
```

---

### [N] Non-JSON file

```bash
echo 'this is not json' > /tmp/not-json.txt && codika verify workflow /tmp/not-json.txt 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 2, error about failing to parse the file as JSON.

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

**Why**: Client-side validation — the path argument is required.

---

## Last tested

Not yet tested.
