/**
 * Deploy Command
 *
 * Deploys a use case to the Codika platform.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { deployUseCaseFromFolder, isDeploySuccess } from '../../utils/use-case-deployer.js';
import { formatSuccess, formatError, toJson, exitWithError } from '../utils/output.js';
import type { VersionStrategy } from '../../types/process-types.js';

export const deployCommand = new Command('deploy')
  .description('Deploy a use case to the Codika platform')
  .argument('<path>', 'Path to the use case folder (containing config.ts and workflows/)')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option(
    '--version-strategy <strategy>',
    'Version strategy: major_bump, minor_bump, or explicit',
    'minor_bump'
  )
  .option('--explicit-version <version>', 'Explicit version (required if strategy is explicit)')
  .option('--metadata-dir <path>', 'Path to metadata directory containing files to upload alongside deployment')
  .option('--json', 'Output result as JSON')
  .action(async (path: string, options: DeployCommandOptions) => {
    try {
      await runDeploy(path, options);
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

interface DeployCommandOptions {
  apiUrl?: string;
  apiKey?: string;
  versionStrategy: string;
  explicitVersion?: string;
  metadataDir?: string;
  json?: boolean;
}

async function runDeploy(useCasePath: string, options: DeployCommandOptions): Promise<void> {
  // Resolve path
  const absolutePath = resolve(useCasePath);

  // Validate path exists
  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Get API URL from options or environment
  const apiUrl = options.apiUrl || process.env.CODIKA_API_URL;
  if (!apiUrl) {
    exitWithError(
      'API URL is required. Provide --api-url or set CODIKA_API_URL environment variable.'
    );
  }

  // Get API key from options or environment
  const apiKey = options.apiKey || process.env.CODIKA_API_KEY;
  if (!apiKey) {
    exitWithError(
      'API key is required. Provide --api-key or set CODIKA_API_KEY environment variable.'
    );
  }

  // Validate version strategy
  const validStrategies = ['major_bump', 'minor_bump', 'explicit'];
  if (!validStrategies.includes(options.versionStrategy)) {
    exitWithError(
      `Invalid version strategy: ${options.versionStrategy}. Must be one of: ${validStrategies.join(', ')}`
    );
  }

  const versionStrategy = options.versionStrategy as VersionStrategy;

  // Validate explicit version if strategy is explicit
  if (versionStrategy === 'explicit' && !options.explicitVersion) {
    exitWithError('Explicit version is required when using --version-strategy explicit');
  }

  // Resolve metadata directory if provided
  const metadataDir = options.metadataDir ? resolve(options.metadataDir) : undefined;

  // Deploy
  const result = await deployUseCaseFromFolder({
    useCasePath: absolutePath,
    apiUrl,
    apiKey,
    versionStrategy,
    explicitVersion: options.explicitVersion,
    metadataDir,
  });

  // Output result
  if (options.json) {
    console.log(toJson(result));
  } else if (isDeploySuccess(result)) {
    console.log(formatSuccess(result));
  } else {
    console.log(formatError(result));
  }

  // Exit with appropriate code
  if (isDeploySuccess(result)) {
    // Check for workflow-level failures
    if (result.data.deploymentStatus === 'failed') {
      process.exit(1);
    }
    process.exit(0);
  } else {
    process.exit(1);
  }
}
