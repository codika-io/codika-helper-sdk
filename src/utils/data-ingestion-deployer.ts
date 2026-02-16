/**
 * Data Ingestion Deployer
 * High-level function to deploy data ingestion from a use case folder
 */

import { join } from 'path';
import { pathToFileURL } from 'url';
import { existsSync } from 'fs';
import type {
  ProcessDataIngestionConfigInput,
  DataIngestionVersionStrategy,
} from '../types/process-types.js';
import {
  deployDataIngestion,
  type DeployDataIngestionResult,
} from './data-ingestion-deploy-client.js';

/**
 * Options for deploying data ingestion from a folder
 */
export interface DeployDataIngestionFromFolderOptions {
  /** Absolute path to the use case folder (containing config.ts) */
  useCasePath: string;
  /** API key for authentication */
  apiKey: string;
  /** API URL for data ingestion deployment endpoint */
  apiUrl: string;
  /** Version strategy (defaults to 'minor_bump') */
  versionStrategy?: DataIngestionVersionStrategy;
  /** Explicit version (required if versionStrategy is 'explicit') */
  explicitVersion?: string;
}

/**
 * Expected exports from a config.ts file for data ingestion deployment
 */
interface DataIngestionConfigModule {
  PROJECT_ID: string;
  getDataIngestionConfig: () => ProcessDataIngestionConfigInput;
  DATA_INGESTION_WORKFLOW_FILE: string;
}

/**
 * Result of deploying data ingestion from a folder
 * Combines the base DeployDataIngestionResult with additional context for archiving
 */
export type DeployDataIngestionFromFolderResult = DeployDataIngestionResult & {
  /** The project ID from config.ts */
  projectId: string;
  /** The configuration that was deployed (useful for archiving) */
  config: ProcessDataIngestionConfigInput;
  /** Absolute path to the workflow JSON file (useful for archiving) */
  workflowFile: string;
};

/**
 * Deploy data ingestion by pointing at a use case folder
 *
 * This function:
 * 1. Dynamically imports config.ts from the use case folder
 * 2. Extracts PROJECT_ID and calls getDataIngestionConfig()
 * 3. Deploys the data ingestion configuration to the Codika platform
 * 4. Returns the result along with context needed for archiving
 *
 * @param options - Deployment options including the use case path
 * @returns Deployment result with additional context
 *
 * @example
 * ```typescript
 * const result = await deployDataIngestionFromFolder({
 *   useCasePath: '/path/to/use-cases/my-use-case',
 *   apiKey: 'your-api-key',
 *   apiUrl: 'https://europe-west1-codika-app.cloudfunctions.net/deployDataIngestion',
 * });
 *
 * if (isDataIngestionDeploySuccess(result)) {
 *   console.log('Deployed version:', result.version);
 * }
 * ```
 */
export async function deployDataIngestionFromFolder(
  options: DeployDataIngestionFromFolderOptions
): Promise<DeployDataIngestionFromFolderResult> {
  const {
    useCasePath,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
  } = options;

  // Validate use case structure
  const configPath = join(useCasePath, 'config.ts');

  if (!existsSync(configPath)) {
    throw new Error(
      `Missing config.ts at ${configPath}\n\n` +
        'Expected structure:\n' +
        '  use-case-folder/\n' +
        '  ├── config.ts           (must export PROJECT_ID, getDataIngestionConfig, DATA_INGESTION_WORKFLOW_FILE)\n' +
        '  └── workflows/\n' +
        '      └── *-ingestion.json'
    );
  }

  const configUrl = pathToFileURL(configPath).href;

  // Dynamically import the config module
  const configModule = (await import(configUrl)) as DataIngestionConfigModule;

  // Validate required exports
  if (!configModule.PROJECT_ID) {
    throw new Error(
      `config.ts at ${useCasePath} must export PROJECT_ID`
    );
  }

  if (typeof configModule.getDataIngestionConfig !== 'function') {
    throw new Error(
      `config.ts at ${useCasePath} must export getDataIngestionConfig function`
    );
  }

  if (!configModule.DATA_INGESTION_WORKFLOW_FILE) {
    throw new Error(
      `config.ts at ${useCasePath} must export DATA_INGESTION_WORKFLOW_FILE`
    );
  }

  // Get project ID and data ingestion configuration
  const projectId = configModule.PROJECT_ID;
  const config = configModule.getDataIngestionConfig();
  const workflowFile = configModule.DATA_INGESTION_WORKFLOW_FILE;

  // Deploy to the platform
  const result = await deployDataIngestion({
    processId: projectId,
    config,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
  });

  // Return result with additional context for archiving
  return {
    ...result,
    projectId,
    config,
    workflowFile,
  };
}

// Re-export type guards for convenience
export { isDataIngestionDeploySuccess, isDataIngestionDeployError } from './data-ingestion-deploy-client.js';
