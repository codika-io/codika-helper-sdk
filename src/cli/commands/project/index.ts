/**
 * Project Command
 *
 * Parent command that contains subcommands for managing
 * projects on the Codika platform.
 *
 * Usage:
 *   codika-helper project create --name "My Project"
 */

import { Command } from 'commander';
import { createProjectCommand } from './create.js';

export const projectCommand = new Command('project')
  .description('Manage projects on the Codika platform')
  .addCommand(createProjectCommand);
