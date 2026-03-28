/**
 * Create Organization API Key Command
 *
 * Creates a new API key scoped to an organization on the Codika platform.
 */

import { Command } from 'commander';
import {
  createOrganizationApiKey,
  isCreateOrganizationApiKeySuccess,
  isCreateOrganizationApiKeyError,
} from '../../../utils/org-api-key-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  readConfig,
  upsertProfile,
  setActiveProfile,
  deriveProfileName,
  maskApiKey,
  API_KEY_MISSING_MESSAGE,
  type ProfileData,
} from '../../../utils/config.js';

export const createOrganizationKeyCommand = new Command('create-key')
  .description('Create a new API key for an organization')
  .requiredOption('--organization-id <id>', 'Organization ID')
  .requiredOption('--name <name>', 'Key name')
  .requiredOption('--scopes <scopes>', 'Comma-separated scopes (e.g. "deploy:use-case,projects:create")')
  .option('--description <description>', 'Key description')
  .option('--expires-in-days <days>', 'Key expiry in days', parseInt)
  .option('--api-url <url>', 'Codika API URL')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (options: CreateOrganizationKeyCommandOptions) => {
    try {
      await runCreateOrganizationKey(options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

interface CreateOrganizationKeyCommandOptions {
  organizationId: string;
  name: string;
  scopes: string;
  description?: string;
  expiresInDays?: number;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runCreateOrganizationKey(options: CreateOrganizationKeyCommandOptions): Promise<void> {
  // Resolve API URL
  const apiUrl = resolveEndpointUrl('createOrganizationApiKey', options.apiUrl, options.profile);

  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Parse scopes
  const scopes = options.scopes.split(',').map(s => s.trim()).filter(Boolean);
  if (scopes.length === 0) {
    exitWithError('At least one scope is required.');
  }

  if (!options.json) {
    console.log(`\nCreating API key "${options.name}" for organization ${options.organizationId}...`);
  }

  const result = await createOrganizationApiKey({
    organizationId: options.organizationId,
    name: options.name,
    description: options.description,
    scopes,
    expiresInDays: options.expiresInDays,
    apiUrl,
    apiKey,
  });

  // Save as a new profile on success (regardless of --json mode)
  if (isCreateOrganizationApiKeySuccess(result)) {
    const config = readConfig();
    const profileData: ProfileData = {
      apiKey: result.data.apiKey,
      type: 'org-api-key',
      organizationId: options.organizationId,
      keyName: result.data.name,
      keyPrefix: result.data.keyPrefix,
      scopes: result.data.scopes,
      createdAt: result.data.createdAt,
      ...(result.data.expiresAt && { expiresAt: result.data.expiresAt }),
    };

    const profileName = deriveProfileName(
      { type: 'org-api-key', keyName: result.data.name, keyPrefix: result.data.keyPrefix },
      new Set(Object.keys(config.profiles)),
    );

    upsertProfile(profileName, profileData);
    setActiveProfile(profileName);
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (isCreateOrganizationApiKeySuccess(result)) {
    console.log('');
    console.log('\x1b[32m\u2713 Organization API Key Created Successfully\x1b[0m');
    console.log('');
    console.log('\x1b[33m\u26A0 Save the API key below \u2014 it will not be shown again.\x1b[0m');
    console.log('');
    console.log(`  API Key:     ${result.data.apiKey}`);
    console.log(`  Key Prefix:  ${result.data.keyPrefix}`);
    console.log(`  Key ID:      ${result.data.keyId}`);
    console.log(`  Name:        ${result.data.name}`);
    console.log(`  Scopes:      ${result.data.scopes.join(', ')}`);
    console.log(`  Created:     ${new Date(result.data.createdAt).toLocaleDateString()}`);
    if (result.data.expiresAt) {
      console.log(`  Expires:     ${new Date(result.data.expiresAt).toLocaleDateString()}`);
    }
    console.log(`  Request ID:  ${result.requestId}`);
    console.log('');
    console.log(`  Saved as profile "${Object.keys(readConfig().profiles).pop()}" (now active)`);
    console.log('');
  } else if (isCreateOrganizationApiKeyError(result)) {
    console.log('');
    console.log('\x1b[31m\u2717 Organization API Key Creation Failed\x1b[0m');
    console.log('');
    console.log(`  Error:      ${result.error.message}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  }

  if (isCreateOrganizationApiKeySuccess(result)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
