/**
 * `codika auth signup-complete --email <email> --code <code>`
 *
 * Completes the CLI OTP signup flow: verifies the code, creates the user +
 * organization + `cko_` API key, and saves the key as a new active profile
 * in ~/.config/codika/config.json.
 */

import { Command } from 'commander';
import {
  resolveEndpointUrl,
  upsertProfile,
  setActiveProfile,
  readConfig,
  deriveProfileName,
  findProfileByOrgId,
  maskApiKey,
  PRODUCTION_BASE_URL,
  type ProfileData,
} from '../../../utils/config.js';
import { signupComplete } from '../../../utils/auth-flow-client.js';

interface SignupCompleteOptions {
  email: string;
  code: string;
  company?: string;
  description?: string;
  keyName?: string;
  keyExpiresIn?: string;
  baseUrl?: string;
  apiUrl?: string;
  name?: string;
  json?: boolean;
}

export const signupCompleteCommand = new Command('signup-complete')
  .description('Complete CLI OTP signup — verifies code, creates org + API key, saves profile')
  .requiredOption('--email <email>', 'Email address that received the OTP')
  .requiredOption('--code <code>', '6-digit OTP code from the email')
  .option('--company <name>', 'Organization name (defaults to "My Organization")')
  .option('--description <text>', 'Optional organization description')
  .option('--key-name <name>', 'Label for the minted API key (default: "CLI default key")')
  .option('--key-expires-in <days>', 'Days until API key expires (1-365, omit for no expiry)', (v) => parseInt(v, 10))
  .option('--base-url <url>', 'Codika API base URL override (default: production)')
  .option('--api-url <url>', 'Full URL to the cliCompleteSignup endpoint (overrides --base-url)')
  .option('--name <name>', 'Local profile name (auto-derived from org name if omitted)')
  .option('--json', 'Emit JSON output')
  .action(async (options: SignupCompleteOptions) => {
    const url = resolveEndpointUrl('cliCompleteSignup', options.apiUrl, undefined);
    const baseOverrideUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '') + '/clicompletesignup'
      : undefined;
    const finalUrl = options.apiUrl || baseOverrideUrl || url;

    const expiresInDays = options.keyExpiresIn !== undefined
      ? Number(options.keyExpiresIn)
      : undefined;

    const result = await signupComplete(
      {
        email: options.email,
        code: options.code,
        ...(options.company || options.description
          ? {
              company: {
                ...(options.company && { name: options.company }),
                ...(options.description && { description: options.description }),
              },
            }
          : {}),
        ...(options.keyName || expiresInDays !== undefined
          ? {
              apiKey: {
                ...(options.keyName && { name: options.keyName }),
                ...(expiresInDays !== undefined && { expiresInDays }),
              },
            }
          : {}),
      },
      finalUrl,
    );

    if (!result.success) {
      if (options.json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
      } else {
        console.error('');
        console.error(`\x1b[31m\u2717 ${result.error.code}\x1b[0m  ${result.error.message}`);
        if (result.error.nextAction) console.error(`  ${result.error.nextAction}`);
        console.error('');
      }
      process.exit(1);
    }

    const { organizationId, organizationName, apiKey, isNewUser } = result.data;

    // Save as a new profile and activate it.
    const profileData: ProfileData = {
      apiKey: apiKey.raw,
      type: 'org-api-key',
      organizationId,
      organizationName,
      keyName: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
      ...(apiKey.expiresAt && { expiresAt: apiKey.expiresAt }),
      ...(options.baseUrl && options.baseUrl !== PRODUCTION_BASE_URL && { baseUrl: options.baseUrl }),
    };

    const config = readConfig();
    let profileName: string;
    if (options.name) {
      profileName = options.name;
    } else {
      const existing = findProfileByOrgId(organizationId);
      profileName = existing
        ? existing.name
        : deriveProfileName(
            { type: 'org-api-key', organizationName, keyName: apiKey.name, keyPrefix: apiKey.keyPrefix },
            new Set(Object.keys(config.profiles)),
          );
    }

    upsertProfile(profileName, profileData);
    setActiveProfile(profileName);

    if (options.json) {
      process.stdout.write(JSON.stringify({
        success: true,
        data: {
          profileName,
          organizationId,
          organizationName,
          isNewUser,
          apiKey: {
            keyId: apiKey.keyId,
            keyPrefix: apiKey.keyPrefix,
            name: apiKey.name,
            scopes: apiKey.scopes,
            createdAt: apiKey.createdAt,
            ...(apiKey.expiresAt && { expiresAt: apiKey.expiresAt }),
          },
        },
      }, null, 2) + '\n');
      process.exit(0);
    }

    console.log('');
    console.log('\x1b[32m\u2713 Signup complete\x1b[0m');
    console.log('');
    console.log(`  Profile:      ${profileName} (active)`);
    console.log(`  Organization: ${organizationName} (${organizationId})`);
    console.log(`  Key name:     ${apiKey.name}`);
    console.log(`  Key:          ${maskApiKey(apiKey.raw)}`);
    console.log(`  Scopes:       ${apiKey.scopes.join(', ')}`);
    if (apiKey.expiresAt) {
      console.log(`  Expires:      ${new Date(apiKey.expiresAt).toLocaleDateString()}`);
    }
    console.log('');
    console.log('You can now run `codika whoami`, `codika deploy ...`, etc.');
    console.log('');
    process.exit(0);
  });
