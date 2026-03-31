/**
 * List Instances Command
 *
 * Lists process instances for the authenticated organization.
 */

import { Command } from 'commander';
import {
  listInstancesOrThrow,
  type ListInstancesSuccessResponse,
  type ProcessInstanceSummary,
} from '../../../utils/list-instances-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';

export const instancesCommand = new Command('instances')
  .description('List process instances for the organization')
  .option('--environment <env>', 'Filter by environment: dev or prod')
  .option('--archived', 'Show archived instances instead of active ones')
  .option('--limit <n>', 'Number of results (default: 20, max: 100)')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (options: ListInstancesCommandOptions) => {
    try {
      await runListInstances(options);
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

interface ListInstancesCommandOptions {
  environment?: string;
  archived?: boolean;
  limit?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

async function runListInstances(options: ListInstancesCommandOptions): Promise<void> {
  // Resolve API key
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // Resolve API URL
  const apiUrl = resolveEndpointUrl('listProcessInstances', options.apiUrl, options.profile);

  // Parse limit
  let limit: number | undefined;
  if (options.limit) {
    limit = parseInt(options.limit, 10);
    if (isNaN(limit) || limit < 1) {
      exitWithError('Invalid limit. Must be a positive integer.');
    }
  }

  if (!options.json) {
    console.log('\nFetching instances...');
    console.log('');
  }

  const result = await listInstancesOrThrow({
    apiUrl,
    apiKey,
    environment: options.environment as 'dev' | 'prod' | undefined,
    archived: options.archived,
    limit,
  });

  // --json: structured JSON output
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  // Default: formatted table
  printInstanceTable(result);
  process.exit(0);
}

function printInstanceTable(result: ListInstancesSuccessResponse): void {
  const { instances, organizationId } = result.data;

  if (instances.length === 0) {
    console.log(`\x1b[33m● No instances found\x1b[0m`);
    console.log('');
    return;
  }

  console.log(`\x1b[32m● Process Instances\x1b[0m (${organizationId})`);
  console.log('');

  // Column headers
  const titleW = 32;
  const envW = 6;
  const statusW = 18;
  const versionW = 9;
  const lastExecW = 20;

  console.log(
    `  ${'Title'.padEnd(titleW)}${'Env'.padEnd(envW)}${'Status'.padEnd(statusW)}${'Version'.padEnd(versionW)}${'Last Executed'.padEnd(lastExecW)}`,
  );
  console.log(
    `  ${'─'.repeat(titleW)}${'─'.repeat(envW)}${'─'.repeat(statusW)}${'─'.repeat(versionW)}${'─'.repeat(lastExecW)}`,
  );

  for (const inst of instances) {
    const title = truncate(inst.title, titleW - 2).padEnd(titleW);
    const env = inst.environment.padEnd(envW);
    const status = formatStatus(inst).padEnd(statusW);
    const version = inst.currentVersion.padEnd(versionW);
    const lastExec = inst.lastExecutedAt
      ? new Date(inst.lastExecutedAt).toISOString().replace('T', ' ').slice(0, 16)
      : '—';

    console.log(`  ${title}${env}${status}${version}${lastExec}`);
  }

  console.log('');
  console.log(`  Showing ${instances.length} instance${instances.length !== 1 ? 's' : ''}`);
  console.log('');
}

function formatStatus(inst: ProcessInstanceSummary): string {
  if (inst.archived) return '📦 archived';
  if (!inst.isActive) {
    const reason = inst.inactiveReason === 'user_paused' ? 'paused' : inst.inactiveReason || 'inactive';
    return `\x1b[33m⏸ ${reason}\x1b[0m`;
  }
  return '\x1b[32m✓ active\x1b[0m';
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
