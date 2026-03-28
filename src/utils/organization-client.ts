/**
 * Organization Client
 * HTTP client for creating organizations on the Codika platform via API key
 */

/**
 * Options for creating an organization
 */
export interface CreateOrganizationOptions {
  /** Organization name */
  name: string;
  /** Optional description */
  description?: string;
  /** Optional organization size */
  size?: string;
  /** Optional self-hosted n8n base URL */
  n8nBaseUrl?: string;
  /** Optional self-hosted n8n API key */
  n8nApiKey?: string;
  /** Whether to store credential copies (self-hosted n8n only) */
  storeCredentialCopy?: boolean;
  /** API URL for the createOrganizationViaApiKey endpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
}

/**
 * Success response from organization creation
 */
export interface CreateOrganizationSuccessResponse {
  success: true;
  data: {
    organizationId: string;
  };
  requestId: string;
}

/**
 * Error response from organization creation
 */
export interface CreateOrganizationErrorResponse {
  success: false;
  error: {
    message: string;
  };
  requestId: string;
}

/**
 * Combined response type
 */
export type CreateOrganizationResponse =
  | CreateOrganizationSuccessResponse
  | CreateOrganizationErrorResponse;

/**
 * Type guard for success response
 */
export function isCreateOrganizationSuccess(
  response: CreateOrganizationResponse
): response is CreateOrganizationSuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isCreateOrganizationError(
  response: CreateOrganizationResponse
): response is CreateOrganizationErrorResponse {
  return response.success === false;
}

/**
 * Create an organization on the Codika platform
 *
 * @param options - Organization creation options
 * @returns Organization creation result
 */
export async function createOrganization(
  options: CreateOrganizationOptions
): Promise<CreateOrganizationResponse> {
  const {
    name,
    description,
    size,
    n8nBaseUrl,
    n8nApiKey,
    storeCredentialCopy,
    apiKey,
    apiUrl,
  } = options;

  const requestBody: Record<string, any> = {
    name,
  };

  if (description) {
    requestBody.description = description;
  }

  if (size) {
    requestBody.size = size;
  }

  if (n8nBaseUrl) {
    requestBody.n8nBaseUrl = n8nBaseUrl;
  }

  if (n8nApiKey) {
    requestBody.n8nApiKey = n8nApiKey;
  }

  if (storeCredentialCopy !== undefined) {
    requestBody.storeCredentialCopy = storeCredentialCopy;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as CreateOrganizationResponse;

  return result;
}

/**
 * Create an organization and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Organization creation options
 * @returns Success response with organization ID
 * @throws Error if creation fails
 */
export async function createOrganizationOrThrow(
  options: CreateOrganizationOptions
): Promise<CreateOrganizationSuccessResponse> {
  const result = await createOrganization(options);

  if (isCreateOrganizationError(result)) {
    throw new Error(
      `Organization creation failed: ${result.error.message}`
    );
  }

  return result;
}
