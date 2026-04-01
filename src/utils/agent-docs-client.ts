/**
 * Agent Documents Client
 * HTTP client for managing agent-managed project documents on the Codika platform.
 */

// ── Types ────────────────────────────────────────────────

export interface UpsertAgentDocumentOptions {
  projectId: string;
  documentTypeId: string;
  title: string;
  content: string;
  summary: string;
  agentId?: string | null;
  majorChange?: boolean;
  apiUrl: string;
  apiKey: string;
}

export interface UpsertAgentDocumentSuccessResult {
  success: true;
  data: {
    projectId: string;
    documentId: string;
    documentTypeId: string;
    version: string;
    isNew: boolean;
  };
  requestId: string;
}

export interface UpsertAgentDocumentErrorResult {
  success: false;
  error: { code?: string; message: string };
  requestId?: string;
}

export type UpsertAgentDocumentResult =
  | UpsertAgentDocumentSuccessResult
  | UpsertAgentDocumentErrorResult;

export interface GetAgentDocumentsOptions {
  projectId: string;
  documentTypeId?: string;
  includeHistory?: boolean;
  version?: string;
  apiUrl: string;
  apiKey: string;
}

export interface AgentDocumentData {
  id: string;
  projectId: string;
  documentTypeId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  versionFilterKey: number;
  parentVersion: string | null;
  status: 'current' | 'superseded';
  title: string;
  content: string;
  summary: string;
  createdAt: any;
  agentId: string | null;
  contentLength: number;
  wordCount: number;
}

export interface GetAgentDocumentsSuccessResult {
  success: true;
  data: {
    projectId: string;
    documents: AgentDocumentData[];
  };
  requestId: string;
}

export interface GetAgentDocumentsErrorResult {
  success: false;
  error: { code?: string; message: string };
  requestId?: string;
}

export type GetAgentDocumentsResult =
  | GetAgentDocumentsSuccessResult
  | GetAgentDocumentsErrorResult;

// ── Type Guards ─────────────────────────────────────────

export function isUpsertSuccess(
  result: UpsertAgentDocumentResult
): result is UpsertAgentDocumentSuccessResult {
  return result.success === true;
}

export function isGetSuccess(
  result: GetAgentDocumentsResult
): result is GetAgentDocumentsSuccessResult {
  return result.success === true;
}

// ── API Functions ───────────────────────────────────────

export async function upsertAgentDocument(
  options: UpsertAgentDocumentOptions
): Promise<UpsertAgentDocumentResult> {
  const { apiUrl, apiKey, ...body } = options;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Process-Manager-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    return (await response.json()) as UpsertAgentDocumentResult;
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function getAgentDocuments(
  options: GetAgentDocumentsOptions
): Promise<GetAgentDocumentsResult> {
  const { apiUrl, apiKey, ...params } = options;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Process-Manager-Key': apiKey,
      },
      body: JSON.stringify(params),
    });

    return (await response.json()) as GetAgentDocumentsResult;
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}
