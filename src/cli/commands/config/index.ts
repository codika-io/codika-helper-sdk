/**
 * Config Command
 *
 * Parent command for managing CLI configuration.
 *
 * Usage:
 *   codika-helper config set      Save API key and base URL
 *   codika-helper config show     Display current configuration
 *   codika-helper config clear    Remove saved configuration
 */

import { Command } from 'commander';
import { configSetCommand } from './set.js';
import { configShowCommand } from './show.js';
import { configClearCommand } from './clear.js';

export const configCommand = new Command('config')
  .description('Manage CLI configuration (API key, base URL)')
  .addCommand(configSetCommand)
  .addCommand(configShowCommand)
  .addCommand(configClearCommand);

export { runConfigSet } from './set.js';
export type { ConfigSetOptions } from './set.js';
