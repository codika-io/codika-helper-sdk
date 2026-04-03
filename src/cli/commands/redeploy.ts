/**
 * Redeploy Command
 *
 * Redeploys a deployment instance with optional parameter overrides.
 *
 * Usage:
 *   codika redeploy [options]
 */

import { Command } from 'commander';
import { resolve } from 'path';
import { readFileSync } from 'fs';
import {
  redeployInstance,
  isRedeploySuccess,
  isRedeployError,
  type RedeployOptions,
} from '../../utils/redeploy-client.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  API_KEY_MISSING_MESSAGE,
} from '../../utils/config.js';
import { readProjectJson } from '../../utils/project-json.js';

interface RedeployCommandOptions {
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  environment?: string;
  param?: string[];
  params?: string;
  paramsFile?: string;
  force?: boolean;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

export const redeployCommand = new Command('redeploy')
  .description('Redeploy a deployment instance with parameter overrides')
  .option('--process-instance-id <id>', 'Target process instance ID')
  .option('--path <path>', 'Path to use case folder (default: cwd)')
  .option('--project-file <path>', 'Custom project file (default: project.json)')
  .option('--environment <env>', 'Environment: dev or prod (default: dev)', 'dev')
  .option(
    '--param <KEY=VALUE>',
    'Parameter override (repeatable)',
    (value: string, previous: string[]) => previous.concat([value]),
    [] as string[],
  )
  .option('--params <json>', 'JSON string with all parameters')
  .option('--params-file <path>', 'Path to JSON file with parameters')
  .option('--force', 'Force redeploy')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use a specific profile')
  .action(async (options: RedeployCommandOptions) => {
    try {
      await runRedeploy(options);
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

async function runRedeploy(options: RedeployCommandOptions): Promise<void> {
  // ── Resolve process instance ID ────────────────────────
  let processInstanceId = options.processInstanceId;

  if (!processInstanceId) {
    const useCasePath = resolve(options.path || process.cwd());
    const projectJson = readProjectJson(useCasePath, options.projectFile);

    if (!projectJson) {
      exitWithError(
        `No process instance ID found. Either:\n` +
        `  1. Pass --process-instance-id flag\n` +
        `  2. Ensure project.json exists with devProcessInstanceId or prodProcessInstanceId`
      );
    }

    if (options.environment === 'prod') {
      processInstanceId = projectJson.prodProcessInstanceId;
      if (!processInstanceId) {
        exitWithError(
          `No prodProcessInstanceId found in project.json. ` +
          `Run 'codika publish' first or pass --process-instance-id flag.`
        );
      }
    } else {
      processInstanceId = projectJson.devProcessInstanceId;
      if (!processInstanceId) {
        exitWithError(
          `No devProcessInstanceId found in project.json. ` +
          `Run 'codika deploy use-case' first or pass --process-instance-id flag.`
        );
      }
    }
  }

  // ── Resolve deployment parameters ──────────────────────
  let deploymentParameters: Record<string, any> = {};

  // Layer 1: params-file (lowest priority)
  if (options.paramsFile) {
    const fileContent = readFileSync(resolve(options.paramsFile), 'utf-8');
    deploymentParameters = { ...deploymentParameters, ...JSON.parse(fileContent) };
  }

  // Layer 2: params JSON string
  if (options.params) {
    deploymentParameters = { ...deploymentParameters, ...JSON.parse(options.params) };
  }

  // Layer 3: individual --param flags (highest priority)
  if (options.param?.length) {
    for (const p of options.param) {
      const eqIndex = p.indexOf('=');
      if (eqIndex === -1) exitWithError(`Invalid --param format: "${p}". Expected KEY=VALUE`);
      const key = p.slice(0, eqIndex);
      const value = p.slice(eqIndex + 1);
      deploymentParameters[key] = value;
    }
  }

  // If no parameters provided, pass undefined (keeps existing params)
  const finalParams = Object.keys(deploymentParameters).length > 0 ? deploymentParameters : undefined;

  // ── Resolve API key and URL ────────────────────────────
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  const apiUrl = resolveEndpointUrl('redeployDeploymentInstance', options.apiUrl, options.profile);

  if (!options.json) {
    console.log(`\nRedeploying instance...`);
    console.log(`  Instance ID:   ${processInstanceId}`);
    console.log(`  Environment:   ${options.environment || 'dev'}`);
    if (finalParams) console.log(`  Parameters:    ${Object.keys(finalParams).length} override(s)`);
    if (options.force) console.log(`  Force:         yes`);
    console.log('');
  }

  // ── Call API ───────────────────────────────────────────
  const redeployOptions: RedeployOptions = {
    processInstanceId,
    apiUrl,
    apiKey,
  };

  if (finalParams) redeployOptions.deploymentParameters = finalParams;
  if (options.force) redeployOptions.forceRedeploy = true;

  const result = await redeployInstance(redeployOptions);

  if (isRedeploySuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      if (result.data.deploymentStatus === 'deployed') {
        console.log(`\x1b[32m✓ Redeployed successfully!\x1b[0m`);
      } else {
        console.log(`\x1b[31m✗ Redeployment failed\x1b[0m`);
      }
      console.log('');
      console.log(`  Status:          ${result.data.deploymentStatus}`);
      console.log(`  Instance ID:     ${result.data.deploymentInstanceId}`);
      console.log(`  Workflows:       ${result.data.n8nWorkflowIds.length} deployed`);
      console.log('');
    }

    process.exit(result.data.deploymentStatus === 'deployed' ? 0 : 1);
  }

  if (isRedeployError(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error(`\x1b[31m✗ Redeploy failed:\x1b[0m ${result.error.code} — ${result.error.message}`);
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

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
