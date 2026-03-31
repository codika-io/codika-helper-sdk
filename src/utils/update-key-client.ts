/**
 * Update Organization API Key Client
 * HTTP client for updating organization API key metadata and scopes
 */

// ── Request/Response Types ─────────────────────────────────

export interface UpdateOrganizationApiKeyOptions {
  keyId: string;
  scopes?: string[];
  name?: string;
  description?: string;
  apiUrl: string;
  apiKey: string;
}

export interface UpdateKeySuccessResponse {
  success: true;
  data: {
    keyId: string;
    name: string;
    description: string;
    scopes: string[];
    updatedAt: string;
  };
  requestId: string;
}

export interface UpdateKeyErrorResponse {
  success: false;
  error: {
    message: string;
  };
  requestId: string;
}

export type UpdateKeyResponse =
  | UpdateKeySuccessResponse
  | UpdateKeyErrorResponse;

// ── Type Guards ────────────────────────────────────────────

export function isUpdateKeySuccess(
  response: UpdateKeyResponse,
): response is UpdateKeySuccessResponse {
  return response.success === true;
}

export function isUpdateKeyError(
  response: UpdateKeyResponse,
): response is UpdateKeyErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

export async function updateOrganizationApiKey(
  options: UpdateOrganizationApiKeyOptions,
): Promise<UpdateKeyResponse> {
  const { keyId, scopes, name, description, apiKey, apiUrl } = options;

  const requestBody: Record<string, unknown> = { keyId };
  if (scopes !== undefined) requestBody.scopes = scopes;
  if (name !== undefined) requestBody.name = name;
  if (description !== undefined) requestBody.description = description;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as UpdateKeyResponse;
  return result;
}

// ── OrThrow Convenience ────────────────────────────────────

export async function updateOrganizationApiKeyOrThrow(
  options: UpdateOrganizationApiKeyOptions,
): Promise<UpdateKeySuccessResponse> {
  const result = await updateOrganizationApiKey(options);

  if (isUpdateKeyError(result)) {
    throw new Error(`Failed to update API key: ${result.error.message}`);
  }

  return result;
}
