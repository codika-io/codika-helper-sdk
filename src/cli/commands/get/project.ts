/**
 * Get Project Command
 *
 * Fetches project details from the Codika platform,
 * including status, deployment version, and stage info.
 */

import { Command } from 'commander';
import {
  getProjectOrThrow,
  type GetProjectSuccessResponse,
} from '../../../utils/get-project-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const projectCommand = new Command('project')
  .description('Fetch project details from the Codika platform')
  .argument('<projectId>', 'Project ID')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (projectId: string, options: ProjectOptions) => {
    try {
      await runGetProject(projectId, options);
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

interface ProjectOptions {
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runGetProject(
  projectId: string,
  options: ProjectOptions,
): Promise<void> {
  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('getProject', options.apiUrl, options.profile);

  if (!options.json) {
    console.log(`\nFetching project "${projectId}"...`);
    console.log('');
  }

  // Fetch project details
  const result = await getProjectOrThrow({
    projectId,
    apiUrl,
    apiKey,
  });

  // --json: structured JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: formatted summary
  printProjectSummary(result);
  process.exit(0);
}

function printProjectSummary(result: GetProjectSuccessResponse): void {
  const { data } = result;

  const statusColor = data.status === 'completed'
    ? '\x1b[32m'
    : data.status === 'in_progress'
      ? '\x1b[36m'
      : '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(`${statusColor}✓ Project${reset}`);
  console.log('');
  console.log(`  Project ID:   ${data.id}`);
  console.log(`  Name:         ${data.name}`);
  if (data.description) {
    console.log(`  Description:  ${data.description}`);
  }
  console.log(`  Status:       ${statusColor}${data.status}${reset}`);
  console.log(`  Published:    ${data.hasPublishedProcess ? 'yes' : 'no'}`);

  if (data.processId) {
    console.log(`  Process ID:   ${data.processId}`);
  }

  if (data.currentDeployment) {
    const deployedAt = data.currentDeployment.deployedAt
      ? new Date(data.currentDeployment.deployedAt).toISOString().slice(0, 10)
      : '—';
    console.log(`  Deployment:   v${data.currentDeployment.version} (${deployedAt})`);
  }

  console.log(`  Stages:       ${data.stageCount} (current: ${data.currentStage})`);

  const createdAt = data.createdAt
    ? new Date(data.createdAt).toISOString().slice(0, 10)
    : '—';
  console.log(`  Created:      ${createdAt}`);

  if (data.archived) {
    console.log(`  Archived:     yes`);
  }

  console.log('');
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
