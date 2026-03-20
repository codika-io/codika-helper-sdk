/**
 * Integration List Command
 *
 * Lists integrations for an organization or process instance.
 *
 * Usage:
 *   codika integration list
 *   codika integration list --context-type process_instance --path .
 *   codika integration list --json
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  listIntegrationsRemote,
  isListIntegrationsSuccess,
} from '../../../utils/integration-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';
import { getIntegrationDef } from '../../../data/integration-fields.js';

interface ListCommandOptions {
  contextType?: string;
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  environment?: string;
  profile?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export const listSubCommand = new Command('list')
  .description('List integrations and their connection status')
  .option('--context-type <type>', 'Context type: organization or process_instance', 'organization')
  .option('--process-instance-id <id>', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder (for project.json resolution)')
  .option('--project-file <path>', 'Custom project file')
  .option('--environment <env>', 'Environment: dev or prod', 'dev')
  .option('--profile <name>', 'Use a specific profile')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .action(async (options: ListCommandOptions) => {
    try {
      await runList(options);
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

async function runList(options: ListCommandOptions): Promise<void> {
  const contextType = (options.contextType || 'organization') as 'organization' | 'member' | 'process_instance';

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

  const apiUrl = resolveEndpointUrl('listIntegrations', options.apiUrl, options.profile);

  // ── Call API ─────────────────────────────────────────
  const result = await listIntegrationsRemote({
    apiUrl,
    apiKey,
    body: {
      contextType,
      processInstanceId,
    },
  });

  if (isListIntegrationsSuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const integrations = result.data.integrations;

      if (integrations.length === 0) {
        console.log(`\nNo integrations found for ${contextType} context.`);
        console.log('');
        process.exit(0);
      }

      console.log(`\n  Integrations (${contextType}):\n`);

      // Table header
      const nameWidth = 28;
      const idWidth = 28;
      const statusWidth = 14;
      const dateWidth = 20;

      console.log(
        `  ${'Name'.padEnd(nameWidth)}${'ID'.padEnd(idWidth)}${'Status'.padEnd(statusWidth)}${'Connected'.padEnd(dateWidth)}`
      );
      console.log(
        `  ${'─'.repeat(nameWidth)}${'─'.repeat(idWidth)}${'─'.repeat(statusWidth)}${'─'.repeat(dateWidth)}`
      );

      for (const integration of integrations) {
        const def = getIntegrationDef(integration.integrationId);
        const name = def?.name || integration.integrationId;
        const status = integration.connected
          ? '\x1b[32mconnected\x1b[0m'
          : '\x1b[90mnot connected\x1b[0m';
        const statusRaw = integration.connected ? 'connected' : 'not connected';
        const connectedAt = integration.connectedAt
          ? new Date(integration.connectedAt).toLocaleDateString()
          : '—';

        // Use raw status for padding calculation
        const statusPad = statusWidth - statusRaw.length;
        console.log(
          `  ${name.padEnd(nameWidth)}${integration.integrationId.padEnd(idWidth)}${status}${' '.repeat(Math.max(0, statusPad))}${connectedAt}`
        );
      }

      console.log('');
    }
    process.exit(0);
  }

  // Error response
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const err = (result as any).error;
    console.error(`\x1b[31m✗ Failed to list integrations:\x1b[0m ${err?.code || 'UNKNOWN'} — ${err?.message || 'Unknown error'}`);
  }
  process.exit(1);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
