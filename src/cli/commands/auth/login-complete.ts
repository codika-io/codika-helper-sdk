/**
 * `codika auth login-complete --email <email> --code <code> [--organization-id <id>]`
 *
 * Completes the CLI OTP login flow: verifies the code, mints a fresh `cko_`
 * API key scoped to one of the user's organizations, and saves it as a new
 * active profile.
 *
 * If the user belongs to multiple organizations and `--organization-id` is
 * not passed, the backend returns `MULTIPLE_ORGANIZATIONS` with the list of
 * orgs in `details.organizations` — the CLI surfaces the list and exits 1
 * so the agent/user can re-run with the correct id.
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
import { loginComplete } from '../../../utils/auth-flow-client.js';

interface LoginCompleteOptions {
  email: string;
  code: string;
  organizationId?: string;
  keyName?: string;
  keyExpiresIn?: string;
  baseUrl?: string;
  apiUrl?: string;
  name?: string;
  json?: boolean;
}

export const loginCompleteCommand = new Command('login-complete')
  .description('Complete CLI OTP login — verifies code, mints fresh API key, saves profile')
  .requiredOption('--email <email>', 'Email address that received the OTP')
  .requiredOption('--code <code>', '6-digit OTP code from the email')
  .option('--organization-id <id>', 'Specific organization to mint the key for (required if user belongs to multiple orgs)')
  .option('--key-name <name>', 'Label for the minted API key (default: "CLI default key")')
  .option('--key-expires-in <days>', 'Days until API key expires (1-365, omit for no expiry)', (v) => parseInt(v, 10))
  .option('--base-url <url>', 'Codika API base URL override (default: production)')
  .option('--api-url <url>', 'Full URL to the cliCompleteLogin endpoint (overrides --base-url)')
  .option('--name <name>', 'Local profile name (auto-derived from org name if omitted)')
  .option('--json', 'Emit JSON output')
  .action(async (options: LoginCompleteOptions) => {
    const url = resolveEndpointUrl('cliCompleteLogin', options.apiUrl, undefined);
    const baseOverrideUrl = options.baseUrl
      ? options.baseUrl.replace(/\/$/, '') + '/clicompletelogin'
      : undefined;
    const finalUrl = options.apiUrl || baseOverrideUrl || url;

    const expiresInDays = options.keyExpiresIn !== undefined
      ? Number(options.keyExpiresIn)
      : undefined;

    const result = await loginComplete(
      {
        email: options.email,
        code: options.code,
        ...(options.organizationId && { organizationId: options.organizationId }),
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
        if (result.error.code === 'MULTIPLE_ORGANIZATIONS' && result.error.details) {
          const orgs = (result.error.details.organizations as Array<{ id: string; name: string }>) ?? [];
          console.error('');
          console.error('  Available organizations:');
          for (const org of orgs) {
            console.error(`    ${org.id}  ${org.name}`);
          }
        }
        console.error('');
      }
      process.exit(1);
    }

    const { organizationId, organizationName, apiKey } = result.data;

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
    console.log('\x1b[32m\u2713 Login complete\x1b[0m');
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
    process.exit(0);
  });
