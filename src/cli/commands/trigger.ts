/**
 * Trigger Command
 *
 * Triggers a deployed Codika workflow and optionally polls for results.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import {
  triggerWorkflowOrThrow,
  pollExecutionStatus,
  type GetExecutionStatusSuccessResponse,
} from '../../utils/trigger-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../utils/config.js';
import { readProjectJson } from '../../utils/project-json.js';

interface TriggerOptions {
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  payloadFile?: string;
  poll?: boolean;
  timeout?: string;
  output?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

export const triggerCommand = new Command('trigger')
  .description('Trigger a deployed Codika workflow')
  .argument('<workflowId>', 'Workflow ID (from use case config)')
  .option('--process-instance-id <id>', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder (to auto-resolve from project.json)')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option('--payload-file <path>', 'Read payload from a JSON file, or "-" for stdin')
  .option('--poll', 'Poll for execution result')
  .option('--timeout <seconds>', 'Max poll time in seconds (default: 120)')
  .option('-o, --output <path>', 'Save result to file (with --poll)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (workflowId: string, options: TriggerOptions) => {
    try {
      await runTrigger(workflowId, options);
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

/**
 * Resolve process instance ID from multiple sources:
 *   1. Explicit --process-instance-id flag
 *   2. project.json in --path directory
 *   3. project.json in current directory
 */
function resolveProcessInstanceId(options: TriggerOptions): string | undefined {
  if (options.processInstanceId) return options.processInstanceId;

  if (options.path) {
    const projectJson = readProjectJson(resolve(options.path), options.projectFile);
    if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;
  }

  const projectJson = readProjectJson(process.cwd(), options.projectFile);
  if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;

  return undefined;
}

/**
 * Parse payload from --payload-file (file path or "-" for stdin)
 */
function resolvePayload(options: TriggerOptions): Record<string, unknown> {
  if (options.payloadFile) {
    const isStdin = options.payloadFile === '-';
    const source = isStdin ? 'stdin' : resolve(options.payloadFile);
    try {
      const raw = isStdin
        ? readFileSync(0, 'utf-8')
        : readFileSync(source, 'utf-8');
      if (!raw.trim()) {
        throw new Error(isStdin ? 'No data received on stdin' : `Payload file is empty: ${source}`);
      }
      const parsed = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error(isStdin ? 'Stdin payload must be a JSON object' : 'Payload file must contain a JSON object');
      }
      return parsed;
    } catch (e) {
      if (e instanceof SyntaxError) {
        throw new Error(`Invalid JSON in ${source}: ${(e as Error).message}`);
      }
      if (!isStdin && (e as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Payload file not found: ${source}`);
      }
      throw e;
    }
  }

  return {};
}

async function runTrigger(
  workflowId: string,
  options: TriggerOptions,
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

  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URLs
  const triggerApiUrl = resolveEndpointUrl('triggerWorkflow', options.apiUrl, options.profile);
  const statusApiUrl = resolveEndpointUrl('getExecutionStatus', options.apiUrl, options.profile);

  // Parse payload
  const payload = resolvePayload(options);

  if (!options.json) {
    console.log(`\nTriggering workflow "${workflowId}"...`);
    console.log(`  Process Instance: ${processInstanceId}`);
    if (Object.keys(payload).length > 0) {
      console.log(`  Payload: ${JSON.stringify(payload).slice(0, 100)}${JSON.stringify(payload).length > 100 ? '...' : ''}`);
    }
    console.log('');
  }

  // Trigger the workflow
  const triggerResult = await triggerWorkflowOrThrow({
    processInstanceId,
    workflowId,
    payload,
    apiUrl: triggerApiUrl,
    apiKey,
  });

  const { executionId } = triggerResult;

  // Without --poll: return immediately
  if (!options.poll) {
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        executionId,
        workflowId,
        processInstanceId,
        message: triggerResult.message,
      }, null, 2));
    } else {
      console.log(`\x1b[32m✓ Workflow triggered\x1b[0m`);
      console.log('');
      console.log(`  Execution ID:      ${executionId}`);
      console.log(`  Process Instance:  ${processInstanceId}`);
      console.log(`  Workflow:          ${workflowId}`);
      console.log('');
      console.log(`  Poll for status:`);
      console.log(`    codika get execution ${executionId}`);
      console.log('');
    }
    process.exit(0);
  }

  // With --poll: wait for result
  if (!options.json) {
    console.log(`\x1b[32m✓ Workflow triggered\x1b[0m (execution: ${executionId})`);
    console.log('');
  }

  const timeoutMs = options.timeout ? parseInt(options.timeout, 10) * 1000 : 120000;

  const statusResult = await pollExecutionStatus(
    {
      processInstanceId,
      executionId,
      apiUrl: statusApiUrl,
      apiKey,
    },
    {
      timeoutMs,
      onPoll: (elapsedMs) => {
        if (!options.json) {
          const seconds = Math.round(elapsedMs / 1000);
          process.stdout.write(`\r  Waiting for result... (${seconds}s)`);
        }
      },
    }
  );

  if (!options.json) {
    // Clear the progress line
    process.stdout.write('\r' + ' '.repeat(60) + '\r');
  }

  // Handle output
  handlePollResult(statusResult, executionId, options);
}

function handlePollResult(
  statusResult: GetExecutionStatusSuccessResponse,
  executionId: string,
  options: TriggerOptions,
): void {
  const { execution } = statusResult;
  const isSuccess = execution.status === 'success';

  // Save to file if requested
  if (options.output) {
    const outputPath = resolve(options.output);
    writeFileSync(outputPath, JSON.stringify(statusResult, null, 2) + '\n');
    if (!options.json) {
      const color = isSuccess ? '\x1b[32m' : '\x1b[31m';
      console.log(`${color}✓ Execution ${execution.status}\x1b[0m (${execution.duration || 0}ms)`);
      console.log(`  Result saved to ${outputPath}`);
      console.log('');
    } else {
      console.log(JSON.stringify({
        success: true,
        executionId,
        status: execution.status,
        duration: execution.duration,
        outputPath,
      }, null, 2));
    }
    process.exit(isSuccess ? 0 : 1);
  }

  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      success: isSuccess,
      executionId,
      status: execution.status,
      duration: execution.duration,
      ...(execution.resultData ? { resultData: execution.resultData } : {}),
      ...(execution.errorDetails ? { errorDetails: execution.errorDetails } : {}),
    }, null, 2));
    process.exit(isSuccess ? 0 : 1);
  }

  // Human-readable output
  const statusColor = isSuccess ? '\x1b[32m' : '\x1b[31m';
  const statusSymbol = isSuccess ? '✓' : '✗';

  console.log(`${statusColor}${statusSymbol} Execution ${execution.status}\x1b[0m${execution.duration ? ` (${(execution.duration / 1000).toFixed(1)}s)` : ''}`);
  console.log('');

  if (isSuccess && execution.resultData) {
    console.log('  Result:');
    console.log(JSON.stringify(execution.resultData, null, 2).split('\n').map(l => '  ' + l).join('\n'));
    console.log('');
  }

  if (!isSuccess && execution.errorDetails) {
    console.log(`  Error: ${execution.errorDetails.message}`);
    if (execution.errorDetails.type) {
      console.log(`  Type:  ${execution.errorDetails.type}`);
    }
    if (execution.errorDetails.failedNodeName) {
      console.log(`  Node:  ${execution.errorDetails.failedNodeName}`);
    }
    console.log('');
  }

  console.log(`  Execution ID: ${executionId}`);
  console.log('');

  process.exit(isSuccess ? 0 : 1);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
