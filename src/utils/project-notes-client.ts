/**
 * Project Notes Client
 * HTTP client for managing project notes on the Codika platform.
 */

// ── Types ────────────────────────────────────────────────

export interface UpsertProjectNoteOptions {
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

export interface UpsertProjectNoteSuccessResult {
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

export interface UpsertProjectNoteErrorResult {
  success: false;
  error: { code?: string; message: string };
  requestId?: string;
}

export type UpsertProjectNoteResult =
  | UpsertProjectNoteSuccessResult
  | UpsertProjectNoteErrorResult;

export interface GetProjectNotesOptions {
  projectId: string;
  documentTypeId?: string;
  includeHistory?: boolean;
  version?: string;
  apiUrl: string;
  apiKey: string;
}

export interface ProjectNoteData {
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

export interface GetProjectNotesSuccessResult {
  success: true;
  data: {
    projectId: string;
    documents: ProjectNoteData[];
  };
  requestId: string;
}

export interface GetProjectNotesErrorResult {
  success: false;
  error: { code?: string; message: string };
  requestId?: string;
}

export type GetProjectNotesResult =
  | GetProjectNotesSuccessResult
  | GetProjectNotesErrorResult;

// ── Type Guards ─────────────────────────────────────────

export function isUpsertSuccess(
  result: UpsertProjectNoteResult
): result is UpsertProjectNoteSuccessResult {
  return result.success === true;
}

export function isGetSuccess(
  result: GetProjectNotesResult
): result is GetProjectNotesSuccessResult {
  return result.success === true;
}

// ── API Functions ───────────────────────────────────────

export async function upsertProjectNote(
  options: UpsertProjectNoteOptions
): Promise<UpsertProjectNoteResult> {
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

    return (await response.json()) as UpsertProjectNoteResult;
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}

export async function getProjectNotes(
  options: GetProjectNotesOptions
): Promise<GetProjectNotesResult> {
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

    return (await response.json()) as GetProjectNotesResult;
  } catch (error) {
    return {
      success: false,
      error: { message: error instanceof Error ? error.message : String(error) },
    };
  }
}
