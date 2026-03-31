/**
 * Create Organization Command
 *
 * Creates a new organization on the Codika platform via API key.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';
import { Command } from 'commander';
import {
  createOrganization,
  isCreateOrganizationSuccess,
  isCreateOrganizationError,
} from '../../../utils/organization-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export const createOrganizationCommand = new Command('create')
  .description('Create a new organization on the Codika platform')
  .requiredOption('--name <name>', 'Organization name')
  .option('--description <description>', 'Organization description')
  .option('--size <size>', 'Organization size (solo, 2-10, 11-50, 51-200, 201-1000, 1000+)')
  .option('--logo <path>', 'Path to logo image file (JPEG, PNG, or WebP, max 5MB)')
  .option('--n8n-base-url <url>', 'Self-hosted n8n instance URL')
  .option('--n8n-api-key <key>', 'Self-hosted n8n API key')
  .option('--store-credential-copy', 'Store encrypted credential backup in Codika (self-hosted n8n only)')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (options: CreateOrganizationCommandOptions) => {
    try {
      await runCreateOrganization(options);
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

interface CreateOrganizationCommandOptions {
  name: string;
  description?: string;
  size?: string;
  logo?: string;
  n8nBaseUrl?: string;
  n8nApiKey?: string;
  storeCredentialCopy?: boolean;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runCreateOrganization(options: CreateOrganizationCommandOptions): Promise<void> {
  // Resolve API URL: --api-url > env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('createOrganization', options.apiUrl, options.profile);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Read and encode logo file if provided
  let logoBase64: string | undefined;
  let logoMimeType: string | undefined;

  if (options.logo) {
    const ext = extname(options.logo).toLowerCase();
    logoMimeType = MIME_TYPES[ext];
    if (!logoMimeType) {
      exitWithError(`Unsupported image format "${ext}". Use JPEG, PNG, or WebP.`);
    }
    try {
      const fileBuffer = readFileSync(options.logo);
      if (fileBuffer.length > 5 * 1024 * 1024) {
        exitWithError('Logo file exceeds 5MB limit.');
      }
      logoBase64 = fileBuffer.toString('base64');
    } catch (err) {
      exitWithError(`Cannot read logo file: ${err instanceof Error ? err.message : err}`);
    }
  }

  if (!options.json) {
    console.log(`\nCreating organization "${options.name}"...`);
  }

  const result = await createOrganization({
    name: options.name,
    description: options.description,
    size: options.size,
    logoBase64,
    logoMimeType,
    n8nBaseUrl: options.n8nBaseUrl,
    n8nApiKey: options.n8nApiKey,
    storeCredentialCopy: options.storeCredentialCopy,
    apiUrl,
    apiKey,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (isCreateOrganizationSuccess(result)) {
    console.log('');
    console.log('\x1b[32m✓ Organization Created Successfully\x1b[0m');
    console.log('');
    console.log(`  Organization ID: ${result.data.organizationId}`);
    console.log(`  Request ID:      ${result.requestId}`);
    console.log('');
  } else if (isCreateOrganizationError(result)) {
    console.log('');
    console.log('\x1b[31m✗ Organization Creation Failed\x1b[0m');
    console.log('');
    console.log(`  Error:      ${result.error.message}`);
    console.log(`  Request ID: ${result.requestId}`);
    console.log('');
  }

  if (isCreateOrganizationSuccess(result)) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
