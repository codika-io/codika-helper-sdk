# `codika organization create --name <name>`

Creates a new organization on the Codika platform via API key. Supports optional logo upload (base64-encoded), self-hosted n8n configuration, and organization metadata. Requires a personal or admin-level API key (not an org-scoped key, since the org doesn't exist yet).

**Scope required**: `organizations:create` (typically only available on personal/admin keys)
**Method**: POST (body: `{ name, description?, size?, logoBase64?, logoMimeType?, n8nBaseUrl?, n8nApiKey?, storeCredentialCopy? }`)
**Cloud Function**: `createOrganizationViaApiKey`

**Note**: This is a destructive test -- each run creates a real organization. Use sparingly and clean up after testing.

---

## [P] Happy path -- create organization with JSON output

```bash
codika organization create --name "CLI Test Org $(date +%s)" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, `data.organizationId` is a non-empty string, `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies organization creation via API key.

**Note**: This test may fail if the profile's key does not have `organizations:create` scope (org-scoped keys typically lack this). Use a personal/admin key.

**Cleanup**: Delete the organization via Firestore console.

---

## [P] Human-readable output

```bash
codika organization create --name "CLI Test Org HR $(date +%s)" --profile cli-test-owner-full
```

**Expect**: Output shows `Creating organization "..."...`, then `✓ Organization Created Successfully` with Organization ID and Request ID.

**Why**: Verifies the formatted output path.

**Cleanup**: Delete the organization.

---

## [P] `--description` and `--size` flags

```bash
codika organization create --name "CLI Test Org Full $(date +%s)" --description "Test organization" --size "2-10" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, organization is created with the provided description and size metadata.

**Why**: Optional fields should be passed through to the API correctly. Valid sizes: solo, 2-10, 11-50, 51-200, 201-1000, 1000+.

**Cleanup**: Delete the organization.

---

## [P] `--logo` flag with valid image

```bash
codika organization create --name "CLI Test Logo $(date +%s)" --logo /path/to/small-logo.png --profile cli-test-owner-full --json
```

**Expect**: `success: true`, the logo is base64-encoded and sent with the appropriate MIME type.

**Why**: Logo upload requires reading a file, detecting MIME type from extension, checking the 5MB size limit, and base64 encoding.

**Cleanup**: Delete the organization.

---

## [P] `--n8n-base-url` and `--n8n-api-key` flags

```bash
codika organization create --name "CLI Test n8n $(date +%s)" --n8n-base-url "https://n8n.example.com" --n8n-api-key "test-n8n-key" --profile cli-test-owner-full --json
```

**Expect**: `success: true`, organization is created with self-hosted n8n configuration.

**Why**: Self-hosted n8n support is a key feature. These flags configure the n8n instance for the organization.

**Cleanup**: Delete the organization.

---

## [N] Missing `--name` (required option)

```bash
codika organization create --profile cli-test-owner-full --json
```

**Expect**: Commander error -- required option `--name` missing. Process exits before making an API call.

**Why**: `--name` is a `requiredOption` in Commander. Client-side validation.

---

## [N] Unsupported logo format

```bash
codika organization create --name "CLI Test Bad Logo" --logo /path/to/file.gif --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: `Unsupported image format ".gif". Use JPEG, PNG, or WebP.`

**Why**: CLI validates the logo file extension against a whitelist (JPEG, PNG, WebP) before reading the file. GIF, SVG, etc. are rejected.

---

## [N] Logo file too large (> 5MB)

```bash
codika organization create --name "CLI Test Large Logo" --logo /path/to/large-file.png --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: `Logo file exceeds 5MB limit.`

**Why**: Client-side file size check before base64 encoding and sending to the API.

---

## [N] Logo file not found

```bash
codika organization create --name "CLI Test Missing Logo" --logo /nonexistent/logo.png --profile cli-test-owner-full --json
```

**Expect**: Exit code 2, error: `Cannot read logo file: ...`

**Why**: Client-side file existence check with a descriptive error message.

---

## [S] Scope enforcement -- org key lacks `organizations:create`

Standard org-scoped keys do not have `organizations:create` since the scope is for creating NEW organizations.

```bash
codika organization create --name "CLI Test No Scope $(date +%s)" --profile cli-test-limited --json
```

**Expect**: `success: false`, error about missing scope or unauthorized.

**Why**: The `organizations:create` scope is typically only available on personal/admin keys, not org-scoped keys. Org keys are bound to an existing org.

---

## [S] Invalid API key

```bash
codika organization create --name "CLI Test Invalid Key" --api-key "cko_garbage_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Auth middleware rejects invalid keys before business logic.

---

## Last tested

Not yet tested.
