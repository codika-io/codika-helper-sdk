/**
 * Trigger Client
 * HTTP client for triggering workflows and polling execution status via the Codika public API
 */

// ── Trigger Types ───────────────────────────────────────

export interface TriggerWorkflowOptions {
  /** Process instance ID */
  processInstanceId: string;
  /** Workflow ID (from use case config) */
  workflowId: string;
  /** Payload data to send to the workflow */
  payload: Record<string, unknown>;
  /** API URL for the triggerWebhookPublic endpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
}

export interface TriggerWorkflowSuccessResponse {
  success: true;
  executionId: string;
  message: string;
}

export interface TriggerWorkflowErrorResponse {
  success: false;
  error: string;
  code: string;
}

export type TriggerWorkflowResponse =
  | TriggerWorkflowSuccessResponse
  | TriggerWorkflowErrorResponse;

// ── Status Types ────────────────────────────────────────

export interface GetExecutionStatusOptions {
  /** Process instance ID */
  processInstanceId: string;
  /** Execution ID (from trigger response) */
  executionId: string;
  /** API URL for the getExecutionStatusPublic endpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
}

export interface ExecutionStatusData {
  executionId: string;
  status: 'pending' | 'success' | 'failed';
  createdAt: string;
  duration?: number;
  resultData?: unknown;
  errorDetails?: {
    type: string;
    message: string;
    code?: string;
    failedNodeName?: string;
  };
}

export interface GetExecutionStatusSuccessResponse {
  success: true;
  execution: ExecutionStatusData;
}

export interface GetExecutionStatusErrorResponse {
  success: false;
  error: string;
  code: string;
}

export type GetExecutionStatusResponse =
  | GetExecutionStatusSuccessResponse
  | GetExecutionStatusErrorResponse;

// ── Poll Types ──────────────────────────────────────────

export interface PollOptions {
  /** Polling interval in milliseconds (default: 3000) */
  intervalMs?: number;
  /** Maximum time to wait in milliseconds (default: 120000) */
  timeoutMs?: number;
  /** Callback on each poll attempt */
  onPoll?: (elapsedMs: number, attempt: number) => void;
}

// ── Type Guards ─────────────────────────────────────────

export function isTriggerSuccess(
  response: TriggerWorkflowResponse
): response is TriggerWorkflowSuccessResponse {
  return response.success === true;
}

export function isTriggerError(
  response: TriggerWorkflowResponse
): response is TriggerWorkflowErrorResponse {
  return response.success === false;
}

export function isStatusSuccess(
  response: GetExecutionStatusResponse
): response is GetExecutionStatusSuccessResponse {
  return response.success === true;
}

export function isStatusError(
  response: GetExecutionStatusResponse
): response is GetExecutionStatusErrorResponse {
  return response.success === false;
}

// ── Trigger Function ────────────────────────────────────

export async function triggerWorkflow(
  options: TriggerWorkflowOptions
): Promise<TriggerWorkflowResponse> {
  const { processInstanceId, workflowId, payload, apiUrl, apiKey } = options;

  const url = `${apiUrl}/${processInstanceId}/${workflowId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify({ payload }),
  });

  return (await response.json()) as TriggerWorkflowResponse;
}

export async function triggerWorkflowOrThrow(
  options: TriggerWorkflowOptions
): Promise<TriggerWorkflowSuccessResponse> {
  const result = await triggerWorkflow(options);

  if (isTriggerError(result)) {
    throw new Error(`Trigger failed: ${result.error}`);
  }

  return result;
}

// ── Status Function ─────────────────────────────────────

export async function getExecutionStatus(
  options: GetExecutionStatusOptions
): Promise<GetExecutionStatusResponse> {
  const { processInstanceId, executionId, apiUrl, apiKey } = options;

  const url = `${apiUrl}/${processInstanceId}/${executionId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Process-Manager-Key': apiKey,
    },
  });

  return (await response.json()) as GetExecutionStatusResponse;
}

export async function getExecutionStatusOrThrow(
  options: GetExecutionStatusOptions
): Promise<GetExecutionStatusSuccessResponse> {
  const result = await getExecutionStatus(options);

  if (isStatusError(result)) {
    throw new Error(`Status fetch failed: ${result.error}`);
  }

  return result;
}

// ── Poll Function ───────────────────────────────────────

export async function pollExecutionStatus(
  options: GetExecutionStatusOptions,
  pollOptions: PollOptions = {}
): Promise<GetExecutionStatusSuccessResponse> {
  const { intervalMs = 3000, timeoutMs = 120000, onPoll } = pollOptions;
  const startTime = Date.now();
  let attempt = 0;

  while (true) {
    attempt++;
    const elapsed = Date.now() - startTime;

    if (elapsed > timeoutMs) {
      throw new Error(
        `Polling timed out after ${Math.round(timeoutMs / 1000)}s. ` +
        `Execution may still be running. Check status with:\n` +
        `  codika-helper get execution ${options.executionId}`
      );
    }

    if (onPoll) {
      onPoll(elapsed, attempt);
    }

    const result = await getExecutionStatusOrThrow(options);

    if (result.execution.status !== 'pending') {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}
