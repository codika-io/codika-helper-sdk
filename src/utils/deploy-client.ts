/**
 * Deployment Client
 * HTTP client for deploying processes to the Codika platform
 */

import type {
  ProcessDeploymentConfigurationInput,
  VersionStrategy,
  DeployProcessUseCaseRequest,
  DeployProcessUseCaseResponse,
  DeployProcessUseCaseSuccessResponse,
  DeployProcessUseCaseErrorResponse,
} from '../types/process-types.js';

/**
 * Options for deploying a process
 */
export interface DeployOptions {
  /** Target project ID */
  projectId: string;
  /** Process configuration */
  configuration: ProcessDeploymentConfigurationInput;
  /** API URL for deployment */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Version strategy (defaults to 'minor_bump') */
  versionStrategy?: VersionStrategy;
  /** Explicit version (required if versionStrategy is 'explicit') */
  explicitVersion?: string;
}

/**
 * Result of a deployment operation
 */
export type DeployResult = DeployProcessUseCaseResponse;

/**
 * Type guard to check if response is successful
 */
export function isDeploySuccess(
  response: DeployProcessUseCaseResponse
): response is DeployProcessUseCaseSuccessResponse {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isDeployError(
  response: DeployProcessUseCaseResponse
): response is DeployProcessUseCaseErrorResponse {
  return response.success === false;
}

/**
 * Deploy a process to the Codika platform
 *
 * @param options - Deployment options
 * @returns Deployment result (success or error response)
 */
export async function deployProcess(
  options: DeployOptions
): Promise<DeployResult> {
  const {
    projectId,
    configuration,
    apiKey,
    apiUrl,
    versionStrategy,
    explicitVersion,
  } = options;

  // Build request body
  const requestBody: DeployProcessUseCaseRequest = {
    projectId,
    configuration,
  };

  if (versionStrategy) {
    requestBody.versionStrategy = versionStrategy;
  }

  if (explicitVersion) {
    requestBody.explicitVersion = explicitVersion;
  }

  // Make API request
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  // Parse response
  const result = (await response.json()) as DeployProcessUseCaseResponse;

  return result;
}

/**
 * Deploy a process and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Deployment options
 * @returns Success response data
 * @throws Error if deployment fails
 */
export async function deployProcessOrThrow(
  options: DeployOptions
): Promise<DeployProcessUseCaseSuccessResponse> {
  const result = await deployProcess(options);

  if (isDeployError(result)) {
    throw new Error(
      `Deployment failed: ${result.error.code} - ${result.error.message}` +
        (result.error.details
          ? `\nDetails: ${JSON.stringify(result.error.details)}`
          : '')
    );
  }

  return result;
}
