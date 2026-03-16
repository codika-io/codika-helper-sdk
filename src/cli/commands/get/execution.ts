/**
 * Get Execution Command
 *
 * Fetches execution details from the Codika platform for a given
 * execution ID and process instance ID.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { writeFileSync } from 'fs';
import {
  getExecutionDetailsOrThrow,
  type GetExecutionDetailsSuccessResponse,
} from '../../../utils/execution-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';

export const executionCommand = new Command('execution')
  .description('Fetch execution details from the Codika platform')
  .argument('<executionId>', 'Codika execution ID (from triggerWebhookPublic response)')
  .option('--process-instance-id <id>', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder (to auto-resolve from project.json)')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option('--deep', 'Recursively fetch sub-workflow executions')
  .option('--slim', 'Strip noise for readability')
  .option('-o, --output <path>', 'Save to file instead of stdout')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (executionId: string, options: ExecutionOptions) => {
    try {
      await runGetExecution(executionId, options);
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

interface ExecutionOptions {
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  deep?: boolean;
  slim?: boolean;
  output?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

/**
 * Resolve process instance ID from multiple sources:
 *   1. Explicit --process-instance-id flag
 *   2. project.json in --path directory
 *   3. project.json in current directory
 */
function resolveProcessInstanceId(options: ExecutionOptions): string | undefined {
  // 1. Explicit flag
  if (options.processInstanceId) return options.processInstanceId;

  // 2. project.json (or custom project file) in --path directory
  if (options.path) {
    const projectJson = readProjectJson(resolve(options.path), options.projectFile);
    if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;
  }

  // 3. project.json (or custom project file) in current directory
  const projectJson = readProjectJson(process.cwd(), options.projectFile);
  if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;

  return undefined;
}

async function runGetExecution(
  executionId: string,
  options: ExecutionOptions,
): Promise<void> {
  // Resolve process instance ID
  const processInstanceId = resolveProcessInstanceId(options);
  if (!processInstanceId) {
    exitWithError(
      `Process instance ID is required. Either:\n` +
      `  1. Run from a use case folder with project.json (after deploy)\n` +
      `  2. Pass --path <path> to a use case folder\n` +
      `  3. Pass --process-instance-id <id> directly`
    );
  }

  // Resolve API key: --api-key > CODIKA_API_KEY env > config file
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL: --api-url > env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('getExecutionDetails', options.apiUrl, options.profile);

  if (!options.json) {
    console.log(`\nFetching execution "${executionId}"...`);
    console.log(`  Process Instance: ${processInstanceId}`);
    if (options.deep) console.log('  Mode: deep (including sub-workflows)');
    if (options.slim) console.log('  Mode: slim (noise stripped)');
    console.log('');
  }

  // Fetch execution details from the API
  const result = await getExecutionDetailsOrThrow({
    processInstanceId,
    executionId,
    deep: options.deep,
    slim: options.slim,
    apiUrl,
    apiKey,
  });

  // --output: write JSON to file
  if (options.output) {
    const outputPath = resolve(options.output);
    writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n');
    if (!options.json) {
      console.log(`\x1b[32m✓ Execution details saved to ${outputPath}\x1b[0m`);
    } else {
      console.log(JSON.stringify({
        success: true,
        data: {
          outputPath,
          executionId: result.execution.codikaExecutionId,
          status: result.execution.status,
        },
      }, null, 2));
    }
    process.exit(0);
  }

  // --json: structured JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: formatted summary
  printExecutionSummary(result);
  process.exit(0);
}

function printExecutionSummary(result: GetExecutionDetailsSuccessResponse): void {
  const { execution } = result;

  const statusColor = execution.status === 'success' ? '\x1b[32m' : '\x1b[31m';
  const resetColor = '\x1b[0m';

  console.log(`${statusColor}● Execution Details${resetColor}`);
  console.log('');
  console.log(`  Codika Execution ID: ${execution.codikaExecutionId}`);
  console.log(`  n8n Execution ID:    ${execution.n8nExecutionId}`);
  console.log(`  Status:              ${statusColor}${execution.status}${resetColor}`);

  if (execution.n8nExecution) {
    const n8n = execution.n8nExecution;
    if (n8n.startedAt) {
      console.log(`  Started At:          ${n8n.startedAt}`);
    }
    if (n8n.stoppedAt) {
      console.log(`  Stopped At:          ${n8n.stoppedAt}`);
    }
    if (n8n.data?.resultData?.runData) {
      const nodeCount = Object.keys(n8n.data.resultData.runData).length;
      console.log(`  Nodes Executed:      ${nodeCount}`);
    }
  }

  console.log('');
  console.log(`  Request ID: ${result.requestId}`);
  console.log('');
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
