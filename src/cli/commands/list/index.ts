/**
 * List Command
 *
 * Parent command for listing resources from the Codika platform.
 *
 * Usage:
 *   codika list executions <processInstanceId> [options]
 *   codika list instances [options]
 */

import { Command } from 'commander';
import { executionsCommand } from './executions.js';
import { instancesCommand } from './instances.js';

export const listCommand = new Command('list')
  .description('List resources from the Codika platform')
  .addCommand(executionsCommand)
  .addCommand(instancesCommand);
