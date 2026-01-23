/**
 * Use Case Deployer
 * High-level function to deploy a use case from its folder path
 */

import { join } from 'path';
import { pathToFileURL } from 'url';
import type { ProcessDeploymentConfigurationInput, VersionStrategy } from '../types/process-types.js';
import {
  deployProcess,
  isDeploySuccess,
  isDeployError,
  type DeployResult,
} from './deploy-client.js';

/**
 * Options for deploying a use case from folder
 */
export interface DeployUseCaseOptions {
  /** Absolute path to the use case folder (containing config.ts/config.js) */
  useCasePath: string;
  /** API key for authentication */
  apiKey: string;
  /** API URL for deployment */
  apiUrl: string;
  /** Version strategy (defaults to 'minor_bump') */
  versionStrategy?: VersionStrategy;
  /** Explicit version (required if versionStrategy is 'explicit') */
  explicitVersion?: string;
}

/**
 * Result of deploying a use case
 * Combines the base DeployResult with additional context for archiving
 */
export type DeployUseCaseResult = DeployResult & {
  /** The project ID from config.ts */
  projectId: string;
  /** The configuration that was deployed (useful for archiving) */
  configuration: ProcessDeploymentConfigurationInput;
  /** List of workflow files from config.ts (useful for archiving) */
  workflowFiles: string[];
};

/**
 * Expected exports from a config.ts/config.js file
 */
interface ConfigModule {
  PROJECT_ID: string;
  WORKFLOW_FILES: string[];
  getConfiguration: () => ProcessDeploymentConfigurationInput;
}

/**
 * Deploy a use case by pointing at its folder
 *
 * This function:
 * 1. Dynamically imports config.js from the use case folder
 * 2. Extracts PROJECT_ID and calls getConfiguration()
 * 3. Deploys to the Codika platform
 * 4. Returns the result along with context needed for archiving
 *
 * @param options - Deployment options including the use case path
 * @returns Deployment result with additional context
 *
 * @example
 * ```typescript
 * const result = await deployUseCaseFromFolder({
 *   useCasePath: '/path/to/use-cases/my-use-case',
 *   apiKey: 'your-api-key',
 * });
 *
 * if (isDeploySuccess(result)) {
 *   console.log('Deployed version:', result.data.version);
 *   // Archive using result.configuration and result.workflowFiles
 * }
 * ```
 */
export async function deployUseCaseFromFolder(
  options: DeployUseCaseOptions
): Promise<DeployUseCaseResult> {
  const {
    useCasePath,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
  } = options;

  // Build the path to config.js (compiled from config.ts)
  const configPath = join(useCasePath, 'config.js');
  const configUrl = pathToFileURL(configPath).href;

  // Dynamically import the config module
  const configModule = (await import(configUrl)) as ConfigModule;

  // Validate required exports
  if (!configModule.PROJECT_ID) {
    throw new Error(
      `config.js at ${useCasePath} must export PROJECT_ID`
    );
  }

  if (typeof configModule.getConfiguration !== 'function') {
    throw new Error(
      `config.js at ${useCasePath} must export getConfiguration function`
    );
  }

  // Get project ID and configuration
  const projectId = configModule.PROJECT_ID;
  const configuration = configModule.getConfiguration();
  const workflowFiles = configModule.WORKFLOW_FILES || [];

  // Deploy to the platform
  const result = await deployProcess({
    projectId,
    configuration,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
  });

  // Return result with additional context for archiving
  return {
    ...result,
    projectId,
    configuration,
    workflowFiles,
  };
}

// Re-export type guards for convenience
export { isDeploySuccess, isDeployError } from './deploy-client.js';
