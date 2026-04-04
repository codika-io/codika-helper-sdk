# `codika organization create --name <name>`

Creates a new organization on the Codika platform via API key. Supports optional logo upload (base64-encoded), self-hosted n8n configuration, and organization metadata.

**Scope required**: `organizations:create` (only available on personal `ckp_` and admin `cka_` keys)
**Method**: POST (body: `{ name, description?, size?, logoBase64?, logoMimeType?, n8nBaseUrl?, n8nApiKey?, storeCredentialCopy? }`)
**Cloud Function**: `createOrganizationViaApiKey`

**Key type constraint**: Organization keys (`cko_`) cannot create organizations -- they are scoped to a single existing org and lack the `organizations:create` scope. Only personal keys (`ckp_`) or admin keys (`cka_`) work.

**Destructive warning**: Every successful test creates a real organization. Use timestamped names and clean up via Firestore console after testing.

---

## Setup Note

These tests require a personal key (`ckp_`) or admin key (`cka_`) with `organizations:create` scope. The standard test profiles (`cli-test-owner-full`, etc.) use org-scoped keys (`cko_`) which **cannot** create organizations. Before running these tests:

1. Ensure you have a profile with a personal or admin key (e.g., `cli-test-personal`)
2. Or pass a personal/admin key directly via `--api-key`

The negative and security tests that use `cko_` profiles are expected to fail -- that is the point of those tests.

---

## [P] Happy path -- create organization with JSON output

```bash
codika organization create --name "CLI Test Org $(date +%s)" --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`, `data.organizationId` is a non-empty string, `requestId` present. Exit code 0.

**Why**: Core happy path -- verifies organization creation via personal/admin API key and JSON output formatting.

**Cleanup**: Delete the organization via Firestore console (`organizations/<id>`).

---

## [P] Human-readable output

```bash
codika organization create --name "CLI Test Org HR $(date +%s)" --api-key "$CODIKA_PERSONAL_KEY"
```

**Expect**: Output shows `Creating organization "CLI Test Org HR ..."...` (the progress line), then:
```
✓ Organization Created Successfully

  Organization ID: <non-empty string>
  Request ID:      <non-empty string>
```

Exit code 0.

**Why**: Verifies the formatted output path (lines 100-125 in `create.ts`). The progress message is printed before the API call, then the success block formats the result.

**Cleanup**: Delete the organization.

---

## [P] `--description` flag

```bash
codika organization create --name "CLI Test Desc $(date +%s)" --description "Integration test organization" --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`, organization created. The description is passed through to the API in the request body.

**Why**: Verifies optional `--description` is included in the POST body (line 108 of `organization-client.ts`: `if (description) { requestBody.description = description; }`).

**Cleanup**: Delete the organization.

---

## [P] `--size` flag -- each valid value

Valid sizes: `solo`, `2-10`, `11-50`, `51-200`, `201-1000`, `1000+`.

```bash
codika organization create --name "CLI Test Size $(date +%s)" --size "solo" --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`. The size value is passed through to the API.

```bash
codika organization create --name "CLI Test Size $(date +%s)" --size "2-10" --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`.

**Why**: The `--size` flag accepts a free-form string on the CLI side (no client-side validation). The API may validate against the allowed set. Testing at least two values (one simple, one with special chars) confirms the flag is wired through correctly.

**Cleanup**: Delete both organizations.

---

## [P] All optional metadata flags together

```bash
codika organization create \
  --name "CLI Test Full $(date +%s)" \
  --description "Full metadata test" \
  --size "11-50" \
  --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`, organization created with all metadata fields.

**Why**: Verifies that multiple optional fields can be passed simultaneously without conflicts.

**Cleanup**: Delete the organization.

---

## [P] `--logo` flag with valid PNG image

Requires a small PNG file at a known path. Create one first if needed:

```bash
# Create a 1x1 red pixel PNG (68 bytes) for testing
printf '\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82' > /tmp/cli-test-logo.png

codika organization create --name "CLI Test Logo $(date +%s)" --logo /tmp/cli-test-logo.png --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true`. The CLI reads the file, detects `.png` extension, maps it to `image/png` MIME type, base64-encodes it, and sends `logoBase64` + `logoMimeType` in the request body.

**Why**: Logo upload exercises file I/O, MIME type detection (line 17-22 `MIME_TYPES` map), size check (line 91), and base64 encoding (line 93). This is the most complex client-side logic in the command.

**Cleanup**: `rm /tmp/cli-test-logo.png` and delete the organization.

---

## [P] `--logo` flag with valid JPEG image

```bash
# Create a minimal JPEG for testing (or use any small .jpg file)
printf '\xff\xd8\xff\xe0' > /tmp/cli-test-logo.jpg

codika organization create --name "CLI Test Logo JPG $(date +%s)" --logo /tmp/cli-test-logo.jpg --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true` (or API may reject the malformed JPEG -- the point is the CLI accepts the `.jpg` extension and maps it to `image/jpeg`). The MIME type map includes both `.jpg` and `.jpeg`.

**Why**: Verifies the `.jpg` extension is recognized. The MIME_TYPES map has entries for both `.jpg` and `.jpeg`.

**Cleanup**: `rm /tmp/cli-test-logo.jpg` and delete the organization if created.

---

## [P] `--logo` flag with valid WebP image

```bash
printf 'RIFF\x00\x00\x00\x00WEBP' > /tmp/cli-test-logo.webp

codika organization create --name "CLI Test Logo WebP $(date +%s)" --logo /tmp/cli-test-logo.webp --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: CLI accepts the `.webp` extension, maps it to `image/webp`. Whether the API accepts the minimal file depends on server-side validation.

**Why**: Completes coverage of all three accepted formats (PNG, JPEG, WebP).

**Cleanup**: `rm /tmp/cli-test-logo.webp` and delete the organization if created.

---

## [P] `--n8n-base-url` and `--n8n-api-key` flags

```bash
codika organization create \
  --name "CLI Test n8n $(date +%s)" \
  --n8n-base-url "https://n8n.example.com" \
  --n8n-api-key "test-n8n-key-12345" \
  --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true` or a specific API error about invalid n8n credentials (if the API validates the n8n URL). The CLI passes both fields through to the API body (`n8nBaseUrl`, `n8nApiKey`).

**Why**: Self-hosted n8n is a key enterprise feature. The SKILL.md documents that both flags must be provided together. The CLI itself does not enforce pairing -- that is server-side validation.

**Cleanup**: Delete the organization.

---

## [P] `--store-credential-copy` flag

```bash
codika organization create \
  --name "CLI Test CredCopy $(date +%s)" \
  --n8n-base-url "https://n8n.example.com" \
  --n8n-api-key "test-n8n-key-12345" \
  --store-credential-copy \
  --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: true` or n8n validation error. The `storeCredentialCopy: true` boolean is included in the request body.

**Why**: Verifies the boolean flag (no value argument) is passed through. The `--store-credential-copy` flag is meaningful only with self-hosted n8n. The client sends `storeCredentialCopy` when it is not undefined (line 135-137 of `organization-client.ts`).

**Cleanup**: Delete the organization.

---

## [P] `--profile` flag

```bash
codika organization create --name "CLI Test Profile $(date +%s)" --profile cli-test-personal --json
```

**Expect**: The CLI resolves the API key from the named profile. Behaves identically to `--api-key` with the profile's stored key.

**Why**: Verifies profile resolution works for this command. The `resolveApiKey` function checks `--api-key` flag first, then env var, then profile config.

**Cleanup**: Delete the organization.

---

## [N] Missing `--name` (required option)

```bash
codika organization create --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Commander error: `required option '--name <name>' not specified`. Process exits before making any API call. Exit code is non-zero (Commander's default).

**Why**: `--name` is declared via `.requiredOption()` in Commander (line 26). This is pure client-side validation -- no HTTP request is made.

---

## [N] Missing API key -- no profile, no env, no flag

```bash
codika organization create --name "CLI Test No Key" --profile nonexistent-profile-name --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code `2`, error message contains "API key is required".

**Why**: Verifies the early-exit guard before any HTTP call when no valid profile can be resolved. Uses `exitWithError` which exits with code 2.

---

## [N] Unsupported logo format -- `.gif`

```bash
touch /tmp/cli-test-bad-logo.gif
codika organization create --name "CLI Test Bad Logo" --logo /tmp/cli-test-bad-logo.gif --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr: `Unsupported image format ".gif". Use JPEG, PNG, or WebP.` Exit code `2`.

**Why**: The `MIME_TYPES` map (line 17-22) only has `.jpg`, `.jpeg`, `.png`, `.webp`. Any other extension hits the `exitWithError` at line 87. The file is never read.

**Cleanup**: `rm /tmp/cli-test-bad-logo.gif`

---

## [N] Unsupported logo format -- `.svg`

```bash
touch /tmp/cli-test-bad-logo.svg
codika organization create --name "CLI Test SVG Logo" --logo /tmp/cli-test-bad-logo.svg --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr: `Unsupported image format ".svg". Use JPEG, PNG, or WebP.` Exit code `2`.

**Why**: SVG is a common image format users might try. Confirms it is rejected by the extension whitelist.

**Cleanup**: `rm /tmp/cli-test-bad-logo.svg`

---

## [N] Logo file not found

```bash
codika organization create --name "CLI Test Missing Logo" --logo /nonexistent/path/logo.png --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr: `Cannot read logo file: ...` (with the underlying ENOENT error). Exit code `2`.

**Why**: The `readFileSync` call at line 90 throws, caught by the try/catch at line 95-97, which calls `exitWithError` with the wrapped message.

---

## [N] Logo file too large (> 5MB)

```bash
# Create a 6MB file
dd if=/dev/zero of=/tmp/cli-test-large-logo.png bs=1048576 count=6 2>/dev/null
codika organization create --name "CLI Test Large Logo" --logo /tmp/cli-test-large-logo.png --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr: `Logo file exceeds 5MB limit.` Exit code `2`.

**Why**: After reading the file, line 91 checks `fileBuffer.length > 5 * 1024 * 1024`. The file is read but never base64-encoded or sent.

**Cleanup**: `rm /tmp/cli-test-large-logo.png`

---

## [N] Logo file exactly at 5MB boundary

```bash
# Create a file of exactly 5*1024*1024 bytes (should pass)
dd if=/dev/zero of=/tmp/cli-test-5mb-logo.png bs=1048576 count=5 2>/dev/null
codika organization create --name "CLI Test 5MB Logo $(date +%s)" --logo /tmp/cli-test-5mb-logo.png --api-key "$CODIKA_PERSONAL_KEY" --json 2>&1; echo "EXIT:$?"
```

**Expect**: The CLI does NOT reject the file (5MB is exactly at the boundary, and the check is `> 5MB` not `>= 5MB`). The request proceeds to the API. Whether it succeeds depends on the API accepting the dummy file content.

**Why**: Boundary test for the size check. The guard uses strict greater-than, so exactly 5MB should pass client-side validation.

**Cleanup**: `rm /tmp/cli-test-5mb-logo.png` and delete the organization if created.

---

## [S] Org key (`cko_`) rejected -- lacks `organizations:create`

Organization-scoped keys do not have the `organizations:create` scope. They are bound to an existing org and cannot create new ones.

```bash
codika organization create --name "CLI Test OrgKey $(date +%s)" --profile cli-test-owner-full --json
```

**Expect**: `success: false`, error about missing `organizations:create` scope or unauthorized. Exit code 1.

**Why**: The `cli-test-owner-full` profile uses a `cko_` key. Even though it has all 11 standard scopes, `organizations:create` is not one of them -- it is only available on personal/admin keys. The API rejects the request at the scope/key-type check.

---

## [S] Limited key (`cko_`) -- no `organizations:create`

```bash
codika organization create --name "CLI Test Limited $(date +%s)" --profile cli-test-limited --json
```

**Expect**: `success: false`, error about missing scope or unauthorized. Exit code 1.

**Why**: The limited key has only `deploy:use-case` + `instances:read`. Double confirmation that org keys cannot create organizations regardless of their scopes.

---

## [S] Invalid API key -- malformed

```bash
codika organization create --name "CLI Test Invalid Key" --api-key "cko_garbage_key_not_real" --json
```

**Expect**: `success: false`, error about unauthorized or invalid key. Exit code 1.

**Why**: Auth middleware rejects invalid keys before reaching business logic. The error comes from the API, not the CLI.

---

## [S] Invalid API key -- wrong prefix

```bash
codika organization create --name "CLI Test Wrong Prefix" --api-key "invalid_not_a_codika_key" --json
```

**Expect**: `success: false`, error about unauthorized. Exit code 1.

**Why**: Tests that keys without a recognized prefix (`cko_`, `ckp_`, `cka_`) are rejected by the API.

---

## [S] Cross-org key

```bash
codika organization create --name "CLI Test CrossOrg $(date +%s)" --api-key "cko_-9v8eRbjS_VapnPy7_vYkrUc0hJS_qPsXHcN44OC-Iiw3ChsfKgrUwCS9OC-vdFs" --json
```

**Expect**: `success: false`, error about missing `organizations:create` scope or unauthorized. Exit code 1.

**Why**: The cross-org key is a `cko_` key from a different organization. Like all org keys, it lacks `organizations:create`. This confirms that no org key -- regardless of which org it belongs to -- can create organizations.

---

## [N] API-level error -- name too short

```bash
codika organization create --name "A" --api-key "$CODIKA_PERSONAL_KEY" --json
```

**Expect**: `success: false`, error: `Name must be at least 2 characters` (or similar). Exit code 1.

**Why**: The CLI does not validate name length -- it passes the value through to the API. The Cloud Function enforces the 2-100 character constraint. This is an API error (exit code 1), not a CLI validation error (exit code 2).

---

## [N] API-level error -- formatted output on failure

```bash
codika organization create --name "A" --api-key "$CODIKA_PERSONAL_KEY"
```

**Expect**: Output shows:
```
Creating organization "A"...

✗ Organization Creation Failed

  Error:      <error message from API>
  Request ID: <non-empty string>
```

Exit code 1.

**Why**: Verifies the human-readable error output path (lines 126-133 in `create.ts`). The `isCreateOrganizationError` branch formats the error with the cross mark.

---

## [N] Catch block -- network/unexpected error with `--json`

If the API URL is unreachable, the `fetch` call throws and the outer try/catch (lines 41-53) handles it.

```bash
codika organization create --name "CLI Test Unreachable" --api-url "https://localhost:1" --api-key "ckp_test" --json 2>&1; echo "EXIT:$?"
```

**Expect**: JSON output: `{ "success": false, "error": { "message": "..." } }` where message contains the connection error. Exit code `1`.

**Why**: Verifies the catch block at lines 41-53. When `--json` is set, errors are formatted as JSON on stdout. The catch block handles both `Error` instances and unknown error types.

---

## [N] Catch block -- network error without `--json`

```bash
codika organization create --name "CLI Test Unreachable" --api-url "https://localhost:1" --api-key "ckp_test" 2>&1; echo "EXIT:$?"
```

**Expect**: Stderr: `Error: <connection error message>`. Exit code `1`.

**Why**: Same catch block but without `--json` -- errors go to stderr with red ANSI formatting (line 49).

---

## Last tested

2026-04-04
