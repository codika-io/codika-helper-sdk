/**
 * Execution Client
 * HTTP client for fetching execution details from the Codika platform via API key
 */

/**
 * Options for fetching execution details
 */
export interface GetExecutionDetailsOptions {
  /** Process instance ID */
  processInstanceId: string;
  /** Codika execution ID */
  executionId: string;
  /** Recursively fetch sub-workflow executions */
  deep?: boolean;
  /** Strip noise for readability */
  slim?: boolean;
  /** API URL for the getExecutionDetailsPublic endpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
}

/**
 * Success response from execution details fetch
 */
export interface GetExecutionDetailsSuccessResponse {
  success: true;
  execution: {
    codikaExecutionId: string;
    n8nExecutionId: string;
    status: string;
    n8nExecution: any;
  };
  requestId: string;
}

/**
 * Error response from execution details fetch
 */
export interface GetExecutionDetailsErrorResponse {
  success: false;
  error: string;
  code: string;
}

/**
 * Combined response type
 */
export type GetExecutionDetailsResponse =
  | GetExecutionDetailsSuccessResponse
  | GetExecutionDetailsErrorResponse;

/**
 * Type guard for success response
 */
export function isGetExecutionDetailsSuccess(
  response: GetExecutionDetailsResponse
): response is GetExecutionDetailsSuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isGetExecutionDetailsError(
  response: GetExecutionDetailsResponse
): response is GetExecutionDetailsErrorResponse {
  return response.success === false;
}

/**
 * Fetch execution details from the Codika platform
 *
 * @param options - Execution details fetch options
 * @returns Execution details result
 */
export async function getExecutionDetails(
  options: GetExecutionDetailsOptions
): Promise<GetExecutionDetailsResponse> {
  const {
    processInstanceId,
    executionId,
    deep,
    slim,
    apiKey,
    apiUrl,
  } = options;

  const params = new URLSearchParams();
  if (deep) params.set('deep', 'true');
  if (slim) params.set('slim', 'true');
  const queryString = params.toString();
  const url = `${apiUrl}/${processInstanceId}/${executionId}${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Process-Manager-Key': apiKey,
    },
  });

  const result = (await response.json()) as GetExecutionDetailsResponse;

  return result;
}

/**
 * Fetch execution details and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Execution details fetch options
 * @returns Success response with execution details
 * @throws Error if fetch fails
 */
export async function getExecutionDetailsOrThrow(
  options: GetExecutionDetailsOptions
): Promise<GetExecutionDetailsSuccessResponse> {
  const result = await getExecutionDetails(options);

  if (isGetExecutionDetailsError(result)) {
    throw new Error(
      `Execution details fetch failed: ${result.error}`
    );
  }

  return result;
}
