/**
 * Instance Command
 *
 * Parent command for managing process instances.
 *
 * Usage:
 *   codika instance activate [processInstanceId] [options]
 *   codika instance deactivate [processInstanceId] [options]
 */

import { Command } from 'commander';
import { activateCommand } from './activate.js';
import { deactivateCommand } from './deactivate.js';

export const instanceCommand = new Command('instance')
  .description('Manage process instances')
  .addCommand(activateCommand)
  .addCommand(deactivateCommand);
