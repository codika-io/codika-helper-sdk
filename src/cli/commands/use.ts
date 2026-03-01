/**
 * Use Command
 *
 * Switch the active profile or list all available profiles.
 *
 * Usage:
 *   codika-helper use              # list profiles
 *   codika-helper use <name>       # switch to profile
 */

import { Command, Option } from 'commander';
import {
  listProfiles,
  setActiveProfile,
  maskApiKey,
} from '../../utils/config.js';

export const useCommand = new Command('use')
  .description('Switch active profile or list profiles')
  .argument('[name]', 'Profile name to switch to')
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
      console.log("No profiles configured. Run 'codika-helper login' to add one.");
      console.log('');
      process.exit(1);
    }

    if (!name) {
      // List all profiles
      console.log('');
      console.log('Profiles:');
      console.log('');
      for (const { name: pName, profile, active } of profiles) {
        const marker = active ? '\u25cf' : ' ';
        const orgLabel = profile.type === 'admin-api-key'
          ? '(admin)'
          : (profile.organizationName || '');
        const keyDisplay = maskApiKey(profile.apiKey);
        console.log(`  ${marker} ${pName.padEnd(20)} ${orgLabel.padEnd(20)} ${keyDisplay}`);
      }
      console.log('');
      console.log('Use: codika-helper use <name>');
      console.log('');
      return;
    }

    // Switch to profile
    const exists = profiles.find(p => p.name === name);
    if (!exists) {
      const available = profiles.map(p => p.name).join(', ');
      console.error(`\x1b[31mError:\x1b[0m Profile "${name}" not found. Available: ${available}`);
      process.exit(1);
    }

    setActiveProfile(name);

    console.log('');
    console.log(`\x1b[32m\u2713 Switched to "${name}"\x1b[0m`);
    console.log('');
    if (exists.profile.type !== 'admin-api-key' && exists.profile.organizationName) {
      console.log(`  Organization: ${exists.profile.organizationName}`);
    }
    console.log(`  Key:          ${maskApiKey(exists.profile.apiKey)}`);
    console.log('');
  });
