/**
 * Get Instance Command
 *
 * Fetches process instance details from the Codika platform,
 * including deployment parameters, status, version, and workflows.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  getProcessInstanceOrThrow,
  type GetProcessInstanceSuccessResponse,
  type DeploymentData,
} from '../../../utils/get-instance-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';

export const instanceCommand = new Command('instance')
  .description('Fetch process instance details from the Codika platform')
  .argument('[processInstanceId]', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder (to auto-resolve from project.json)')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option('--environment <env>', 'Environment: dev or prod', 'dev')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (processInstanceId: string | undefined, options: InstanceOptions) => {
    try {
      await runGetInstance(processInstanceId, options);
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

interface InstanceOptions {
  path?: string;
  projectFile?: string;
  environment?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

/**
 * Resolve process instance ID from multiple sources:
 *   1. Explicit positional argument
 *   2. project.json in --path directory (environment-aware)
 *   3. project.json in current directory (environment-aware)
 */
function resolveProcessInstanceId(
  explicitId: string | undefined,
  options: InstanceOptions,
): string | undefined {
  // 1. Explicit argument
  if (explicitId) return explicitId;

  const isProd = options.environment === 'prod';

  // 2. project.json in --path directory
  if (options.path) {
    const projectJson = readProjectJson(resolve(options.path), options.projectFile);
    const id = isProd ? projectJson?.prodProcessInstanceId : projectJson?.devProcessInstanceId;
    if (id) return id;
  }

  // 3. project.json in current directory
  const projectJson = readProjectJson(process.cwd(), options.projectFile);
  const id = isProd ? projectJson?.prodProcessInstanceId : projectJson?.devProcessInstanceId;
  if (id) return id;

  return undefined;
}

async function runGetInstance(
  explicitId: string | undefined,
  options: InstanceOptions,
): Promise<void> {
  // Resolve process instance ID
  const processInstanceId = resolveProcessInstanceId(explicitId, options);
  if (!processInstanceId) {
    exitWithError(
      `Process instance ID is required. Either:\n` +
      `  1. Pass it as an argument: codika get instance <id>\n` +
      `  2. Run from a use case folder with project.json (after deploy)\n` +
      `  3. Pass --path <path> to a use case folder\n` +
      `  4. Use --environment prod to select the production instance`,
    );
  }

  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('getProcessInstance', options.apiUrl, options.profile);

  if (!options.json) {
    console.log(`\nFetching instance "${processInstanceId}"...`);
    console.log('');
  }

  // Fetch instance details
  const result = await getProcessInstanceOrThrow({
    processInstanceId,
    apiUrl,
    apiKey,
  });

  // --json: structured JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: formatted summary
  printInstanceSummary(result);
  process.exit(0);
}

function printInstanceSummary(result: GetProcessInstanceSuccessResponse): void {
  const { data } = result;
  const deployment = data.deployment;

  // Status color
  const statusText = formatStatus(data, deployment);
  const isHealthy = deployment?.deploymentStatus === 'deployed' && data.isActive;
  const isFailed = deployment?.deploymentStatus === 'failed';
  const statusColor = isFailed ? '\x1b[31m' : isHealthy ? '\x1b[32m' : '\x1b[33m';
  const reset = '\x1b[0m';

  console.log(`${statusColor}✓ Process Instance${reset}`);
  console.log('');
  console.log(`  Instance ID:    ${data.processInstanceId}`);
  console.log(`  Process ID:     ${data.processId}`);
  console.log(`  Environment:    ${data.environment}`);
  console.log(`  Status:         ${statusColor}${statusText}${reset}`);
  console.log(`  Version:        ${data.currentVersion}`);
  console.log(`  Title:          ${data.title}`);

  if (deployment) {
    // Deployment parameters
    const params = deployment.deploymentParameters;
    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      console.log('');
      console.log('  Deployment Parameters:');
      for (const key of paramKeys) {
        const value = params[key];
        const display = formatParamValue(value);
        console.log(`    ${key}: ${display}`);
      }
    }

    // Workflows
    if (deployment.workflows.length > 0) {
      console.log('');
      console.log('  Workflows:');
      for (const wf of deployment.workflows) {
        const n8nPart = wf.n8nWorkflowId ? ` (n8n: ${wf.n8nWorkflowId})` : '';
        console.log(`    - ${wf.workflowId}${n8nPart}`);
      }
    }
  } else {
    console.log('');
    console.log('  \x1b[33mNo deployment data available\x1b[0m');
  }

  console.log('');
}

function formatStatus(
  data: GetProcessInstanceSuccessResponse['data'],
  deployment: DeploymentData | null,
): string {
  if (data.archived) return 'archived';
  if (!deployment) return data.isActive ? 'active (no deployment)' : 'inactive (no deployment)';

  const status = deployment.deploymentStatus;
  if (status === 'deployed') {
    return data.isActive ? 'deployed (active)' : 'deployed (paused)';
  }
  return status;
}

function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return '(not set)';
  if (Array.isArray(value)) {
    return value.length === 0 ? '[] (empty)' : JSON.stringify(value);
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
