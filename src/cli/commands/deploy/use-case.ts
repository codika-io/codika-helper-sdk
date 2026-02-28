/**
 * Deploy Use Case Command
 *
 * Deploys a use case to the Codika platform.
 */

import { Command } from 'commander';
import { resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { deployUseCaseFromFolder, isDeploySuccess } from '../../../utils/use-case-deployer.js';
import { formatSuccess, formatError, toJson, exitWithError } from '../../utils/output.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { updateProjectJson } from '../../../utils/project-json.js';
import type { VersionStrategy } from '../../../types/process-types.js';

export const useCaseCommand = new Command('use-case')
  .description('Deploy a use case to the Codika platform')
  .argument('<path>', 'Path to the use case folder (containing config.ts and workflows/)')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--project-id <id>', 'Override project ID (skips project.json and config.ts)')
  .option(
    '--version-strategy <strategy>',
    'Version strategy: major_bump, minor_bump, or explicit',
    'minor_bump'
  )
  .option('--explicit-version <version>', 'Explicit version (required if strategy is explicit)')
  .option(
    '--additional-file <absolutePath:relativePath>',
    'Add file with its relative path (repeatable)',
    (value: string, previous: string[]) => previous.concat([value]),
    [] as string[]
  )
  .option('--json', 'Output result as JSON')
  .action(async (path: string, options: UseCaseCommandOptions) => {
    try {
      await runDeployUseCase(path, options);
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

interface UseCaseCommandOptions {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
  versionStrategy: string;
  explicitVersion?: string;
  additionalFile?: string[];
  json?: boolean;
}

async function runDeployUseCase(useCasePath: string, options: UseCaseCommandOptions): Promise<void> {
  // Resolve path
  const absolutePath = resolve(useCasePath);

  // Validate path exists
  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Resolve API URL: --api-url > CODIKA_API_URL env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('deployUseCase', options.apiUrl);

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

  const versionStrategy = options.versionStrategy as VersionStrategy;

  // Validate explicit version if strategy is explicit
  if (versionStrategy === 'explicit' && !options.explicitVersion) {
    exitWithError('Explicit version is required when using --version-strategy explicit');
  }

  // Parse additional files
  const additionalFiles = options.additionalFile?.map((entry: string) => {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) {
      exitWithError(`Invalid --additional-file format: "${entry}". Expected "absolutePath:relativePath"`);
    }
    const absPath = entry.slice(0, colonIdx);
    const relPath = entry.slice(colonIdx + 1);

    if (!relPath) {
      exitWithError(`Missing relativePath in --additional-file: "${entry}"`);
    }

    // Resolve absolute path (support relative paths on command line)
    const resolvedAbsPath = isAbsolute(absPath) ? absPath : resolve(absPath);

    return {
      absolutePath: resolvedAbsPath,
      relativePath: relPath,
    };
  });

  // Deploy
  const result = await deployUseCaseFromFolder({
    useCasePath: absolutePath,
    apiUrl,
    apiKey,
    projectId: options.projectId,
    versionStrategy,
    explicitVersion: options.explicitVersion,
    additionalFiles,
  });

  // Auto-save processInstanceId to project.json for post-deploy workflows
  if (isDeploySuccess(result) && result.data.processInstanceId) {
    updateProjectJson(absolutePath, {
      devProcessInstanceId: result.data.processInstanceId,
    });
  }

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
