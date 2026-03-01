/**
 * Logout Command
 *
 * Remove a profile from the config. Without argument, removes the active profile.
 *
 * Usage:
 *   codika-helper logout            # remove active profile
 *   codika-helper logout <name>     # remove specific profile
 */

import { Command, Option } from 'commander';
import {
  getActiveProfile,
  removeProfile,
  listProfiles,
} from '../../utils/config.js';

export const logoutCommand = new Command('logout')
  .description('Remove a profile')
  .argument('[name]', 'Profile name to remove (default: active profile)')
  .addOption(new Option('--list-names').hideHelp())
  .action((name: string | undefined, options: { listNames?: boolean }) => {
    // Hidden: print profile names one per line (for shell completion)
    if (options.listNames) {
      const profiles = listProfiles();
      for (const p of profiles) {
        console.log(p.name);
      }
      return;
    }

    const profiles = listProfiles();

    if (profiles.length === 0) {
      console.log('');
      console.log('No profiles configured.');
      console.log('');
      return;
    }

    const targetName = name || getActiveProfile()?.name;

    if (!targetName) {
      console.log('');
      console.log('No active profile to remove.');
      console.log('');
      process.exit(1);
    }

    const exists = profiles.find(p => p.name === targetName);
    if (!exists) {
      const available = profiles.map(p => p.name).join(', ');
      console.error(`\x1b[31mError:\x1b[0m Profile "${targetName}" not found. Available: ${available}`);
      process.exit(1);
    }

    removeProfile(targetName);

    const remaining = listProfiles();
    const newActive = remaining.find(p => p.active);

    console.log('');
    console.log(`\x1b[32m\u2713 Removed profile "${targetName}"\x1b[0m`);
    if (newActive) {
      console.log(`  Active profile is now "${newActive.name}"`);
    } else {
      console.log("  No profiles remaining. Run 'codika-helper login' to add one.");
    }
    console.log('');
  });
