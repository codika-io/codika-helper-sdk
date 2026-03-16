/**
 * Deploy Process Data Ingestion Command
 *
 * Deploys a process-level data ingestion configuration to the Codika platform.
 * This is separate from the use case deployment — updating data ingestion
 * does NOT trigger "update available" notifications to users.
 *
 * Usage:
 *   codika deploy process-data-ingestion <path> [options]
 */

import { Command } from 'commander';
import { resolve, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import {
  deployDataIngestionFromFolder,
  isDataIngestionDeploySuccess,
} from '../../../utils/data-ingestion-deployer.js';
import { exitWithError } from '../../utils/output.js';
import { resolveApiKeyForOrg, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson, updateProjectJson } from '../../../utils/project-json.js';
import { archiveDataIngestionDeployment, updateProjectInfoDataIngestion } from '../../../utils/deployment-archiver.js';
import type { DataIngestionVersionStrategy } from '../../../types/process-types.js';

interface DataIngestionCommandOptions {
  apiUrl?: string;
  apiKey?: string;
  projectId?: string;
  projectFile?: string;
  versionStrategy: string;
  explicitVersion?: string;
  json?: boolean;
  profile?: string;
}

// ── Version JSON helpers ─────────────────────────────────

function readDataIngestionVersion(useCasePath: string): string {
  const versionPath = join(useCasePath, 'version.json');
  if (!existsSync(versionPath)) return '1.0.0';
  try {
    const data = JSON.parse(readFileSync(versionPath, 'utf-8'));
    return data.dataIngestionVersion || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

function writeDataIngestionVersion(useCasePath: string, version: string): void {
  const versionPath = join(useCasePath, 'version.json');
  let data: Record<string, string> = {};
  if (existsSync(versionPath)) {
    try {
      data = JSON.parse(readFileSync(versionPath, 'utf-8'));
    } catch {
      // Start fresh if corrupt
    }
  }
  data.dataIngestionVersion = version;
  writeFileSync(versionPath, JSON.stringify(data, null, 2) + '\n');
}

function incrementVersion(version: string, strategy: string): string {
  const parts = version.split('.').map(Number);
  const [major = 1, minor = 0, patch = 0] = parts;
  switch (strategy) {
    case 'major_bump': return `${major + 1}.0.0`;
    case 'minor_bump': return `${major}.${minor + 1}.0`;
    default: return `${major}.${minor}.${patch + 1}`;
  }
}

export const processDataIngestionCommand = new Command('process-data-ingestion')
  .description('Deploy a process-level data ingestion configuration to the Codika platform')
  .argument('<path>', 'Path to the use case folder (containing config.ts with getDataIngestionConfig)')
  .option('--api-url <url>', 'Codika Data Ingestion API URL (env: CODIKA_DATA_INGESTION_API_URL)')
  .option('--api-key <key>', 'Codika API key (env: CODIKA_API_KEY)')
  .option('--project-id <id>', 'Override project ID (skips project.json and config.ts)')
  .option('--project-file <path>', 'Path to custom project file (e.g., project-client-a.json)')
  .option(
    '--version-strategy <strategy>',
    'Version strategy: major_bump, minor_bump, or explicit',
    'minor_bump'
  )
  .option('--explicit-version <version>', 'Explicit version (required if strategy is explicit)')
  .option('--json', 'Output result as JSON')
  .option('--profile <name>', 'Use a specific profile instead of the active one')
  .action(async (path: string, options: DataIngestionCommandOptions) => {
    try {
      await runDeployDataIngestion(path, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            code: 'CLI_ERROR',
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runDeployDataIngestion(
  useCasePath: string,
  options: DataIngestionCommandOptions
): Promise<void> {
  // Resolve path
  const absolutePath = resolve(useCasePath);

  // Validate path exists
  if (!existsSync(absolutePath)) {
    exitWithError(`Use case path does not exist: ${absolutePath}`);
  }

  // Resolve API URL: --api-url > CODIKA_DATA_INGESTION_API_URL env > config baseUrl + path > production default
  const apiUrl = resolveEndpointUrl('deployDataIngestion', options.apiUrl);

  // Resolve API key with org-aware fallback: flag > env > matching org profile > active profile
  const projectJson = readProjectJson(absolutePath, options.projectFile);
  const keyResult = resolveApiKeyForOrg({
    flagValue: options.apiKey,
    organizationId: projectJson?.organizationId,
  });
  const apiKey = keyResult.apiKey;
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }
  if (keyResult.autoSelected && keyResult.profileName && !options.json) {
    console.log(`Using profile "${keyResult.profileName}" (matches project organization)`);
  }

  // Validate version strategy
  const validStrategies = ['major_bump', 'minor_bump', 'explicit'];
  if (!validStrategies.includes(options.versionStrategy)) {
    exitWithError(
      `Invalid version strategy: ${options.versionStrategy}. Must be one of: ${validStrategies.join(', ')}`
    );
  }

  const versionStrategy = options.versionStrategy as DataIngestionVersionStrategy;

  // Validate explicit version if strategy is explicit
  if (versionStrategy === 'explicit' && !options.explicitVersion) {
    exitWithError('Explicit version is required when using --version-strategy explicit');
  }

  // Deploy
  const result = await deployDataIngestionFromFolder({
    useCasePath: absolutePath,
    apiUrl,
    apiKey,
    projectId: options.projectId,
    projectFile: options.projectFile,
    versionStrategy,
    explicitVersion: options.explicitVersion,
  });

  // Handle success: post-deploy tracking
  if (isDataIngestionDeploySuccess(result)) {
    // 1. Update version.json
    const currentVersion = readDataIngestionVersion(absolutePath);
    const newVersion = incrementVersion(currentVersion, options.versionStrategy);
    writeDataIngestionVersion(absolutePath, newVersion);

    // 2. Archive deployment
    try {
      await archiveDataIngestionDeployment({
        useCasePath: absolutePath,
        projectId: result.projectId,
        version: result.version,
        useCaseVersion: newVersion,
        workflowFile: result.workflowFile,
        config: result.config,
        result,
      });
    } catch {
      // Non-blocking: archiving failure shouldn't fail the deploy
    }

    // 3. Update project-info.json
    try {
      await updateProjectInfoDataIngestion(absolutePath, result.projectId, result.version, newVersion);
    } catch {
      // Non-blocking
    }

    // 4. Update project.json with data ingestion deployment entry
    try {
      const dataIngestionDeployments: Record<string, { dataIngestionId: string; createdAt: string; webhookUrls?: { embed: string; delete: string } }> = {};
      dataIngestionDeployments[result.version] = {
        dataIngestionId: result.dataIngestionId,
        createdAt: new Date().toISOString(),
        ...(result.webhookUrls ? { webhookUrls: result.webhookUrls } : {}),
      };
      updateProjectJson(absolutePath, { dataIngestionDeployments } as any, options.projectFile);
    } catch {
      // Non-blocking
    }

    // Output
    if (options.json) {
      console.log(JSON.stringify({
        success: true,
        dataIngestionId: result.dataIngestionId,
        version: result.version,
        localVersion: newVersion,
        status: result.status,
        webhookUrls: result.webhookUrls,
        projectId: result.projectId,
        requestId: result.requestId,
      }, null, 2));
    } else {
      console.log('');
      console.log('\x1b[32m\u2713 Data Ingestion Deployment Successful\x1b[0m');
      console.log('');
      console.log(`  Data Ingestion ID:  ${result.dataIngestionId}`);
      console.log(`  API Version:        ${result.version}`);
      console.log(`  Local Version:      ${currentVersion} → ${newVersion}`);
      console.log(`  Project ID:         ${result.projectId}`);
      console.log(`  Status:             ${result.status}`);
      if (result.webhookUrls) {
        console.log(`  Webhook (embed):    ${result.webhookUrls.embed}`);
        console.log(`  Webhook (delete):   ${result.webhookUrls.delete}`);
      }
      if (result.requestId) {
        console.log(`  Request ID:         ${result.requestId}`);
      }
      console.log('');
    }
  } else {
    // Output failure
    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: result.error,
        status: result.status,
        requestId: result.requestId,
      }, null, 2));
    } else {
      console.log('');
      console.log('\x1b[31m\u2717 Data Ingestion Deployment Failed\x1b[0m');
      console.log('');
      console.log(`  Error:      ${result.error}`);
      console.log(`  Status:     ${result.status}`);
      if (result.requestId) {
        console.log(`  Request ID: ${result.requestId}`);
      }
      console.log('');
    }
  }

  // Exit with appropriate code
  process.exit(result.success ? 0 : 1);
}
