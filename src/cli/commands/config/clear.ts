/**
 * Config Clear Command
 *
 * Deletes the entire config file or a single profile.
 *
 * Usage:
 *   codika config clear                  # clear all
 *   codika config clear --profile <name> # clear one profile
 */

import { Command } from 'commander';
import { clearConfig, removeProfile, listProfiles } from '../../../utils/config.js';

export const configClearCommand = new Command('clear')
  .description('Remove saved configuration')
  .option('--profile <name>', 'Remove only this profile')
  .action((options: { profile?: string }) => {
    if (options.profile) {
      const profiles = listProfiles();
      const exists = profiles.find(p => p.name === options.profile);
      if (!exists) {
        console.error(`\x1b[31mError:\x1b[0m Profile "${options.profile}" not found.`);
        process.exit(1);
      }
      removeProfile(options.profile);
      console.log('');
      console.log(`\x1b[32m\u2713 Profile "${options.profile}" removed\x1b[0m`);
      console.log('');
    } else {
      clearConfig();
      console.log('');
      console.log('\x1b[32m\u2713 Configuration cleared\x1b[0m');
      console.log('');
    }
  });
