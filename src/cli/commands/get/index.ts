/**
 * Get Command
 *
 * Parent command that contains subcommands for fetching
 * use cases and other resources from the Codika platform.
 *
 * Usage:
 *   codika get use-case <projectId> [outputPath]
 *   codika get execution <executionId> [options]
 *   codika get instance [processInstanceId] [options]
 */

import { Command } from 'commander';
import { useCaseCommand } from './use-case.js';
import { executionCommand } from './execution.js';
import { instanceCommand } from './instance.js';
import { projectCommand } from './project.js';
import { skillsCommand } from './skills.js';

export const getCommand = new Command('get')
  .description('Fetch use cases and resources from the Codika platform')
  .addCommand(useCaseCommand)
  .addCommand(executionCommand)
  .addCommand(instanceCommand)
  .addCommand(projectCommand)
  .addCommand(skillsCommand);
