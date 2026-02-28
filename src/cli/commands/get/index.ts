/**
 * Get Command
 *
 * Parent command that contains subcommands for fetching
 * use cases and other resources from the Codika platform.
 *
 * Usage:
 *   codika-helper get use-case <projectId> [outputPath]
 *   codika-helper get execution <executionId> [options]
 */

import { Command } from 'commander';
import { useCaseCommand } from './use-case.js';
import { executionCommand } from './execution.js';

export const getCommand = new Command('get')
  .description('Fetch use cases and resources from the Codika platform')
  .addCommand(useCaseCommand)
  .addCommand(executionCommand);
