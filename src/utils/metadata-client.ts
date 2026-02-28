/**
 * Metadata Client
 * HTTP client for fetching metadata documents from the Codika platform via API key
 */

/**
 * Options for fetching metadata
 */
export interface FetchMetadataOptions {
  /** Project ID to fetch metadata for */
  projectId: string;
  /** Optional version in "X.Y" format (fetches latest if omitted) */
  version?: string;
  /** Whether to include base64-encoded file content in the response */
  includeContent?: boolean;
  /** API URL for the getMetadataDocumentsEndpoint */
  apiUrl: string;
  /** API key (organization API key or admin key) */
  apiKey: string;
}

/**
 * A single stored metadata document
 */
export interface StoredMetadataDocument {
  relativePath: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  description?: string;
  contentBase64?: string;
}

/**
 * Success response from metadata fetch
 */
export interface FetchMetadataSuccessResponse {
  success: true;
  data: {
    projectId: string;
    version: string;
    organizationId: string;
    documents: StoredMetadataDocument[];
  };
  requestId: string;
}

/**
 * Error response from metadata fetch
 */
export interface FetchMetadataErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  requestId: string;
}

/**
 * Combined response type
 */
export type FetchMetadataResponse =
  | FetchMetadataSuccessResponse
  | FetchMetadataErrorResponse;

/**
 * Type guard for success response
 */
export function isFetchMetadataSuccess(
  response: FetchMetadataResponse
): response is FetchMetadataSuccessResponse {
  return response.success === true;
}

/**
 * Type guard for error response
 */
export function isFetchMetadataError(
  response: FetchMetadataResponse
): response is FetchMetadataErrorResponse {
  return response.success === false;
}

/**
 * Fetch metadata documents from the Codika platform
 *
 * @param options - Metadata fetch options
 * @returns Metadata fetch result
 */
export async function fetchMetadata(
  options: FetchMetadataOptions
): Promise<FetchMetadataResponse> {
  const {
    projectId,
    version,
    includeContent,
    apiKey,
    apiUrl,
  } = options;

  const requestBody: Record<string, any> = {
    projectId,
  };

  if (version) {
    requestBody.version = version;
  }

  if (includeContent !== undefined) {
    requestBody.includeContent = includeContent;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Process-Manager-Key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const result = (await response.json()) as FetchMetadataResponse;

  return result;
}

/**
 * Fetch metadata and throw on error
 * Convenience function for when you want exceptions on failure
 *
 * @param options - Metadata fetch options
 * @returns Success response with metadata documents
 * @throws Error if fetch fails
 */
export async function fetchMetadataOrThrow(
  options: FetchMetadataOptions
): Promise<FetchMetadataSuccessResponse> {
  const result = await fetchMetadata(options);

  if (isFetchMetadataError(result)) {
    throw new Error(
      `Metadata fetch failed: ${result.error.message}`
    );
  }

  return result;
}
