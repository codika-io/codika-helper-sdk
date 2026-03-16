/**
 * Use Command
 *
 * Switch the active profile or list all available profiles.
 *
 * Usage:
 *   codika use              # list profiles (human-readable)
 *   codika use --json       # list profiles (machine-readable, for agents)
 *   codika use <name>       # switch to profile
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
  .option('--json', 'Output profiles as JSON (includes organizationId for matching with project.json)')
  .addOption(new Option('--list-names').hideHelp())
  .action((name: string | undefined, options: { listNames?: boolean; json?: boolean }) => {
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
      if (options.json) {
        console.log(JSON.stringify({ activeProfile: null, profiles: [] }, null, 2));
      } else {
        console.log('');
        console.log("No profiles configured. Run 'codika login' to add one.");
        console.log('');
      }
      process.exit(profiles.length === 0 && !options.json ? 1 : 0);
    }

    if (!name) {
      // List all profiles
      if (options.json) {
        const activeProfile = profiles.find(p => p.active)?.name || null;
        console.log(JSON.stringify({
          activeProfile,
          profiles: profiles.map(({ name: pName, profile, active }) => ({
            name: pName,
            active,
            type: profile.type,
            organizationId: profile.organizationId || null,
            organizationName: profile.organizationName || null,
            keyPrefix: profile.keyPrefix || maskApiKey(profile.apiKey),
            scopes: profile.scopes || [],
            expiresAt: profile.expiresAt || null,
          })),
        }, null, 2));
        return;
      }

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
      console.log('Use: codika use <name>');
      console.log('Tip: codika use --json  (machine-readable output with organizationId)');
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
