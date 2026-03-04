/**
 * List Executions Client
 * HTTP client for listing process instance executions
 */

// ── Response Types ──────────────────────────────────────

export interface ExecutionSummary {
  executionId: string;
  workflowId: string;
  triggerId: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  duration?: number;
  n8nExecutionId?: string;
  errorDetails?: {
    message: string;
    failedNodeName?: string;
  };
}

export interface ListExecutionsSuccessResponse {
  success: true;
  data: {
    executions: ExecutionSummary[];
    count: number;
    processInstanceId: string;
  };
  requestId: string;
}

export interface ListExecutionsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type ListExecutionsResponse = ListExecutionsSuccessResponse | ListExecutionsErrorResponse;

// ── Options ─────────────────────────────────────────────

export interface ListExecutionsOptions {
  processInstanceId: string;
  apiUrl: string;
  apiKey: string;
  workflowId?: string;
  status?: string;
  limit?: number;
}

// ── Type Guards ─────────────────────────────────────────

export function isListExecutionsSuccess(
  response: ListExecutionsResponse
): response is ListExecutionsSuccessResponse {
  return response.success === true;
}

export function isListExecutionsError(
  response: ListExecutionsResponse
): response is ListExecutionsErrorResponse {
  return response.success === false;
}

// ── Client ──────────────────────────────────────────────

export async function listExecutions(
  options: ListExecutionsOptions
): Promise<ListExecutionsResponse> {
  const { processInstanceId, apiKey, apiUrl, workflowId, status, limit } = options;

  // Build URL with path param and query params
  const url = new URL(`${apiUrl}/${processInstanceId}`);
  if (workflowId) url.searchParams.set('workflowId', workflowId);
  if (status) url.searchParams.set('status', status);
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
      const body = await response.json() as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as ListExecutionsResponse;
    } catch {
      // Response body is not JSON (e.g. HTML error page from load balancer)
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as ListExecutionsResponse;
  }

  return (await response.json()) as ListExecutionsResponse;
}
