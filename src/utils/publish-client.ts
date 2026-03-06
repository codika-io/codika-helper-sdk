/**
 * Publish Client
 * HTTP client for publishing process deployments to production
 */

// ── Request/Response Types ──────────────────────────────

export interface PublishRequest {
  projectId: string;
  processDeploymentId: string;
  visibility?: 'private' | 'organizational' | 'public';
  visibilityTeamIds?: string[];
  visibilityUserIds?: string[];
  sharedWith?: 'owner_only' | 'admins' | 'everyone' | 'users';
  sharedWithUserIds?: string[];
  autoToggleDevProd?: boolean;
  skipAutoCreateProdInstance?: boolean;
  userId?: string;
}

export interface PublishSuccessData {
  processDeploymentId: string;
  version: string;
  processInstanceId?: string;
}

export interface PublishSuccessResponse {
  success: true;
  data: PublishSuccessData;
  requestId: string;
}

export interface PublishErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type PublishResponse = PublishSuccessResponse | PublishErrorResponse;

// ── Options ─────────────────────────────────────────────

export interface PublishOptions {
  projectId: string;
  processDeploymentId: string;
  apiUrl: string;
  apiKey: string;
  visibility?: PublishRequest['visibility'];
  visibilityTeamIds?: string[];
  visibilityUserIds?: string[];
  sharedWith?: PublishRequest['sharedWith'];
  sharedWithUserIds?: string[];
  autoToggleDevProd?: boolean;
  skipAutoCreateProdInstance?: boolean;
  userId?: string;
}

// ── Type Guards ─────────────────────────────────────────

export function isPublishSuccess(
  response: PublishResponse
): response is PublishSuccessResponse {
  return response.success === true;
}

export function isPublishError(
  response: PublishResponse
): response is PublishErrorResponse {
  return response.success === false;
}

// ── Client ──────────────────────────────────────────────

export async function publishDeployment(
  options: PublishOptions
): Promise<PublishResponse> {
  const {
    projectId,
    processDeploymentId,
    apiKey,
    apiUrl,
    visibility,
    visibilityTeamIds,
    visibilityUserIds,
    sharedWith,
    sharedWithUserIds,
    autoToggleDevProd,
    skipAutoCreateProdInstance,
    userId,
  } = options;

  const requestBody: PublishRequest = {
    projectId,
    processDeploymentId,
  };

  if (visibility) requestBody.visibility = visibility;
  if (visibilityTeamIds) requestBody.visibilityTeamIds = visibilityTeamIds;
  if (visibilityUserIds) requestBody.visibilityUserIds = visibilityUserIds;
  if (sharedWith) requestBody.sharedWith = sharedWith;
  if (sharedWithUserIds) requestBody.sharedWithUserIds = sharedWithUserIds;
  if (typeof autoToggleDevProd === 'boolean') requestBody.autoToggleDevProd = autoToggleDevProd;
  if (skipAutoCreateProdInstance) requestBody.skipAutoCreateProdInstance = skipAutoCreateProdInstance;
  if (userId) requestBody.userId = userId;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = await response.json() as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as PublishResponse;
    } catch {
      // Response body is not JSON (e.g. HTML error page from load balancer)
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as PublishResponse;
  }

  return (await response.json()) as PublishResponse;
}
