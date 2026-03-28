/**
 * Who Am I Command
 *
 * Shows the currently authenticated identity by calling /verifyApiKey.
 * Falls back to cached profile data if the network call fails.
 *
 * Usage:
 *   codika whoami
 *   codika whoami --json
 */

import { Command } from 'commander';
import {
  resolveApiKey,
  resolveEndpointUrl,
  getActiveProfile,
  maskApiKey,
  describeApiKeySource,
} from '../../utils/config.js';
import { verifyApiKeyRemote, type VerifyResult } from './config/set.js';

export const whoamiCommand = new Command('whoami')
  .description('Show current authentication identity')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (options: { json?: boolean; profile?: string }) => {
    const apiKey = resolveApiKey(undefined, options.profile);
    const activeProfile = getActiveProfile();

    if (!apiKey) {
      if (options.json) {
        console.log(JSON.stringify({ loggedIn: false }));
      } else {
        console.log('');
        console.log("Not logged in. Run 'codika login' to authenticate.");
        console.log('');
      }
      process.exit(1);
    }

    // Call verifyApiKey for fresh data
    const verifyUrl = resolveEndpointUrl('verifyApiKey', undefined, options.profile);
    const result = await verifyApiKeyRemote(apiKey, verifyUrl);

    if (result.success && result.data) {
      if (options.json) {
        console.log(JSON.stringify({
          loggedIn: true,
          ...result.data,
          source: describeApiKeySource(),
          profileName: activeProfile?.name ?? null,
        }, null, 2));
        return;
      }

      const isAdmin = result.data.type === 'admin-api-key';
      const isPersonal = result.data.type === 'personal-api-key';

      console.log('');
      console.log(`Logged in to Codika${isAdmin ? ' (admin)' : isPersonal ? ' (personal)' : ''}`);
      console.log('');

      if (!isAdmin && !isPersonal && result.data.organizationName) {
        const orgDisplay = result.data.organizationId
          ? `${result.data.organizationName} (${result.data.organizationId})`
          : result.data.organizationName;
        console.log(`  Organization:  ${orgDisplay}`);
      }
      if (result.data.keyName) {
        console.log(`  Key name:      ${result.data.keyName}`);
      }
      console.log(`  Key:           ${maskApiKey(apiKey)}`);
      if (result.data.scopes && result.data.scopes.length > 0) {
        console.log(`  Scopes:        ${result.data.scopes.join(', ')}`);
      }
      if (result.data.expiresAt) {
        const expDate = new Date(result.data.expiresAt);
        const isExpired = expDate < new Date();
        const dateStr = expDate.toLocaleDateString();
        console.log(`  Expires:       ${dateStr}${isExpired ? ' \x1b[33m[EXPIRED]\x1b[0m' : ''}`);
      }
      if (activeProfile) {
        console.log(`  Profile:       ${activeProfile.name}`);
      }
      console.log('');
      return;
    }

    // Network error — fall back to cached profile data
    if (activeProfile) {
      if (options.json) {
        console.log(JSON.stringify({
          loggedIn: true,
          cached: true,
          ...activeProfile.profile,
          profileName: activeProfile.name,
        }, null, 2));
        return;
      }

      const isAdmin = activeProfile.profile.type === 'admin-api-key';
      const isPersonal = activeProfile.profile.type === 'personal-api-key';

      console.log('');
      console.log(`Logged in to Codika${isAdmin ? ' (admin)' : isPersonal ? ' (personal)' : ''}  \x1b[33m(cached \u2014 run 'codika login' to refresh)\x1b[0m`);
      console.log('');

      if (!isAdmin && !isPersonal && activeProfile.profile.organizationName) {
        const orgDisplay = activeProfile.profile.organizationId
          ? `${activeProfile.profile.organizationName} (${activeProfile.profile.organizationId})`
          : activeProfile.profile.organizationName;
        console.log(`  Organization:  ${orgDisplay}`);
      }
      if (activeProfile.profile.keyName) {
        console.log(`  Key name:      ${activeProfile.profile.keyName}`);
      }
      console.log(`  Key:           ${maskApiKey(apiKey)}`);
      if (activeProfile.profile.scopes && activeProfile.profile.scopes.length > 0) {
        console.log(`  Scopes:        ${activeProfile.profile.scopes.join(', ')}`);
      }
      console.log(`  Profile:       ${activeProfile.name}`);
      console.log('');
      return;
    }

    // No cached data, network failed
    if (options.json) {
      console.log(JSON.stringify({
        loggedIn: true,
        error: result.error || 'Failed to verify API key',
        key: maskApiKey(apiKey),
        source: describeApiKeySource(),
      }, null, 2));
    } else {
      console.log('');
      console.log('\x1b[33mCould not verify API key\x1b[0m');
      console.log('');
      console.log(`  Key:     ${maskApiKey(apiKey)}`);
      console.log(`  Source:  ${describeApiKeySource()}`);
      console.log(`  Error:   ${result.error || 'Unknown error'}`);
      console.log('');
    }
    process.exit(1);
  });
