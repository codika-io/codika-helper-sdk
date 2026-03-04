/**
 * List Command
 *
 * Parent command for listing resources from the Codika platform.
 *
 * Usage:
 *   codika-helper list executions <processInstanceId> [options]
 */

import { Command } from 'commander';
import { executionsCommand } from './executions.js';

export const listCommand = new Command('list')
  .description('List resources from the Codika platform')
  .addCommand(executionsCommand);
