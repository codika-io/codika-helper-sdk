/**
 * Data Ingestion Deployment Client
 * HTTP client for deploying data ingestion workflows to the Codika platform
 */

import type {
  ProcessDataIngestionConfigInput,
  DeployDataIngestionRequest,
  DeployDataIngestionResponse,
  DataIngestionVersionStrategy,
} from '../types/process-types.js';

/**
 * Options for deploying data ingestion
 */
export interface DeployDataIngestionOptions {
  /** Target process ID */
  processId: string;
  /** Data ingestion configuration */
  config: ProcessDataIngestionConfigInput;
  /** API URL for deployment */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
  /** Version strategy (defaults to 'minor_bump') */
  versionStrategy?: DataIngestionVersionStrategy;
  /** Explicit version (required if versionStrategy is 'explicit'). Version in "X.Y" format */
  explicitVersion?: string;
}

/**
 * Result of a data ingestion deployment operation
 */
export type DeployDataIngestionResult = DeployDataIngestionResponse & {
  requestId?: string;
};

/**
 * Type guard to check if response is successful
 */
export function isDataIngestionDeploySuccess(
  response: DeployDataIngestionResult
): boolean {
  return response.success === true;
}

/**
 * Type guard to check if response is an error
 */
export function isDataIngestionDeployError(
  response: DeployDataIngestionResult
): boolean {
  return response.success === false;
}

/**
 * Deploy data ingestion to the Codika platform
 *
 * @param options - Deployment options
 * @returns Deployment result with computed version
 */
export async function deployDataIngestion(
  options: DeployDataIngestionOptions
): Promise<DeployDataIngestionResult> {
  const {
    processId,
    config,
    apiKey,
    apiUrl,
    versionStrategy = 'minor_bump',
    explicitVersion,
  } = options;

  // Build request body
  const requestBody: DeployDataIngestionRequest = {
    processId,
    versionStrategy,
    config,
  };

  if (versionStrategy === 'explicit' && explicitVersion) {
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
  const result = (await response.json()) as DeployDataIngestionResult;

  return result;
}

/**
 * Deploy data ingestion and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Deployment options
 * @returns Success response data
 * @throws Error if deployment fails
 */
export async function deployDataIngestionOrThrow(
  options: DeployDataIngestionOptions
): Promise<DeployDataIngestionResult> {
  const result = await deployDataIngestion(options);

  if (isDataIngestionDeployError(result)) {
    throw new Error(
      `Data ingestion deployment failed: ${result.error}` +
        (result.requestId ? `\nRequest ID: ${result.requestId}` : '')
    );
  }

  return result;
}
