/**
 * Organization API Key Client
 * HTTP client for creating organization API keys on the Codika platform
 */

/**
 * Options for creating an organization API key
 */
export interface CreateOrganizationApiKeyOptions {
  /** Organization ID to create the key for */
  organizationId: string;
  /** Key name */
  name: string;
  /** Optional description */
  description?: string;
  /** Scopes to grant (e.g. ['deploy:use-case', 'projects:create']) */
  scopes: string[];
  /** Optional expiry in days */
  expiresInDays?: number;
  /** API URL for the createOrganizationApiKeyPublic endpoint */
  apiUrl: string;
  /** API key (admin or personal key) */
  apiKey: string;
}

/**
 * Success response from organization API key creation
 */
export interface CreateOrganizationApiKeySuccessResponse {
  success: true;
  data: {
    keyId: string;
    apiKey: string;
    keyPrefix: string;
    name: string;
    scopes: string[];
    createdAt: string;
    expiresAt?: string;
  };
  requestId: string;
}

/**
 * Error response from organization API key creation
 */
export interface CreateOrganizationApiKeyErrorResponse {
  success: false;
  error: {
    message: string;
  };
  requestId: string;
}

/**
 * Combined response type
 */
export type CreateOrganizationApiKeyResponse =
  | CreateOrganizationApiKeySuccessResponse
  | CreateOrganizationApiKeyErrorResponse;

/**
 * Type guard for success response
 */
export function isCreateOrganizationApiKeySuccess(
  response: CreateOrganizationApiKeyResponse
): response is CreateOrganizationApiKeySuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isCreateOrganizationApiKeyError(
  response: CreateOrganizationApiKeyResponse
): response is CreateOrganizationApiKeyErrorResponse {
  return response.success === false;
}

/**
 * Create an organization API key on the Codika platform
 *
 * @param options - Key creation options
 * @returns Key creation result
 */
export async function createOrganizationApiKey(
  options: CreateOrganizationApiKeyOptions
): Promise<CreateOrganizationApiKeyResponse> {
  const {
    organizationId,
    name,
    description,
    scopes,
    expiresInDays,
    apiKey,
    apiUrl,
  } = options;

  const requestBody: Record<string, any> = {
    organizationId,
    name,
    scopes,
  };

  if (description) {
    requestBody.description = description;
  }

  if (expiresInDays !== undefined) {
    requestBody.expiresInDays = expiresInDays;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as CreateOrganizationApiKeyResponse;

  return result;
}

/**
 * Create an organization API key and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Key creation options
 * @returns Success response with key details
 * @throws Error if creation fails
 */
export async function createOrganizationApiKeyOrThrow(
  options: CreateOrganizationApiKeyOptions
): Promise<CreateOrganizationApiKeySuccessResponse> {
  const result = await createOrganizationApiKey(options);

  if (isCreateOrganizationApiKeyError(result)) {
    throw new Error(
      `Organization API key creation failed: ${result.error.message}`
    );
  }

  return result;
}
