/**
 * Publish Command
 *
 * Publishes a deployed use case to production, making it live
 * for end users. Optionally creates a prod process instance.
 *
 * Usage:
 *   codika-helper publish <templateId> [options]
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  publishDeployment,
  isPublishSuccess,
  isPublishError,
  type PublishOptions,
} from '../../utils/publish-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../utils/config.js';
import { readProjectJson, updateProjectJson, resolveProjectId } from '../../utils/project-json.js';

interface PublishCommandOptions {
  path?: string;
  projectFile?: string;
  projectId?: string;
  visibility?: string;
  sharedWith?: string;
  autoToggleDevProd?: boolean;
  skipProdInstance?: boolean;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export const publishCommand = new Command('publish')
  .description('Publish a deployed use case to production')
  .argument('<templateId>', 'Deployment template ID to publish (from project.json deployments)')
  .option('--path <path>', 'Path to use case folder (default: cwd)')
  .option('--project-file <path>', 'Custom project file')
  .option('--project-id <id>', 'Override project ID')
  .option('--visibility <scope>', 'Process visibility: private, organizational, public (first publish only)')
  .option('--shared-with <scope>', 'Instance sharing: owner_only, admins, everyone (org processes only)')
  .option('--auto-toggle-dev-prod', 'Pause dev when prod is active (default: both run simultaneously)')
  .option('--skip-prod-instance', 'Skip creating a production instance')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .action(async (templateId: string, options: PublishCommandOptions) => {
    try {
      await runPublish(templateId, options);
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

async function runPublish(
  templateId: string,
  options: PublishCommandOptions,
): Promise<void> {
  const useCasePath = resolve(options.path || process.cwd());

  // Resolve project ID
  const { projectId, source: projectIdSource } = resolveProjectId({
    flagValue: options.projectId,
    useCasePath,
    projectFile: options.projectFile,
  });

  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('publishUseCase', options.apiUrl);

  // Validate visibility
  const validVisibilities = ['private', 'organizational', 'public'];
  if (options.visibility && !validVisibilities.includes(options.visibility)) {
    exitWithError(`Invalid visibility: "${options.visibility}". Must be one of: ${validVisibilities.join(', ')}`);
  }

  // Validate sharedWith
  const validSharedWith = ['owner_only', 'admins', 'everyone'];
  if (options.sharedWith && !validSharedWith.includes(options.sharedWith)) {
    exitWithError(`Invalid shared-with: "${options.sharedWith}". Must be one of: ${validSharedWith.join(', ')}`);
  }

  if (!options.json) {
    console.log(`\nPublishing deployment to production...`);
    console.log(`  Template ID:  ${templateId}`);
    console.log(`  Project ID:   ${projectId} (from ${projectIdSource})`);
    if (options.visibility) console.log(`  Visibility:   ${options.visibility}`);
    if (options.sharedWith) console.log(`  Shared With:  ${options.sharedWith}`);
    if (options.autoToggleDevProd) console.log(`  Auto Toggle:  dev paused when prod active`);
    if (options.skipProdInstance) console.log(`  Prod Instance: skipped`);
    console.log('');
  }

  // Build publish options
  const publishOptions: PublishOptions = {
    projectId,
    processDeploymentId: templateId,
    apiUrl,
    apiKey,
  };

  if (options.visibility) {
    publishOptions.visibility = options.visibility as PublishOptions['visibility'];
  }
  if (options.sharedWith) {
    publishOptions.sharedWith = options.sharedWith as PublishOptions['sharedWith'];
  }
  if (options.autoToggleDevProd) {
    publishOptions.autoToggleDevProd = true;
  }
  if (options.skipProdInstance) {
    publishOptions.skipAutoCreateProdInstance = true;
  }

  // Call API
  const result = await publishDeployment(publishOptions);

  if (isPublishSuccess(result)) {
    // Save prod process instance ID to project.json
    if (result.data.processInstanceId) {
      updateProjectJson(useCasePath, {
        prodProcessInstanceId: result.data.processInstanceId,
      }, options.projectFile);
    }

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\x1b[32m✓ Published successfully!\x1b[0m`);
      console.log('');
      console.log(`  Version:              ${result.data.version}`);
      console.log(`  Template ID:          ${result.data.processDeploymentId}`);
      if (result.data.processInstanceId) {
        console.log(`  Prod Instance ID:     ${result.data.processInstanceId}`);
      }
      console.log('');
    }

    process.exit(0);
  }

  if (isPublishError(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`\x1b[31m✗ Publish failed:\x1b[0m ${result.error.code} — ${result.error.message}`);
    }
    process.exit(1);
  }

  // Fallback: unexpected response shape
  if (options.json) {
    console.log(JSON.stringify({ success: false, error: { message: 'Unexpected API response' } }, null, 2));
  } else {
    console.error(`\x1b[31m✗ Unexpected API response\x1b[0m`);
  }
  process.exit(1);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
