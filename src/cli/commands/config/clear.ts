/**
 * Config Clear Command
 *
 * Deletes the config file.
 *
 * Usage:
 *   codika-helper config clear
 */

import { Command } from 'commander';
import { clearConfig } from '../../../utils/config.js';

export const configClearCommand = new Command('clear')
  .description('Remove saved configuration')
  .action(() => {
    clearConfig();
    console.log('');
    console.log('\x1b[32m\u2713 Configuration cleared\x1b[0m');
    console.log('');
  });
