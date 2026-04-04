/**
 * Config Show Command
 *
 * Displays the current configuration with all profiles.
 * Exit 0 if configured, exit 1 if no profiles set.
 *
 * Usage:
 *   codika config show
 */

import { Command } from 'commander';
import {
  listProfiles,
  resolveBaseUrl,
  describeBaseUrlSource,
  maskApiKey,
  PRODUCTION_BASE_URL,
} from '../../../utils/config.js';

export const configShowCommand = new Command('show')
  .description('Display current configuration')
  .option('--json', 'Output as JSON')
  .action((options: { json?: boolean }) => {
    const profiles = listProfiles();
    const baseUrl = resolveBaseUrl();
    const urlSource = describeBaseUrlSource();

    if (options.json) {
      console.log(JSON.stringify({
        profiles: profiles.map(({ name, profile, active }) => ({
          name,
          active,
          type: profile.type,
          organizationId: profile.organizationId || null,
          organizationName: profile.organizationName || null,
          keyPrefix: profile.keyPrefix || maskApiKey(profile.apiKey),
          scopes: profile.scopes || [],
          expiresAt: profile.expiresAt || null,
        })),
        baseUrl,
        baseUrlSource: urlSource,
      }, null, 2));
      if (profiles.length === 0) {
        process.exit(0);
      }
      return;
    }

    console.log('');
    console.log('Codika Configuration');
    console.log('');

    if (profiles.length === 0) {
      console.log('  No profiles configured.');
      console.log('');
      console.log("Run 'codika login' to configure your API key.");
      console.log('');
      process.exit(1);
    }

    console.log('  Profiles:');
    console.log('');
    for (const { name, profile, active } of profiles) {
      const marker = active ? '\u25cf' : ' ';
      const orgLabel = profile.type === 'admin-api-key'
        ? '(admin)'
        : (profile.organizationName || '');
      const keyDisplay = maskApiKey(profile.apiKey);
      console.log(`    ${marker} ${name.padEnd(20)} ${orgLabel.padEnd(20)} ${keyDisplay}`);
    }
    console.log('');

    // Only show base URL if it's not the default
    if (baseUrl !== PRODUCTION_BASE_URL) {
      console.log(`  Base URL: ${baseUrl}  (${urlSource})`);
      console.log('');
    }
  });
