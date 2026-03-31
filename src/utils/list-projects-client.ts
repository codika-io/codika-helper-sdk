/**
 * List Projects Client
 * HTTP client for listing projects in an organization
 */

// ── Response Data Types ────────────────────────────────────

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'in_progress' | 'completed';
  hasPublishedProcess: boolean;
  createdBy: string;
  createdAt: string | null;
  archived: boolean;
}

// ── Request/Response Types ─────────────────────────────────

export interface ListProjectsOptions {
  apiUrl: string;
  apiKey: string;
  archived?: boolean;
  limit?: number;
}

export interface ListProjectsSuccessResponse {
  success: true;
  data: {
    projects: ProjectSummary[];
    count: number;
    organizationId: string;
  };
  requestId: string;
}

export interface ListProjectsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type ListProjectsResponse =
  | ListProjectsSuccessResponse
  | ListProjectsErrorResponse;

// ── Type Guards ────────────────────────────────────────────

export function isListProjectsSuccess(
  response: ListProjectsResponse,
): response is ListProjectsSuccessResponse {
  return response.success === true;
}

export function isListProjectsError(
  response: ListProjectsResponse,
): response is ListProjectsErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

export async function listProjects(
  options: ListProjectsOptions,
): Promise<ListProjectsResponse> {
  const { apiKey, apiUrl, archived, limit } = options;

  const url = new URL(apiUrl);
  if (archived) url.searchParams.set('archived', 'true');
  if (limit) url.searchParams.set('limit', String(limit));

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'X-Process-Manager-Key': apiKey,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as ListProjectsResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as ListProjectsResponse;
  }

  return (await response.json()) as ListProjectsResponse;
}

// ── OrThrow Convenience ────────────────────────────────────

export async function listProjectsOrThrow(
  options: ListProjectsOptions,
): Promise<ListProjectsSuccessResponse> {
  const result = await listProjects(options);

  if (isListProjectsError(result)) {
    throw new Error(`Failed to list projects: ${result.error.message}`);
  }

  return result;
}
