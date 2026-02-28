/**
 * Deploy Use Case Command
 *
 * Deploys a use case to the Codika platform.
 * Manages local version.json tracking and deployment archiving.
 */

import { Command } from 'commander';
import { resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { deployUseCaseFromFolder, isDeploySuccess } from '../../../utils/use-case-deployer.js';
import { formatSuccess, formatError, toJson, exitWithError } from '../../utils/output.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { updateProjectJson } from '../../../utils/project-json.js';
import {
  readVersion,
  writeVersion,
  parseSemver,
  formatSemver,
  incrementSemver,
  resolveVersionStrategies,
} from '../../../utils/version-manager.js';
import { archiveDeployment, updateProjectInfo } from '../../../utils/deployment-archiver.js';

export const useCaseCommand = new Command('use-case')
  .description('Deploy a use case to the Codika platform')
  .argument('<path>', 'Path to the use case folder (containing config.ts and workflows/)')
  .option('--api-url <url>', 'Codika API URL (env: CODIKA_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--project-id <id>', 'Override project ID (skips project.json and config.ts)')
  .option('--patch', 'Patch version bump (default)')
  .option('--minor', 'Minor version bump')
  .option('--major', 'Major version bump')
  .option('--version <version>', 'Explicit API version (X.Y format)')
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
  patch?: boolean;
  minor?: boolean;
  major?: boolean;
  version?: string;
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

  // Resolve version strategies from shorthand flags
  const { apiStrategy, localStrategy, explicitVersion } = resolveVersionStrategies({
    patch: options.patch,
    minor: options.minor,
    major: options.major,
    version: options.version,
  });

  // Read current local version and compute new version
  const currentVersion = readVersion(absolutePath);
  const currentSemver = parseSemver(currentVersion);
  const newSemver = incrementSemver(currentSemver, localStrategy);
  const newLocalVersion = formatSemver(newSemver);

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
    versionStrategy: apiStrategy,
    explicitVersion,
    additionalFiles,
  });

  // On success: update version.json, archive, update project info
  if (isDeploySuccess(result)) {
    // Auto-save processInstanceId to project.json for post-deploy workflows
    if (result.data.processInstanceId) {
      updateProjectJson(absolutePath, {
        devProcessInstanceId: result.data.processInstanceId,
      });
    }

    // Write bumped version to version.json
    writeVersion(absolutePath, newLocalVersion);

    // Archive deployment locally
    await archiveDeployment({
      useCasePath: absolutePath,
      projectId: result.projectId,
      apiVersion: result.data.version,
      useCaseVersion: newLocalVersion,
      result,
    });

    // Update project-info.json with version mapping
    await updateProjectInfo(
      absolutePath,
      result.projectId,
      result.data.version,
      newLocalVersion
    );
  }

  // Output result
  if (options.json) {
    console.log(toJson(result, isDeploySuccess(result) ? newLocalVersion : undefined));
  } else if (isDeploySuccess(result)) {
    console.log(formatSuccess(result, newLocalVersion));
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
