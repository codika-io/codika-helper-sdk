/**
 * Redeploy Client
 * HTTP client for redeploying process deployment instances with parameter overrides
 */

// ── Request/Response Types ──────────────────────────────

export interface RedeployRequest {
  processInstanceId: string;
  deploymentParameters?: Record<string, any>;
  forceRedeploy?: boolean;
}

export interface RedeploySuccessData {
  deploymentStatus: 'deployed' | 'failed';
  deploymentInstanceId: string;
  n8nWorkflowIds: string[];
}

export interface RedeploySuccessResponse {
  success: true;
  data: RedeploySuccessData;
  requestId: string;
}

export interface RedeployErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type RedeployResponse = RedeploySuccessResponse | RedeployErrorResponse;

// ── Options ─────────────────────────────────────────────

export interface RedeployOptions {
  processInstanceId: string;
  apiUrl: string;
  apiKey: string;
  deploymentParameters?: Record<string, any>;
  forceRedeploy?: boolean;
}

// ── Type Guards ─────────────────────────────────────────

export function isRedeploySuccess(
  response: RedeployResponse
): response is RedeploySuccessResponse {
  return response.success === true;
}

export function isRedeployError(
  response: RedeployResponse
): response is RedeployErrorResponse {
  return response.success === false;
}

// ── Client ──────────────────────────────────────────────

export async function redeployInstance(
  options: RedeployOptions
): Promise<RedeployResponse> {
  const {
    processInstanceId,
    apiKey,
    apiUrl,
    deploymentParameters,
    forceRedeploy,
  } = options;

  const requestBody: RedeployRequest = {
    processInstanceId,
  };

  if (deploymentParameters) requestBody.deploymentParameters = deploymentParameters;
  if (typeof forceRedeploy === 'boolean') requestBody.forceRedeploy = forceRedeploy;

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
      if (body.success === false) return body as unknown as RedeployResponse;
    } catch {
      // Response body is not JSON (e.g. HTML error page from load balancer)
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as RedeployResponse;
  }

  return (await response.json()) as RedeployResponse;
}
