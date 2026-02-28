/**
 * Deploy Process Data Ingestion Command
 *
 * Deploys a process-level data ingestion configuration to the Codika platform.
 * This is separate from the use case deployment — updating data ingestion
 * does NOT trigger "update available" notifications to users.
 *
 * Usage:
 *   codika-helper deploy process-data-ingestion <path> [options]
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import {
  deployDataIngestionFromFolder,
  isDataIngestionDeploySuccess,
} from '../../../utils/data-ingestion-deployer.js';
import { exitWithError } from '../../utils/output.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import type { DataIngestionVersionStrategy } from '../../../types/process-types.js';

interface DataIngestionCommandOptions {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
  versionStrategy: string;
  explicitVersion?: string;
  json?: boolean;
}

export const processDataIngestionCommand = new Command('process-data-ingestion')
  .description('Deploy a process-level data ingestion configuration to the Codika platform')
  .argument('<path>', 'Path to the use case folder (containing config.ts with getDataIngestionConfig)')
  .option('--api-url <url>', 'Codika Data Ingestion API URL (env: CODIKA_DATA_INGESTION_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--project-id <id>', 'Override project ID (skips project.json and config.ts)')
  .option(
    '--version-strategy <strategy>',
    'Version strategy: major_bump, minor_bump, or explicit',
    'minor_bump'
  )
  .option('--explicit-version <version>', 'Explicit version (required if strategy is explicit)')
  .option('--json', 'Output result as JSON')
  .action(async (path: string, options: DataIngestionCommandOptions) => {
    try {
      await runDeployDataIngestion(path, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            code: 'CLI_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runDeployDataIngestion(
  useCasePath: string,
  options: DataIngestionCommandOptions
): Promise<void> {
  // Resolve path
  const absolutePath = resolve(useCasePath);

  // Validate path exists
  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Resolve API URL: --api-url > CODIKA_DATA_INGESTION_API_URL env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('deployDataIngestion', options.apiUrl);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Validate version strategy
  const validStrategies = ['major_bump', 'minor_bump', 'explicit'];
  if (!validStrategies.includes(options.versionStrategy)) {
    exitWithError(
      `Invalid version strategy: ${options.versionStrategy}. Must be one of: ${validStrategies.join(', ')}`
    );
  }

  const versionStrategy = options.versionStrategy as DataIngestionVersionStrategy;

  // Validate explicit version if strategy is explicit
  if (versionStrategy === 'explicit' && !options.explicitVersion) {
    exitWithError('Explicit version is required when using --version-strategy explicit');
  }

  // Deploy
  const result = await deployDataIngestionFromFolder({
    useCasePath: absolutePath,
    apiUrl,
    apiKey,
    projectId: options.projectId,
    versionStrategy,
    explicitVersion: options.explicitVersion,
  });

  // Output result
  if (options.json) {
    console.log(JSON.stringify({
      success: result.success,
      dataIngestionId: result.dataIngestionId,
      version: result.version,
      status: result.status,
      webhookUrls: result.webhookUrls,
      projectId: result.projectId,
      error: result.error,
      requestId: result.requestId,
    }, null, 2));
  } else if (isDataIngestionDeploySuccess(result)) {
    console.log('');
    console.log('\x1b[32m\u2713 Data Ingestion Deployment Successful\x1b[0m');
    console.log('');
    console.log(`  Data Ingestion ID:  ${result.dataIngestionId}`);
    console.log(`  API Version:        ${result.version}`);
    console.log(`  Project ID:         ${result.projectId}`);
    console.log(`  Status:             ${result.status}`);
    if (result.webhookUrls) {
      console.log(`  Webhook (embed):    ${result.webhookUrls.embed}`);
      console.log(`  Webhook (delete):   ${result.webhookUrls.delete}`);
    }
    if (result.requestId) {
      console.log(`  Request ID:         ${result.requestId}`);
    }
    console.log('');
  } else {
    console.log('');
    console.log('\x1b[31m\u2717 Data Ingestion Deployment Failed\x1b[0m');
    console.log('');
    console.log(`  Error:      ${result.error}`);
    console.log(`  Status:     ${result.status}`);
    if (result.requestId) {
      console.log(`  Request ID: ${result.requestId}`);
    }
    console.log('');
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}
