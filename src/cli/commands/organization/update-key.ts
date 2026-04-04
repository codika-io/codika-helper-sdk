/**
 * Update Organization API Key Command
 *
 * Updates the scopes, name, or description of an existing organization API key.
 */

import { Command } from 'commander';
import {
  updateOrganizationApiKey,
  isUpdateKeySuccess,
  isUpdateKeyError,
} from '../../../utils/update-key-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const updateOrganizationKeyCommand = new Command('update-key')
  .description('Update an existing organization API key')
  .requiredOption('--key-id <id>', 'Key ID to update')
  .option('--scopes <scopes>', 'New comma-separated scopes (replaces existing)')
  .option('--name <name>', 'New key name')
  .option('--description <description>', 'New key description')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use a specific profile')
  .action(async (options: UpdateKeyCommandOptions) => {
    try {
      await runUpdateKey(options);
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

interface UpdateKeyCommandOptions {
  keyId: string;
  scopes?: string;
  name?: string;
  description?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runUpdateKey(options: UpdateKeyCommandOptions): Promise<void> {
  // Resolve API URL
  const apiUrl = resolveEndpointUrl('updateOrganizationApiKey', options.apiUrl, options.profile);

  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Parse scopes if provided
  let scopes: string[] | undefined;
  if (options.scopes !== undefined) {
    if (options.scopes === '') {
      exitWithError('--scopes cannot be empty.');
    }
    scopes = options.scopes.split(',').map(s => s.trim()).filter(Boolean);
    if (scopes.length === 0) {
      exitWithError('At least one scope is required when --scopes is provided.');
    }
  }

  // At least one update field required
  if (options.scopes === undefined && !options.name && options.description === undefined) {
    exitWithError('At least one field to update is required (--scopes, --name, or --description).');
  }

  if (!options.json) {
    console.log(`\nUpdating API key "${options.keyId}"...`);
  }

  const result = await updateOrganizationApiKey({
    keyId: options.keyId,
    scopes,
    name: options.name,
    description: options.description,
    apiUrl,
    apiKey,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (isUpdateKeySuccess(result)) {
    console.log('');
    console.log('\x1b[32m✓ API key updated\x1b[0m');
    console.log('');
    console.log(`  Key ID:       ${result.data.keyId}`);
    console.log(`  Name:         ${result.data.name}`);
    console.log(`  Scopes:       ${result.data.scopes.join(', ')}`);
    if (result.data.description) {
      console.log(`  Description:  ${result.data.description}`);
    }
    console.log('');
  } else if (isUpdateKeyError(result)) {
    console.log('');
    console.log('\x1b[31m✗ API Key Update Failed\x1b[0m');
    console.log('');
    console.log(`  Error:      ${result.error.message}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  }

  if (isUpdateKeySuccess(result)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
