/**
 * Instance State Client
 * HTTP client for activating and deactivating process instances
 */

// ── Response Types ─────────────────────────────────────────

export interface InstanceStateSuccessResponse {
  success: true;
  data: {
    processInstanceId: string;
    isActive: boolean;
    workflowCount: number;
  };
  requestId: string;
}

export interface InstanceStateErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type InstanceStateResponse =
  | InstanceStateSuccessResponse
  | InstanceStateErrorResponse;

// ── Options ────────────────────────────────────────────────

export interface InstanceStateOptions {
  processInstanceId: string;
  apiUrl: string;
  apiKey: string;
}

// ── Type Guards ────────────────────────────────────────────

export function isInstanceStateSuccess(
  response: InstanceStateResponse,
): response is InstanceStateSuccessResponse {
  return response.success === true;
}

export function isInstanceStateError(
  response: InstanceStateResponse,
): response is InstanceStateErrorResponse {
  return response.success === false;
}

// ── Client ─────────────────────────────────────────────────

async function changeInstanceState(
  options: InstanceStateOptions,
): Promise<InstanceStateResponse> {
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
      if (body.success === false) return body as unknown as InstanceStateResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    } as InstanceStateResponse;
  }

  return (await response.json()) as InstanceStateResponse;
}

export async function activateInstance(
  options: InstanceStateOptions,
): Promise<InstanceStateResponse> {
  return changeInstanceState(options);
}

export async function deactivateInstance(
  options: InstanceStateOptions,
): Promise<InstanceStateResponse> {
  return changeInstanceState(options);
}

// ── OrThrow Convenience ────────────────────────────────────

export async function activateInstanceOrThrow(
  options: InstanceStateOptions,
): Promise<InstanceStateSuccessResponse> {
  const result = await activateInstance(options);
  if (isInstanceStateError(result)) {
    throw new Error(`Failed to activate instance: ${result.error.message}`);
  }
  return result;
}

export async function deactivateInstanceOrThrow(
  options: InstanceStateOptions,
): Promise<InstanceStateSuccessResponse> {
  const result = await deactivateInstance(options);
  if (isInstanceStateError(result)) {
    throw new Error(`Failed to deactivate instance: ${result.error.message}`);
  }
  return result;
}
