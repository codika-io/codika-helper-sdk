/**
 * Document Deployment Client
 * HTTP client for deploying use case documents to the Codika platform.
 */

// ── Types ────────────────────────────────────────────────

export interface DocumentInput {
  stage: number;
  title: string;
  content: string;
  summary: string;
}

export interface CreatedDocumentInfo {
  stage: number;
  documentId: string;
  version: string;
  status: 'accepted';
}

export interface DeployDocumentsSuccessResult {
  success: true;
  projectId: string;
  documentsCreated: CreatedDocumentInfo[];
  requestId: string;
}

export interface DeployDocumentsErrorResult {
  success: false;
  error: string;
  errorCode?: string;
  details?: { stage?: number; reason?: string };
  requestId?: string;
}

export type DeployDocumentsResult = DeployDocumentsSuccessResult | DeployDocumentsErrorResult;

// ── API Functions ────────────────────────────────────────

export async function deployDocuments(options: {
  projectId: string;
  documents: DocumentInput[];
  apiUrl: string;
  apiKey: string;
}): Promise<DeployDocumentsResult> {
  const { projectId, documents, apiUrl, apiKey } = options;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Process-Manager-Key': apiKey,
      },
      body: JSON.stringify({ projectId, documents }),
    });

    const result = await response.json() as Record<string, any>;

    if (result.success) {
      return {
        success: true,
        projectId: result.data.projectId,
        documentsCreated: result.data.documentsCreated,
        requestId: result.requestId,
      };
    } else {
      return {
        success: false,
        error: result.error?.message || 'Unknown error',
        errorCode: result.error?.code,
        details: result.error?.details,
        requestId: result.requestId,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function isDeployDocumentsSuccess(
  result: DeployDocumentsResult
): result is DeployDocumentsSuccessResult {
  return result.success === true;
}
