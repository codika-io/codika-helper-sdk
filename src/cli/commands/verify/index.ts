/**
 * Verify Command
 *
 * Parent command that contains subcommands for validating
 * workflows and use-cases.
 *
 * Usage:
 *   codika verify workflow <path>
 *   codika verify use-case <path>
 */

import { Command } from 'commander';
import { workflowCommand } from './workflow.js';
import { useCaseCommand } from './use-case.js';

export const verifyCommand = new Command('verify')
  .description('Validate workflows and use-cases')
  .addCommand(workflowCommand)
  .addCommand(useCaseCommand);
