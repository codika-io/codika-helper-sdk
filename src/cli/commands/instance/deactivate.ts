/**
 * Instance Deactivate Command
 *
 * Deactivates (pauses) a process instance's workflows.
 */

import { Command } from 'commander';
import { resolve } from 'path';
import {
  deactivateInstanceOrThrow,
} from '../../../utils/instance-state-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';

export const deactivateCommand = new Command('deactivate')
  .description('Deactivate (pause) a process instance')
  .argument('[processInstanceId]', 'Process instance ID')
  .option('--path <path>', 'Path to use case folder')
  .option('--project-file <path>', 'Custom project file path')
  .option('--environment <env>', 'Environment: dev or prod', 'dev')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (processInstanceId: string | undefined, options: InstanceCommandOptions) => {
    try {
      await runDeactivate(processInstanceId, options);
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

interface InstanceCommandOptions {
  path?: string;
  projectFile?: string;
  environment?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

function resolveProcessInstanceId(
  explicitId: string | undefined,
  options: InstanceCommandOptions,
): string | undefined {
  if (explicitId) return explicitId;

  const isProd = options.environment === 'prod';

  if (options.path) {
    const projectJson = readProjectJson(resolve(options.path), options.projectFile);
    const id = isProd ? projectJson?.prodProcessInstanceId : projectJson?.devProcessInstanceId;
    if (id) return id;
  }

  const projectJson = readProjectJson(process.cwd(), options.projectFile);
  const id = isProd ? projectJson?.prodProcessInstanceId : projectJson?.devProcessInstanceId;
  if (id) return id;

  return undefined;
}

async function runDeactivate(
  explicitId: string | undefined,
  options: InstanceCommandOptions,
): Promise<void> {
  const processInstanceId = resolveProcessInstanceId(explicitId, options);
  if (!processInstanceId) {
    exitWithError(
      `Process instance ID is required. Either:\n` +
      `  1. Pass it as an argument: codika instance deactivate <id>\n` +
      `  2. Run from a use case folder with project.json\n` +
      `  3. Pass --path <path> to a use case folder`,
    );
  }

  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) exitWithError(API_KEY_MISSING_MESSAGE);

  const apiUrl = resolveEndpointUrl('deactivateInstance', options.apiUrl, options.profile);

  if (!options.json) {
    console.log(`\nDeactivating instance "${processInstanceId}"...`);
    console.log('');
  }

  const result = await deactivateInstanceOrThrow({
    processInstanceId,
    apiUrl,
    apiKey,
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  }

  console.log(`\x1b[33m⏸ Instance deactivated\x1b[0m`);
  console.log('');
  console.log(`  Instance ID:  ${result.data.processInstanceId}`);
  console.log(`  Workflows:    ${result.data.workflowCount} paused`);
  console.log('');
  process.exit(0);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
