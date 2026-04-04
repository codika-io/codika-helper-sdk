# Framework Improvements

Ideas for turning this from "organized manual testing" into an open-sourceable CLI testing framework. Ordered by impact.

## 1. Machine-verifiable assert blocks (highest impact)

Each test should have a prose `Expect` (for humans) AND an executable `assert` block (for machines). The assert is a bash one-liner that exits 0 on pass, 1 on fail:

```markdown
## [P] Owner lists all projects {#LP-01}

\`\`\`bash
codika list projects --profile cli-test-owner-full --json
\`\`\`

\`\`\`assert
codika list projects --profile cli-test-owner-full --json \
  | jq -e '.success == true and (.data.projects | length) == .data.count'
\`\`\`

**Why**: Confirms the basic flow works.
```

This turns "compare output visually" into "run and check exit code." An agent or simple loop can execute the whole suite without interpreting prose.

## 2. Stable test IDs

Replace positional references ("config.md #3") with stable IDs in each test header:

```markdown
## [P] Owner lists all projects {#LP-01}
```

Convention: 2-letter playbook prefix + sequential number. Examples:
- `LP` = list-projects, `GI` = get-instance, `DU` = deploy-use-case
- `AU` = auth, `CF` = config, `VR` = verify, `IN` = init
- `TR` = trigger, `RD` = redeploy, `PB` = publish
- `IG` = integration, `NT` = notes, `IA` = instance-activate

Results files then reference `LP-01` instead of fragile positions. Easy to grep across runs for regression tracking.

## 3. Minimal runner script

A ~50 line bash script (`run.sh`) that:
1. Takes a playbook path as argument: `./run.sh commands/list-projects.md`
2. Parses all ` ```assert ` fenced blocks
3. Runs each one, captures exit code
4. Prints `PASS LP-01 — Owner lists all projects` or `FAIL LP-01 — ...` with actual output on failure
5. Writes results to `results/YYYY-MM-DD.md` automatically
6. Supports `./run.sh --batch 2` to run all playbooks in a batch
7. Supports `./run.sh --all` for the full suite

This is the difference between "we have test docs" and "we have a test suite." People will write playbooks if running them is one command.

## 4. Snapshot/baseline mechanism

First run captures golden outputs. Subsequent runs diff against them.

```
snapshots/
  LP-01.json    ← captured golden output
  GI-05.json
  DU-03.json
```

For JSON outputs: `jq -S` (sorted keys) before snapshot to avoid false diffs from key ordering. When a snapshot diffs, you either update it (`./run.sh --update-snapshot LP-01`) or file a bug.

Same pattern as Jest snapshot testing — works because CLI JSON output is deterministic for the same input state.

## 5. Test fixtures directory

Known-good test resources that playbooks reference:

```
fixtures/
  valid-use-case/        ← config.ts + workflows/ that always pass verify
  invalid-use-case/      ← missing Codika Init, for negative tests
  invalid-workflow.json  ← malformed JSON
  test-payload.json      ← trigger payload
  test-document.md       ← deploy documents input
  large-logo.png         ← 5MB+ file for logo validation
```

Tests become idempotent — they read from fixtures instead of depending on whatever was deployed last. Currently some tests create temp files inline; fixtures would centralize this.

## 6. Playbook prerequisite headers

Each playbook should declare what it needs:

```markdown
---
requires-profiles: [cli-test-owner-full, cli-test-member, cli-test-limited]
requires-resources: [test-project, dev-instance]
depends-on: []  # or [deploy-use-case] for publish.md
fixtures: [valid-use-case]
---
```

A runner could check prerequisites before starting and skip playbooks whose dependencies haven't passed.

## 7. Regression detection across runs

A diff script that compares two results files:

```bash
./diff-results.sh results/2026-03-31.md results/2026-04-04.md
```

Output:
```
REGRESSION: LP-03 was PASS, now FAIL
FIXED:      CF-07 was FAIL, now PASS
NEW:        LP-11, LP-12, LP-13, LP-14 (added since last run)
REMOVED:    (none)
```

This makes the results files useful over time instead of isolated snapshots.

## 8. Source file linking and staleness detection

Each playbook header links to the source files it covers:

```markdown
<!-- covers: src/cli/commands/list/projects.ts -->
<!-- last verified against: commit abc1234 -->
```

A script checks: "source file changed since last verified commit" → "playbook may be stale." Could run in CI after every CLI change to flag which playbooks need re-testing.

## 9. Idempotent state-changing tests

Currently, running `deploy-use-case.md` twice bumps the version twice, changing expected outputs. State-changing tests should either:
- Use a dedicated "throwaway" project per run (created in batch setup, archived after)
- Or assert relative conditions ("version is higher than before") instead of absolute ones ("version is 1.1.0")

## Implementation order

| Phase | Items | Effort | Impact |
|-------|-------|--------|--------|
| 1 | Test IDs (#2) + assert blocks (#1) + fixtures (#5) | 1 day | Playbooks become executable |
| 2 | Runner script (#3) | Half day | One-command execution |
| 3 | Snapshots (#4) + prerequisite headers (#6) | Half day | Reproducibility |
| 4 | Regression diff (#7) + staleness detection (#8) | Half day | Long-term tracking |
| 5 | Idempotent writes (#9) | 1 day | Full re-runnability |

Phase 1+2 alone would make this worth a blog post. The pitch: **"Executable Markdown Testing for CLIs that talk to real infrastructure"** — the gap between unit tests (too isolated) and full E2E automation (too expensive to maintain).
