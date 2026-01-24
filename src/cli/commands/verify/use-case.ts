/**
 * Verify Use-Case Command
 *
 * Validates an entire use-case folder including:
 * - Configuration file (config.ts)
 * - All workflow JSON files
 * - Cross-file consistency checks
 *
 * Usage:
 *   codika-helper verify use-case <path> [options]
 *
 * Options:
 *   --json            Output result as JSON
 *   --strict          Treat 'should' as 'must'
 *   --skip-workflows  Skip individual workflow validation
 *   --fix             Apply available auto-fixes
 *   --dry-run         Show what --fix would change
 *   --rules           Only run specific rules (comma-separated)
 *   --exclude-rules   Exclude specific rules (comma-separated)
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { validateUseCase } from '../../../validation/runner.js';
import { formatValidationResult } from '../../utils/validation-output.js';

interface UseCaseCommandOptions {
  json?: boolean;
  strict?: boolean;
  skipWorkflows?: boolean;
  fix?: boolean;
  dryRun?: boolean;
  rules?: string;
  excludeRules?: string;
}

export const useCaseCommand = new Command('use-case')
  .description('Validate a use-case folder')
  .argument('<path>', 'Path to the use-case folder')
  .option('--json', 'Output result as JSON')
  .option('--strict', 'Treat "should" severity as "must"')
  .option('--skip-workflows', 'Skip individual workflow validation')
  .option('--fix', 'Apply available auto-fixes')
  .option('--dry-run', 'Show what --fix would change without applying')
  .option('--rules <list>', 'Only run specific rules (comma-separated)')
  .option('--exclude-rules <list>', 'Exclude specific rules (comma-separated)')
  .action(async (path: string, options: UseCaseCommandOptions) => {
    const absolutePath = resolve(path);

    // Parse rules list if provided
    const rules = options.rules
      ? options.rules.split(',').map(r => r.trim())
      : undefined;

    // Parse exclude rules list if provided
    const excludeRules = options.excludeRules
      ? options.excludeRules.split(',').map(r => r.trim())
      : undefined;

    try {
      const result = await validateUseCase({
        path: absolutePath,
        strict: options.strict,
        skipWorkflows: options.skipWorkflows,
        fix: options.fix,
        dryRun: options.dryRun,
        rules,
        excludeRules,
      });

      if (options.json) {
        console.log(JSON.stringify({
          valid: result.valid,
          path: absolutePath,
          summary: result.summary,
          filesValidated: result.filesValidated,
          findings: result.findings.map(f => ({
            rule: f.rule,
            severity: f.severity,
            message: f.message,
            details: f.raw_details,
            path: f.path,
            line: f.line,
            nodeId: f.nodeId,
            fixable: f.fixable,
          })),
        }, null, 2));
      } else {
        console.log(formatValidationResult(result, absolutePath, {
          showFixTip: !options.fix && !options.dryRun,
          isDryRun: options.dryRun,
          isUseCase: true,
        }));
      }

      // Exit with appropriate code
      process.exit(result.valid ? 0 : 1);
    } catch (error) {
      console.error(`\n\x1b[31mError:\x1b[0m ${(error as Error).message}\n`);
      process.exit(2);
    }
  });
