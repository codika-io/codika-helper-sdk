/**
 * Get Project Client
 * HTTP client for fetching project details (status, deployment, stages)
 */

// ── Response Data Types ────────────────────────────────────

export interface ProjectDeploymentData {
  version: string;
  deployedAt: string | null;
}

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  hasPublishedProcess: boolean;
  processId: string | null;
  currentDeployment: ProjectDeploymentData | null;
  createdBy: string;
  createdAt: string | null;
  archived: boolean;
  stageCount: number;
  currentStage: number;
}

// ── Request/Response Types ─────────────────────────────────

export interface GetProjectOptions {
  projectId: string;
  apiUrl: string;
  apiKey: string;
}

export interface GetProjectSuccessResponse {
  success: true;
  data: ProjectData;
  requestId: string;
}

export interface GetProjectErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type GetProjectResponse =
  | GetProjectSuccessResponse
  | GetProjectErrorResponse;

// ── Type Guards ────────────────────────────────────────────

export function isGetProjectSuccess(
  response: GetProjectResponse,
): response is GetProjectSuccessResponse {
  return response.success === true;
}

export function isGetProjectError(
  response: GetProjectResponse,
): response is GetProjectErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

export async function getProject(
  options: GetProjectOptions,
): Promise<GetProjectResponse> {
  const { projectId, apiKey, apiUrl } = options;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify({ projectId }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as GetProjectResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as GetProjectResponse;
  }

  return (await response.json()) as GetProjectResponse;
}

// ── OrThrow Convenience ────────────────────────────────────

export async function getProjectOrThrow(
  options: GetProjectOptions,
): Promise<GetProjectSuccessResponse> {
  const result = await getProject(options);

  if (isGetProjectError(result)) {
    throw new Error(`Failed to get project: ${result.error.message}`);
  }

  return result;
}
