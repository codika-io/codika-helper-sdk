# CLI UX Testing — Agent Instructions

You are running a UX friction test for the `codika` CLI. Your job is NOT to execute pre-written commands — it's to **accomplish a goal** using the CLI, while a meta-agent or human observes how you do it.

## Your role

You are simulating a new user or agent encountering the CLI for the first time with a specific task. You should:

1. Read the scenario file to understand your goal and starting state
2. Try to accomplish the goal using only `codika --help`, subcommand help, and error messages
3. Work through problems yourself — retry, adapt, use `--help`
4. Do NOT read the functional test playbooks (`../cli-integration/commands/`), skill definitions, or documentation unless the scenario explicitly allows it

## What you can use

- `codika --help` and `codika <command> --help`
- Error messages from failed commands
- `codika status` to understand your current context
- `codika whoami` to check your identity
- Common sense about CLI conventions

## What you cannot use

- The test playbooks in `../cli-integration/commands/`
- The skill definitions in `core/app/codika-plugin/`
- The documentation in `platform/docs/operations/`
- Prior knowledge of the exact flags or workflows (pretend you're new)

## How to report

After each command you run, note:
- What you were trying to do
- What command you ran
- What happened (success, error, unexpected output)
- How you recovered (if it failed)
- Your friction assessment (none / low / medium / high / blocker)

At the end, summarize: total commands, errors, self-recoveries, stuck points, and improvement suggestions.

## Important

The value of this test is in your honest struggle. If something is confusing, say so. If an error message doesn't help, say so. If you have to guess a flag name, say so. Every friction point is a potential CLI improvement.
