/**
 * Deploy Use Case Command
 *
 * Deploys a use case to the Codika platform.
 * Manages local version.json tracking and deployment archiving.
 */

import { Command } from 'commander';
import { resolve, isAbsolute } from 'path';
import { existsSync } from 'fs';
import { deployUseCaseFromFolder, resolveUseCaseDeployment, isDeploySuccess } from '../../../utils/use-case-deployer.js';
import { formatSuccess, formatError, toJson, exitWithError, formatDryRunDeployment } from '../../utils/output.js';
import { resolveApiKey, resolveEndpointUrl, describeApiKeySource, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { validateUseCase } from '../../../validation/runner.js';
import { readProjectJson, updateProjectJson } from '../../../utils/project-json.js';
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
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--project-id <id>', 'Override project ID (skips project.json and config.ts)')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option('--patch', 'Patch version bump (default)')
  .option('--minor', 'Minor version bump')
  .option('--major', 'Major version bump')
  .option('--target-version <version>', 'Explicit API version (X.Y format)')
  .option(
    '--additional-file <absolutePath:relativePath>',
    'Add file with its relative path (repeatable)',
    (value: string, previous: string[]) => previous.concat([value]),
    [] as string[]
  )
  .option('--json', 'Output as JSON')
  .option('--dry-run', 'Preview what would be deployed without calling the API')
  .option('--profile <name>', 'Use a specific profile')
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
  projectFile?: string;
  patch?: boolean;
  minor?: boolean;
  major?: boolean;
  targetVersion?: string;
  additionalFile?: string[];
  json?: boolean;
  dryRun?: boolean;
  profile?: string;
}

async function runDeployUseCase(useCasePath: string, options: UseCaseCommandOptions): Promise<void> {
  // Resolve path
  const absolutePath = resolve(useCasePath);

  // Validate path exists
  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Resolve API URL: --api-url > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('deployUseCase', options.apiUrl, options.profile);

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve version strategies from shorthand flags
  const { apiStrategy, localStrategy, explicitVersion } = resolveVersionStrategies({
    patch: options.patch,
    minor: options.minor,
    major: options.major,
    version: options.targetVersion,
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

  // Dry-run: resolve everything, run validation, display results, exit
  if (options.dryRun) {
    const resolved = await resolveUseCaseDeployment({
      useCasePath: absolutePath,
      apiUrl,
      apiKey,
      projectId: options.projectId,
      projectFile: options.projectFile,
      versionStrategy: apiStrategy,
      explicitVersion,
      additionalFiles,
    });

    // Run validation
    const validationResult = await validateUseCase({ path: absolutePath });

    // Build dry-run data
    const dryRunData = {
      useCasePath: absolutePath,
      projectId: resolved.projectId,
      projectIdSource: resolved.projectIdSource,
      apiKeySource: describeApiKeySource(options.apiKey),
      apiUrl: resolved.apiUrl,
      version: {
        current: currentVersion,
        next: newLocalVersion,
        localStrategy,
        apiStrategy,
        ...(explicitVersion && { explicitApiVersion: explicitVersion }),
      },
      configuration: {
        title: resolved.configuration.title,
        subtitle: resolved.configuration.subtitle,
        workflowCount: resolved.configuration.workflows.length,
        tags: resolved.configuration.tags || [],
        integrations: resolved.configuration.integrationUids || [],
      },
      workflows: resolved.configuration.workflows.map(w => ({
        templateId: w.workflowTemplateId,
        name: w.workflowName,
        triggerTypes: w.triggers?.map(t => t.type) || [],
        base64Size: w.n8nWorkflowJsonBase64?.length || 0,
      })),
      metadataDocuments: resolved.metadataDocuments.length,
      validation: {
        valid: validationResult.valid,
        summary: validationResult.summary,
      },
    };

    if (options.json) {
      console.log(JSON.stringify(dryRunData, null, 2));
    } else {
      console.log(formatDryRunDeployment(dryRunData));
    }

    process.exit(validationResult.valid ? 0 : 1);
    return;
  }

  // Deploy
  const result = await deployUseCaseFromFolder({
    useCasePath: absolutePath,
    apiUrl,
    apiKey,
    projectId: options.projectId,
    projectFile: options.projectFile,
    versionStrategy: apiStrategy,
    explicitVersion,
    additionalFiles,
  });

  // On success: update version.json, archive, update project info
  if (isDeploySuccess(result)) {
    // Auto-save processInstanceId and deployment history to project.json
    const existingProject = readProjectJson(absolutePath, options.projectFile);
    const deployments = existingProject?.deployments ?? {};
    deployments[result.data.version] = {
      templateId: result.data.templateId,
      createdAt: new Date().toISOString(),
    };

    const projectUpdate: Record<string, unknown> = { deployments };
    if (result.data.processInstanceId) {
      projectUpdate.devProcessInstanceId = result.data.processInstanceId;
    }
    updateProjectJson(absolutePath, projectUpdate, options.projectFile);

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
