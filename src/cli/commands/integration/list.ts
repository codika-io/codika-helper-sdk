/**
 * Integration List Command
 *
 * Lists connected integrations across all context levels.
 * Returns org + member integrations by default.
 * If a process instance is provided, also includes instance-level integrations.
 *
 * Usage:
 *   codika integration list
 *   codika integration list --path .
 *   codika integration list --process-instance-id <id> --json
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  listIntegrationsRemote,
  isListIntegrationsSuccess,
  type IntegrationSummaryEntry,
} from '../../../utils/integration-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';
import { getIntegrationDef } from '../../../data/integration-fields.js';

interface ListCommandOptions {
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
  .description('List connected integrations (org + member, optionally process instance)')
  .option('--process-instance-id <id>', 'Process instance ID (includes instance-level integrations)')
  .option('--path <path>', 'Path to use case folder (resolves process instance from project.json)')
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
  // ── Resolve process instance ID (optional) ───────────
  let processInstanceId = options.processInstanceId;

  if (!processInstanceId && options.path) {
    const useCasePath = resolve(options.path);
    const projectJson = readProjectJson(useCasePath, options.projectFile);

    if (projectJson) {
      processInstanceId = options.environment === 'prod'
        ? projectJson.prodProcessInstanceId
        : projectJson.devProcessInstanceId;
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
      processInstanceId,
    },
  });

  if (isListIntegrationsSuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      const integrations = result.data.integrations;

      if (integrations.length === 0) {
        console.log(`\nNo connected integrations found.`);
        if (!processInstanceId) {
          console.log(`  Tip: Use --path <use-case-folder> to also show process instance integrations.`);
        }
        console.log('');
        process.exit(0);
      }

      // Group by context type
      const orgIntegrations = integrations.filter(i => i.contextType === 'organization');
      const memberIntegrations = integrations.filter(i => i.contextType === 'member');
      const instanceIntegrations = integrations.filter(i => i.contextType === 'process_instance');

      console.log('');

      if (orgIntegrations.length > 0) {
        printSection('Organization Integrations', orgIntegrations);
      }

      if (memberIntegrations.length > 0) {
        printSection('Member Integrations', memberIntegrations);
      }

      if (instanceIntegrations.length > 0) {
        printSection('Process Instance Integrations', instanceIntegrations);
      }

      // Summary
      const total = integrations.length;
      console.log(`  Total: ${total} connected integration(s)`);
      if (!processInstanceId) {
        console.log(`  Tip: Use --path <use-case-folder> to also show process instance integrations.`);
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

function printSection(title: string, integrations: IntegrationSummaryEntry[]): void {
  const nameWidth = 24;
  const idWidth = 28;
  const dateWidth = 12;

  console.log(`  ${title}:\n`);
  console.log(
    `  ${'Name'.padEnd(nameWidth)}${'ID'.padEnd(idWidth)}${'Connected'.padEnd(dateWidth)}`
  );
  console.log(
    `  ${'─'.repeat(nameWidth)}${'─'.repeat(idWidth)}${'─'.repeat(dateWidth)}`
  );

  for (const integration of integrations) {
    const def = getIntegrationDef(integration.integrationId);
    const name = def?.name || integration.integrationId;
    const connectedAt = integration.connectedAt
      ? new Date(integration.connectedAt).toLocaleDateString()
      : '—';

    console.log(
      `  ${name.substring(0, nameWidth - 1).padEnd(nameWidth)}${integration.integrationId.substring(0, idWidth - 1).padEnd(idWidth)}${connectedAt}`
    );
  }

  console.log('');
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
