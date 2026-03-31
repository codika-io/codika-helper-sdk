/**
 * List Instances Client
 * HTTP client for listing process instances in an organization
 */

// ── Response Data Types ────────────────────────────────────

export interface ProcessInstanceSummary {
  processInstanceId: string;
  processId: string;
  title: string;
  environment: 'dev' | 'prod';
  isActive: boolean;
  archived: boolean;
  currentVersion: string;
  installedAt: string | null;
  lastExecutedAt: string | null;
  inactiveReason?: string;
}

// ── Request/Response Types ─────────────────────────────────

export interface ListInstancesOptions {
  apiUrl: string;
  apiKey: string;
  environment?: 'dev' | 'prod';
  archived?: boolean;
  limit?: number;
}

export interface ListInstancesSuccessResponse {
  success: true;
  data: {
    instances: ProcessInstanceSummary[];
    count: number;
    organizationId: string;
  };
  requestId: string;
}

export interface ListInstancesErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type ListInstancesResponse =
  | ListInstancesSuccessResponse
  | ListInstancesErrorResponse;

// ── Type Guards ────────────────────────────────────────────

export function isListInstancesSuccess(
  response: ListInstancesResponse,
): response is ListInstancesSuccessResponse {
  return response.success === true;
}

export function isListInstancesError(
  response: ListInstancesResponse,
): response is ListInstancesErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

export async function listInstances(
  options: ListInstancesOptions,
): Promise<ListInstancesResponse> {
  const { apiKey, apiUrl, environment, archived, limit } = options;

  const url = new URL(apiUrl);
  if (environment) url.searchParams.set('environment', environment);
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
      if (body.success === false) return body as unknown as ListInstancesResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as ListInstancesResponse;
  }

  return (await response.json()) as ListInstancesResponse;
}

// ── OrThrow Convenience ────────────────────────────────────

export async function listInstancesOrThrow(
  options: ListInstancesOptions,
): Promise<ListInstancesSuccessResponse> {
  const result = await listInstances(options);

  if (isListInstancesError(result)) {
    throw new Error(`Failed to list instances: ${result.error.message}`);
  }

  return result;
}
