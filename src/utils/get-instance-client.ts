/**
 * Get Instance Client
 * HTTP client for fetching process instance details (status, parameters, workflows)
 */

// ── Response Data Types ────────────────────────────────────

export interface WorkflowSummary {
  workflowId: string;
  n8nWorkflowId: string | null;
  workflowName: string;
}

export interface DeploymentData {
  deploymentInstanceId: string;
  deploymentStatus: 'pending' | 'deploying' | 'deployed' | 'failed' | 'updating';
  deploymentParameters: Record<string, unknown>;
  deploymentInputSchema: unknown[];
  workflows: WorkflowSummary[];
}

export interface ProcessInstanceData {
  processInstanceId: string;
  processId: string;
  environment: 'dev' | 'prod';
  isActive: boolean;
  archived: boolean;
  currentVersion: string;
  title: string;
  organizationId: string;
  installedAt: string | null;
  lastExecutedAt: string | null;
  deployment: DeploymentData | null;
}

// ── Request/Response Types ─────────────────────────────────

export interface GetProcessInstanceOptions {
  processInstanceId: string;
  apiUrl: string;
  apiKey: string;
}

export interface GetProcessInstanceSuccessResponse {
  success: true;
  data: ProcessInstanceData;
  requestId: string;
}

export interface GetProcessInstanceErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type GetProcessInstanceResponse =
  | GetProcessInstanceSuccessResponse
  | GetProcessInstanceErrorResponse;

// ── Type Guards ────────────────────────────────────────────

export function isGetProcessInstanceSuccess(
  response: GetProcessInstanceResponse,
): response is GetProcessInstanceSuccessResponse {
  return response.success === true;
}

export function isGetProcessInstanceError(
  response: GetProcessInstanceResponse,
): response is GetProcessInstanceErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

export async function getProcessInstance(
  options: GetProcessInstanceOptions,
): Promise<GetProcessInstanceResponse> {
  const { processInstanceId, apiKey, apiUrl } = options;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify({ processInstanceId }),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as GetProcessInstanceResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as GetProcessInstanceResponse;
  }

  return (await response.json()) as GetProcessInstanceResponse;
}

// ── OrThrow Convenience ────────────────────────────────────

export async function getProcessInstanceOrThrow(
  options: GetProcessInstanceOptions,
): Promise<GetProcessInstanceSuccessResponse> {
  const result = await getProcessInstance(options);

  if (isGetProcessInstanceError(result)) {
    throw new Error(
      `Failed to get process instance: ${result.error.message}`,
    );
  }

  return result;
}
