/**
 * Verify Workflow Command
 *
 * Validates a single workflow JSON file using:
 * - Flowlint core rules (static analysis)
 * - Custom Codika rules
 * - Workflow scripts (content-based checks)
 *
 * Usage:
 *   codika-helper verify workflow <path> [options]
 *
 * Options:
 *   --json        Output result as JSON
 *   --strict      Treat 'should' as 'must'
 *   --fix         Apply available auto-fixes
 *   --dry-run     Show what --fix would change
 *   --rules       Only run specific rules (comma-separated)
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { validateWorkflow } from '../../../validation/runner.js';
import { formatValidationResult } from '../../utils/validation-output.js';

interface WorkflowCommandOptions {
  json?: boolean;
  strict?: boolean;
  fix?: boolean;
  dryRun?: boolean;
  rules?: string;
}

export const workflowCommand = new Command('workflow')
  .description('Validate a workflow JSON file')
  .argument('<path>', 'Path to the workflow JSON file')
  .option('--json', 'Output result as JSON')
  .option('--strict', 'Treat "should" severity as "must"')
  .option('--fix', 'Apply available auto-fixes')
  .option('--dry-run', 'Show what --fix would change without applying')
  .option('--rules <list>', 'Only run specific rules (comma-separated)')
  .action(async (path: string, options: WorkflowCommandOptions) => {
    const absolutePath = resolve(path);

    // Parse rules list if provided
    const rules = options.rules
      ? options.rules.split(',').map(r => r.trim())
      : undefined;

    try {
      const result = await validateWorkflow({
        path: absolutePath,
        strict: options.strict,
        fix: options.fix,
        dryRun: options.dryRun,
        rules,
      });

      if (options.json) {
        console.log(JSON.stringify({
          valid: result.valid,
          path: absolutePath,
          summary: result.summary,
          findings: result.findings.map(f => ({
            rule: f.rule,
            severity: f.severity,
            message: f.message,
            details: f.raw_details,
            line: f.line,
            nodeId: f.nodeId,
            fixable: f.fixable,
          })),
        }, null, 2));
      } else {
        console.log(formatValidationResult(result, absolutePath, {
          showFixTip: !options.fix && !options.dryRun,
          isDryRun: options.dryRun,
        }));
      }

      // Exit with appropriate code
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      console.error(`\n\x1b[31mError:\x1b[0m ${(error as Error).message}\n`);
      process.exit(2);
    }
  });
