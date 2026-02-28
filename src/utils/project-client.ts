/**
 * Project Client
 * HTTP client for creating projects on the Codika platform via API key
 */

/**
 * Options for creating a project
 */
export interface CreateProjectOptions {
  /** Project name */
  name: string;
  /** Optional project description */
  description?: string;
  /** Optional template ID (defaults to 'two_stage') */
  templateId?: string;
  /** API URL for the createProjectViaApiKey endpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
  /** Optional organization ID (required for admin key, derived from org API key otherwise) */
  organizationId?: string;
}

/**
 * Success response from project creation
 */
export interface CreateProjectSuccessResponse {
  success: true;
  data: {
    projectId: string;
  };
  requestId: string;
}

/**
 * Error response from project creation
 */
export interface CreateProjectErrorResponse {
  success: false;
  error: {
    message: string;
  };
  requestId: string;
}

/**
 * Combined response type
 */
export type CreateProjectResponse =
  | CreateProjectSuccessResponse
  | CreateProjectErrorResponse;

/**
 * Type guard for success response
 */
export function isCreateProjectSuccess(
  response: CreateProjectResponse
): response is CreateProjectSuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isCreateProjectError(
  response: CreateProjectResponse
): response is CreateProjectErrorResponse {
  return response.success === false;
}

/**
 * Create a project on the Codika platform
 *
 * @param options - Project creation options
 * @returns Project creation result
 */
export async function createProject(
  options: CreateProjectOptions
): Promise<CreateProjectResponse> {
  const {
    name,
    description,
    templateId,
    apiKey,
    apiUrl,
    organizationId,
  } = options;

  const requestBody: Record<string, any> = {
    name,
  };

  if (description) {
    requestBody.description = description;
  }

  if (templateId) {
    requestBody.templateId = templateId;
  }

  if (organizationId) {
    requestBody.organizationId = organizationId;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as CreateProjectResponse;

  return result;
}

/**
 * Create a project and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Project creation options
 * @returns Success response with project ID
 * @throws Error if creation fails
 */
export async function createProjectOrThrow(
  options: CreateProjectOptions
): Promise<CreateProjectSuccessResponse> {
  const result = await createProject(options);

  if (isCreateProjectError(result)) {
    throw new Error(
      `Project creation failed: ${result.error.message}`
    );
  }

  return result;
}
