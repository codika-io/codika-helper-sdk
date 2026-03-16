/**
 * Skills Client
 *
 * HTTP client for fetching skill documents from the Codika platform.
 * Calls the getProcessSkillsPublic cloud function.
 */

import type { SkillDocument } from '../types/process-types.js';

export interface FetchSkillsOptions {
  /** Process instance ID to fetch skills for */
  processInstanceId: string;
  /** API URL for the getProcessSkills endpoint */
  apiUrl: string;
  /** API key for authentication */
  apiKey: string;
}

export interface FetchSkillsSuccessResponse {
  success: true;
  data: {
    processInstanceId: string;
    skills: SkillDocument[];
  };
}

export interface FetchSkillsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type FetchSkillsResponse = FetchSkillsSuccessResponse | FetchSkillsErrorResponse;

/**
 * Fetch skills for a process instance
 */
export async function fetchSkills(options: FetchSkillsOptions): Promise<FetchSkillsResponse> {
  const { processInstanceId, apiUrl, apiKey } = options;

  const url = `${apiUrl}/${processInstanceId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-API-Key': apiKey,
    },
  });

  const result = (await response.json()) as FetchSkillsResponse;
  return result;
}

/**
 * Type guard for success response
 */
export function isFetchSkillsSuccess(
  response: FetchSkillsResponse,
): response is FetchSkillsSuccessResponse {
  return response.success === true;
}
