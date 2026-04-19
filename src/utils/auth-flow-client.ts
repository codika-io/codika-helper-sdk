/**
 * Auth Flow Client
 *
 * HTTP wrappers around the CLI-facing OTP endpoints on the Codika platform:
 *   - cliRequestSignupOtp
 *   - cliCompleteSignup
 *   - cliRequestLoginOtp
 *   - cliCompleteLogin
 *
 * All wrappers return a discriminated union so callers can switch on
 * `success` without try/catch. Network errors are folded into the same
 * `{ success: false, error: { code: 'network-error', ... } }` shape.
 */

// ── Shared wire shapes ───────────────────────────────────

export interface AuthApiErrorBody {
  code: string;
  message: string;
  nextAction?: string;
  details?: Record<string, unknown>;
}

export interface AuthSuccess<T> {
  success: true;
  data: T;
}

export interface AuthFailure {
  success: false;
  status: number;
  error: AuthApiErrorBody;
}

export type AuthResponse<T> = AuthSuccess<T> | AuthFailure;

// ── Payload + response shapes ────────────────────────────

export interface RequestOtpData {
  email: string;
  expiresInSeconds: number;
}

export interface ApiKeyOnResponse {
  keyId: string;
  raw: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  createdAt: string;
  expiresAt?: string;
}

export interface CompleteSignupData {
  organizationId: string;
  organizationName: string;
  apiKey: ApiKeyOnResponse;
  isNewUser: boolean;
}

export interface CompleteLoginData {
  organizationId: string;
  organizationName: string;
  apiKey: ApiKeyOnResponse;
}

export interface SignupCompleteInput {
  email: string;
  code: string;
  company?: { name?: string; description?: string };
  apiKey?: { name?: string; expiresInDays?: number };
}

export interface LoginCompleteInput {
  email: string;
  code: string;
  organizationId?: string;
  apiKey?: { name?: string; expiresInDays?: number };
}

// ── Low-level POST helper ────────────────────────────────

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<AuthResponse<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      success: false,
      status: 0,
      error: {
        code: 'network-error',
        message: err instanceof Error ? err.message : 'Network error',
      },
    };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return {
      success: false,
      status: response.status,
      error: {
        code: 'invalid-response',
        message: `Non-JSON response (HTTP ${response.status})`,
      },
    };
  }

  const body2 = parsed as
    | { success: true; data: T }
    | { success: false; error: AuthApiErrorBody }
    | undefined;

  if (body2 && body2.success === true) {
    return { success: true, data: body2.data };
  }

  if (body2 && body2.success === false) {
    return { success: false, status: response.status, error: body2.error };
  }

  return {
    success: false,
    status: response.status,
    error: {
      code: 'invalid-response',
      message: `Unexpected response shape (HTTP ${response.status})`,
    },
  };
}

// ── Public wrappers ──────────────────────────────────────

export function signupRequest(
  email: string,
  url: string,
): Promise<AuthResponse<RequestOtpData>> {
  return postJson<RequestOtpData>(url, { email });
}

export function signupComplete(
  input: SignupCompleteInput,
  url: string,
): Promise<AuthResponse<CompleteSignupData>> {
  const body: Record<string, unknown> = {
    email: input.email,
    code: input.code,
  };
  if (input.company) body.company = input.company;
  if (input.apiKey) body.apiKey = input.apiKey;
  return postJson<CompleteSignupData>(url, body);
}

export function loginRequest(
  email: string,
  url: string,
): Promise<AuthResponse<RequestOtpData>> {
  return postJson<RequestOtpData>(url, { email });
}

export function loginComplete(
  input: LoginCompleteInput,
  url: string,
): Promise<AuthResponse<CompleteLoginData>> {
  const body: Record<string, unknown> = {
    email: input.email,
    code: input.code,
  };
  if (input.organizationId) body.organizationId = input.organizationId;
  if (input.apiKey) body.apiKey = input.apiKey;
  return postJson<CompleteLoginData>(url, body);
}
