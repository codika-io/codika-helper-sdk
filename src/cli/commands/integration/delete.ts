/**
 * Integration Delete Command
 *
 * Deletes an integration with two-phase confirmation.
 *
 * Usage:
 *   codika integration delete openai
 *   codika integration delete openai --confirm
 *   codika integration delete supabase --process-instance-id <id> --confirm
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  deleteIntegrationRemote,
  isDeleteIntegrationSuccess,
  isDeleteIntegrationPending,
} from '../../../utils/integration-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';
import { getIntegrationDef } from '../../../data/integration-fields.js';

interface DeleteCommandOptions {
  contextType?: string;
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  environment?: string;
  confirm?: boolean;
  profile?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export const deleteSubCommand = new Command('delete')
  .description('Delete an integration')
  .argument('<integrationId>', 'Integration ID to delete (e.g., openai, supabase)')
  .option('--context-type <type>', 'Context type: organization, member, or process_instance')
  .option('--process-instance-id <id>', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder (for project.json resolution)')
  .option('--project-file <path>', 'Custom project file')
  .option('--environment <env>', 'Environment: dev or prod', 'dev')
  .option('--confirm', 'Skip confirmation and delete immediately')
  .option('--profile <name>', 'Use a specific profile')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .action(async (integrationId: string, options: DeleteCommandOptions) => {
    try {
      await runDelete(integrationId, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: { message: error instanceof Error ? error.message : String(error) },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runDelete(integrationId: string, options: DeleteCommandOptions): Promise<void> {
  // ── Resolve context type ─────────────────────────────
  let contextType = options.contextType as 'organization' | 'member' | 'process_instance' | undefined;

  if (!contextType) {
    const def = getIntegrationDef(integrationId);
    if (def) {
      contextType = def.contextType;
    } else if (integrationId.startsWith('cstm_')) {
      contextType = 'process_instance';
    } else {
      contextType = 'organization';
    }
  }

  // ── Resolve process instance ID ──────────────────────
  let processInstanceId = options.processInstanceId;

  if (contextType === 'process_instance' && !processInstanceId) {
    const useCasePath = resolve(options.path || process.cwd());
    const projectJson = readProjectJson(useCasePath, options.projectFile);

    if (projectJson) {
      processInstanceId = options.environment === 'prod'
        ? projectJson.prodProcessInstanceId
        : projectJson.devProcessInstanceId;
    }

    if (!processInstanceId) {
      exitWithError(
        `processInstanceId is required for process_instance context. Either:\n` +
        `  1. Pass --process-instance-id flag\n` +
        `  2. Ensure project.json exists with devProcessInstanceId (use --path to specify location)`
      );
    }
  }

  // ── Resolve API key ──────────────────────────────────
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  const apiUrl = resolveEndpointUrl('deleteIntegration', options.apiUrl, options.profile);

  if (!options.json && !options.confirm) {
    console.log(`\nChecking dependencies for ${integrationId}...`);
  }

  // ── Call API ─────────────────────────────────────────
  const result = await deleteIntegrationRemote({
    apiUrl,
    apiKey,
    body: {
      integrationId,
      contextType,
      processInstanceId,
      confirmDeletion: options.confirm || false,
    },
  });

  if (isDeleteIntegrationSuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n\x1b[32m✓ ${integrationId} integration deleted successfully!\x1b[0m`);
      if (result.data.deactivatedCount) {
        console.log(`  ${result.data.deactivatedCount} process instance(s) deactivated.`);
      }
      console.log('');
    }
    process.exit(0);
  }

  if (isDeleteIntegrationPending(result)) {
    const pending = result.data.pendingDeactivations;

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n\x1b[33m⚠ Deleting ${integrationId} will deactivate ${pending.count} active process instance(s):\x1b[0m\n`);
      for (const proc of pending.processes) {
        console.log(`  • ${proc.title} (${proc.processInstanceId})`);
      }
      console.log(`\nRe-run with --confirm to proceed:`);
      console.log(`  codika integration delete ${integrationId} --confirm\n`);
    }
    process.exit(2);
  }

  // Error response
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const err = (result as any).error;
    console.error(`\x1b[31m✗ Failed to delete integration:\x1b[0m ${err?.code || 'UNKNOWN'} — ${err?.message || 'Unknown error'}`);
  }
  process.exit(1);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
