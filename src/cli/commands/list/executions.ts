/**
 * List Executions Command
 *
 * Lists recent executions for a process instance with optional
 * filtering by workflow ID and status.
 *
 * Usage:
 *   codika list executions <processInstanceId> [options]
 */

import { Command } from 'commander';
import {
  listExecutions,
  isListExecutionsSuccess,
  isListExecutionsError,
  type ExecutionSummary,
} from '../../../utils/list-executions-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../../utils/config.js';

interface ListExecutionsOptions {
  workflowId?: string;
  failedOnly?: boolean;
  limit?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

export const executionsCommand = new Command('executions')
  .description('List recent executions for a process instance')
  .argument('<processInstanceId>', 'Process instance ID')
  .option('--workflow-id <id>', 'Filter by workflow ID')
  .option('--failed-only', 'Only show failed executions')
  .option('--limit <n>', 'Number of results (default: 20, max: 100)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (processInstanceId: string, options: ListExecutionsOptions) => {
    try {
      await runListExecutions(processInstanceId, options);
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

async function runListExecutions(
  processInstanceId: string,
  options: ListExecutionsOptions,
): Promise<void> {
  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('listExecutions', options.apiUrl, options.profile);

  // Parse limit
  const limit = options.limit ? parseInt(options.limit, 10) : undefined;
  if (options.limit && (isNaN(limit!) || limit! < 1 || limit! > 100)) {
    exitWithError('Limit must be a number between 1 and 100');
  }

  if (!options.json) {
    console.log(`\nFetching executions...`);
    console.log(`  Process Instance: ${processInstanceId}`);
    if (options.workflowId) console.log(`  Workflow Filter:  ${options.workflowId}`);
    if (options.failedOnly) console.log(`  Status Filter:    failed only`);
    if (limit) console.log(`  Limit:            ${limit}`);
    console.log('');
  }

  // Call API
  const result = await listExecutions({
    processInstanceId,
    apiUrl,
    apiKey,
    workflowId: options.workflowId,
    status: options.failedOnly ? 'failed' : undefined,
    limit,
  });

  if (isListExecutionsSuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printExecutionTable(result.data.executions, processInstanceId);
    }
    process.exit(0);
  }

  if (isListExecutionsError(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`\x1b[31m✗ Failed:\x1b[0m ${result.error.code} — ${result.error.message}`);
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

function printExecutionTable(executions: ExecutionSummary[], processInstanceId: string): void {
  if (executions.length === 0) {
    console.log('  No executions found.');
    console.log('');
    return;
  }

  const green = '\x1b[32m';
  const red = '\x1b[31m';
  const yellow = '\x1b[33m';
  const dim = '\x1b[2m';
  const reset = '\x1b[0m';

  console.log(`${green}● Recent Executions${reset} ${dim}(${processInstanceId.slice(0, 12)}...)${reset}`);
  console.log('');

  // Table header
  const idWidth = 14;
  const workflowWidth = 20;
  const statusWidth = 10;
  const durationWidth = 10;

  console.log(
    `  ${pad('ID', idWidth)} ${pad('Workflow', workflowWidth)} ${pad('Status', statusWidth)} ${pad('Duration', durationWidth)} Created`
  );
  console.log(
    `  ${dim}${'─'.repeat(idWidth)} ${'─'.repeat(workflowWidth)} ${'─'.repeat(statusWidth)} ${'─'.repeat(durationWidth)} ${'─'.repeat(19)}${reset}`
  );

  for (const exec of executions) {
    const statusColor = exec.status === 'success' ? green
      : exec.status === 'failed' ? red
      : yellow;
    const statusIcon = exec.status === 'success' ? '✓'
      : exec.status === 'failed' ? '✗'
      : '⋯';

    const duration = exec.duration
      ? formatDuration(exec.duration)
      : '-';

    const created = formatDate(exec.createdAt);

    console.log(
      `  ${pad(exec.executionId.slice(0, idWidth), idWidth)} ${pad(exec.workflowId.slice(0, workflowWidth), workflowWidth)} ${statusColor}${pad(`${statusIcon} ${exec.status}`, statusWidth)}${reset} ${pad(duration, durationWidth)} ${created}`
    );

    // Show error message for failed executions
    if (exec.status === 'failed' && exec.errorDetails?.message) {
      const errorMsg = exec.errorDetails.message.slice(0, 80);
      const nodeName = exec.errorDetails.failedNodeName;
      console.log(`  ${dim}  └─ ${nodeName ? `[${nodeName}] ` : ''}${errorMsg}${reset}`);
    }
  }

  console.log('');
  console.log(`  ${dim}Showing ${executions.length} execution${executions.length !== 1 ? 's' : ''}${reset}`);
  console.log('');
}

function pad(str: string, width: number): string {
  return str.length >= width ? str.slice(0, width) : str + ' '.repeat(width - str.length);
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return isoString;
  }
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
