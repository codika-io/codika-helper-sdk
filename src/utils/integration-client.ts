/**
 * Integration Client
 *
 * HTTP client for managing integrations via public API endpoints.
 * Follows the same pattern as redeploy-client.ts.
 */

// ── Shared Types ──────────────────────────────────────

interface EncryptedField {
  value: string;
  encrypted: boolean;
  description?: string;
}

// ── Create Integration ────────────────────────────────

export interface CreateIntegrationRequest {
  organizationId?: string;
  integrationId: string;
  contextType: 'organization' | 'member' | 'process_instance';
  memberId?: string;
  processInstanceId?: string;
  secrets: Record<string, EncryptedField>;
  metadata: Record<string, any>;
  customIntegrationSchema?: Record<string, any>;
}

export interface CreateIntegrationSuccessResponse {
  success: true;
  data: {
    message: string;
    n8nCredentialId?: string;
  };
  requestId: string;
}

export interface CreateIntegrationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type CreateIntegrationResponse =
  | CreateIntegrationSuccessResponse
  | CreateIntegrationErrorResponse;

export function isCreateIntegrationSuccess(
  response: CreateIntegrationResponse
): response is CreateIntegrationSuccessResponse {
  return response.success === true;
}

export interface CreateIntegrationOptions {
  apiUrl: string;
  apiKey: string;
  body: CreateIntegrationRequest;
}

export async function createIntegrationRemote(
  options: CreateIntegrationOptions
): Promise<CreateIntegrationResponse> {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': options.apiKey,
    },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as CreateIntegrationResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    };
  }

  return (await response.json()) as CreateIntegrationResponse;
}

// ── Delete Integration ────────────────────────────────

export interface DeleteIntegrationRequest {
  organizationId?: string;
  integrationId: string;
  contextType: 'organization' | 'member' | 'process_instance';
  memberId?: string;
  processInstanceId?: string;
  confirmDeletion?: boolean;
}

export interface PendingDeactivation {
  processInstanceId: string;
  title: string;
}

export interface DeleteIntegrationSuccessResponse {
  success: true;
  data: {
    message: string;
    deactivatedCount?: number;
  };
  requestId: string;
}

export interface DeleteIntegrationPendingResponse {
  success: false;
  data: {
    message: string;
    pendingDeactivations: {
      count: number;
      processes: PendingDeactivation[];
    };
  };
  requestId: string;
}

export interface DeleteIntegrationErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type DeleteIntegrationResponse =
  | DeleteIntegrationSuccessResponse
  | DeleteIntegrationPendingResponse
  | DeleteIntegrationErrorResponse;

export function isDeleteIntegrationSuccess(
  response: DeleteIntegrationResponse
): response is DeleteIntegrationSuccessResponse {
  return response.success === true;
}

export function isDeleteIntegrationPending(
  response: DeleteIntegrationResponse
): response is DeleteIntegrationPendingResponse {
  return response.success === false && 'data' in response && 'pendingDeactivations' in (response as any).data;
}

export interface DeleteIntegrationOptions {
  apiUrl: string;
  apiKey: string;
  body: DeleteIntegrationRequest;
}

export async function deleteIntegrationRemote(
  options: DeleteIntegrationOptions
): Promise<DeleteIntegrationResponse> {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': options.apiKey,
    },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as DeleteIntegrationResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    };
  }

  return (await response.json()) as DeleteIntegrationResponse;
}

// ── List Integrations ─────────────────────────────────

export interface ListIntegrationsRequest {
  organizationId?: string;
  processInstanceId?: string;
}

export interface IntegrationSummaryEntry {
  integrationId: string;
  contextType: 'organization' | 'member' | 'process_instance';
  connected: boolean;
  connectedAt?: string;
  connectedBy?: string;
  hasValidTokens?: boolean;
  n8nCredentialId?: string;
  customSchema?: Record<string, any>;
}

export interface ListIntegrationsSuccessResponse {
  success: true;
  data: {
    integrations: IntegrationSummaryEntry[];
  };
  requestId: string;
}

export interface ListIntegrationsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type ListIntegrationsResponse =
  | ListIntegrationsSuccessResponse
  | ListIntegrationsErrorResponse;

export function isListIntegrationsSuccess(
  response: ListIntegrationsResponse
): response is ListIntegrationsSuccessResponse {
  return response.success === true;
}

export interface ListIntegrationsOptions {
  apiUrl: string;
  apiKey: string;
  body: ListIntegrationsRequest;
}

export async function listIntegrationsRemote(
  options: ListIntegrationsOptions
): Promise<ListIntegrationsResponse> {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': options.apiKey,
    },
    body: JSON.stringify(options.body),
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as ListIntegrationsResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    };
  }

  return (await response.json()) as ListIntegrationsResponse;
}

// ── Get Credential Schema ────────────────────────────

export interface CredentialSchemaData {
  type: string;
  properties: Record<string, { type: string; enum?: string[] }>;
  required: string[];
  additionalProperties: boolean;
  allOf?: any[];
}

export interface GetCredentialSchemaSuccessResponse {
  success: true;
  data: CredentialSchemaData;
  requestId: string;
}

export interface GetCredentialSchemaErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

export type GetCredentialSchemaResponse =
  | GetCredentialSchemaSuccessResponse
  | GetCredentialSchemaErrorResponse;

export function isGetCredentialSchemaSuccess(
  response: GetCredentialSchemaResponse
): response is GetCredentialSchemaSuccessResponse {
  return response.success === true;
}

export interface GetCredentialSchemaOptions {
  apiUrl: string;
  apiKey: string;
  credentialType: string;
}

export async function getCredentialSchemaRemote(
  options: GetCredentialSchemaOptions
): Promise<GetCredentialSchemaResponse> {
  const url = `${options.apiUrl}?type=${encodeURIComponent(options.credentialType)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-Process-Manager-Key': options.apiKey,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as Record<string, unknown>;
      const err = body.error as Record<string, unknown> | undefined;
      if (err?.message) errorMessage = String(err.message);
      if (body.success === false) return body as unknown as GetCredentialSchemaResponse;
    } catch {
      // Response body is not JSON
    }
    return {
      success: false,
      error: { code: `HTTP_${response.status}`, message: errorMessage },
      requestId: '',
    };
  }

  return (await response.json()) as GetCredentialSchemaResponse;
}
