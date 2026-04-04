# Authentication Commands: `login`, `whoami`, `use`, `logout`

Authentication and profile management commands. `login` saves a named profile with full metadata (alias for `config set`). `whoami` shows the current identity by calling `/verifyApiKey`. `use` switches the active profile or lists all profiles. `logout` removes a profile.

**Scope required**: None (local profile CRUD) + `verifyApiKey` Cloud Function for `whoami` and `login` verification
**Method**: POST (verifyApiKey), Local (profile CRUD)
**Cloud Function**: `verifyApiKeyPublic` (whoami, login verification)

---

## login

`login` is an alias for `config set`. Source: `src/cli/commands/config/set.ts`.

Options: `--api-key <key>`, `--base-url <url>`, `--name <name>`, `--skip-verify`

---

### [P] Login with --api-key and --skip-verify

```bash
codika login --api-key "cko_fake_skipverify_test_key" --name "login-skip-test" --skip-verify
```

**Expect**: Exit code 0. Output contains `Configuration saved`, `Profile:  login-skip-test (active)`, `API key:  cko_fak...`.

**Why**: Non-interactive login with `--skip-verify` is the CI/CD path. It must save the profile without a network call, inferring key type from prefix (`cko_` = org-api-key).

**Cleanup**:
```bash
codika logout login-skip-test && codika use cli-test-owner-full
```

---

### [P] Login with --api-key verifies against platform (default)

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "login-verify-test"
```

**Expect**: Exit code 0. Output contains `Verifying API key...` followed by `Logged in successfully`. Shows `Profile:`, `Organization:`, `Key name:`, `Key:` (masked), `Scopes:`. Profile `login-verify-test` is now active.

**Why**: Default login behavior (without `--skip-verify`) calls `verifyApiKey` and persists full metadata (org name, scopes, key name, type) into the profile.

**Cleanup**:
```bash
codika logout login-verify-test && codika use cli-test-owner-full
```

---

### [P] Login with --name creates custom profile name

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "custom-name-test" --skip-verify && codika use --json | jq '.profiles[] | select(.name == "custom-name-test") | .name'
```

**Expect**: `"custom-name-test"` -- the profile is saved with the exact name provided.

**Why**: Custom names allow users to organize profiles semantically (e.g., `production`, `staging`, `client-a`).

**Cleanup**:
```bash
codika logout custom-name-test && codika use cli-test-owner-full
```

---

### [P] Login with --base-url stores non-production URL

```bash
codika login --api-key "cko_fake_baseurl_test" --name "baseurl-test" --base-url "https://custom.example.com" --skip-verify && codika config show 2>&1
```

**Expect**: Exit code 0. `Configuration saved` output. The `config show` output includes the `baseurl-test` profile.

**Why**: Custom base URL is needed for dev/staging environments. The `--base-url` flag must be persisted to the profile so subsequent commands use the correct endpoint.

**Cleanup**:
```bash
codika logout baseurl-test && codika use cli-test-owner-full
```

---

### [P] Login auto-derives profile name from org when --name omitted

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" 2>&1
```

**Expect**: Exit code 0. Output contains `Logged in successfully`. The profile name shown in the output is auto-derived (either from the org name or replaces the existing profile for the same org).

**Why**: When `--name` is omitted, `deriveProfileName()` generates a name from the verification response. If a profile for the same `organizationId` already exists, it is replaced rather than duplicated.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Login replaces existing profile for same org

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --skip-verify --name "replace-test-1" && \
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --skip-verify --name "replace-test-1" && \
codika use --json | jq '[.profiles[] | select(.name == "replace-test-1")] | length'
```

**Expect**: `1` -- only one profile with the name exists (upsert, not duplicate).

**Why**: `upsertProfile()` must replace an existing profile with the same name, not create a duplicate.

**Cleanup**:
```bash
codika logout replace-test-1 && codika use cli-test-owner-full
```

---

### [N] Login with invalid API key (verification fails)

```bash
codika login --api-key "cko_invalid_key_garbage" --name "bad-key-test" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Output contains `API key verification failed`.

**Why**: Invalid keys should be rejected at login time (not silently saved) so users get immediate feedback. The profile should NOT be created.

---

### [N] Login with empty API key via flag

```bash
codika login --api-key "" --name "empty-key-test" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code non-zero. Commander or the login logic rejects the empty key.

**Why**: An empty string API key should not be accepted or saved as a valid profile.

---

### [S] Login verifies key against remote before saving

```bash
codika login --api-key "cko_looks_real_but_invalid" --name "security-test" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Output contains `API key verification failed`. No profile named `security-test` is created.

**Why**: Without `--skip-verify`, login must validate the key remotely before persisting. This prevents saving compromised or revoked keys.

**Verify no profile was saved**:
```bash
codika use --json | jq '[.profiles[] | select(.name == "security-test")] | length'
```
**Expect**: `0`

---

## whoami

Options: `--json`, `--profile <name>`

---

### [P] Happy path -- Owner identity with JSON

```bash
codika whoami --profile cli-test-owner-full --json
```

**Expect**: Exit code 0. `loggedIn: true`, `organizationName` = `"Test Organization from CLI"`, `organizationId` = `"l0gM8nHm2o2lpupMpm5x"`, `type` = `"org-api-key"`, `scopes` is an array of 11 scopes, `profileName` = `"cli-test-owner-full"`, `keyName` = `"cli-test-owner-full"`.

**Why**: Core happy path -- verifies that `whoami` calls the remote verifyApiKey endpoint and returns full identity data including org, scopes, key name, and profile name.

---

### [P] Human-readable output

```bash
codika whoami --profile cli-test-owner-full
```

**Expect**: Exit code 0. Output contains `Logged in to Codika`, `Organization:` line with `Test Organization from CLI (l0gM8nHm2o2lpupMpm5x)`, `Key name:` line with `cli-test-owner-full`, `Key:` line with masked key `cko_KBuc...`, `Scopes:` line listing scopes, `Profile:` line with `cli-test-owner-full`.

**Why**: Verifies the human-readable formatter displays all identity fields correctly -- not just the JSON path.

---

### [P] --profile flag switches identity

```bash
codika whoami --profile cli-test-member --json | jq '{type, keyName, organizationId}'
```

**Expect**: `type` = `"org-api-key"`, `keyName` contains `"cli-test-member"`, `organizationId` = `"l0gM8nHm2o2lpupMpm5x"`.

**Why**: Confirms `--profile` flag correctly switches which profile's API key is used for verification, and that different keys return different metadata.

---

### [P] Limited profile shows restricted scopes

```bash
codika whoami --profile cli-test-limited --json | jq '.scopes'
```

**Expect**: Array containing exactly `["deploy:use-case", "instances:read"]` (2 scopes, not 11).

**Why**: Verifies that the scopes returned by verifyApiKey reflect the actual key's scopes, not the profile's cached data.

---

### [P] JSON output includes source field

```bash
codika whoami --profile cli-test-owner-full --json | jq '.source'
```

**Expect**: Non-null string describing where the API key came from (e.g. `"profile: cli-test-owner-full"`).

**Why**: The `describeApiKeySource()` utility helps users understand which key is being used in complex resolution chains (flag > env > profile > default).

---

### [P] JSON output includes profileName field

```bash
codika whoami --profile cli-test-owner --json | jq '.profileName'
```

**Expect**: `"cli-test-owner"`

**Why**: The `profileName` field is set from the `--profile` flag or the active profile name. Agents rely on this to correlate identity with profile configuration.

---

### [P] Default profile used when --profile omitted

```bash
codika use cli-test-owner-full && codika whoami --json | jq '.profileName'
```

**Expect**: `"cli-test-owner-full"`

**Why**: When `--profile` is not specified, whoami should use the active profile. This tests the resolution chain fallback to `getActiveProfile()`.

---

### [N] No API key configured (empty env, no profile)

```bash
CODIKA_API_KEY="" codika whoami --profile nonexistent-profile --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. JSON output contains `loggedIn: false`.

**Why**: When no API key can be resolved (profile doesn't exist, no env var), whoami should clearly indicate the user is not logged in and exit non-zero.

---

### [N] No API key -- human-readable output

```bash
CODIKA_API_KEY="" codika whoami --profile nonexistent-profile 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Output contains `Not logged in` and `Run 'codika login' to authenticate`.

**Why**: The human-readable path for "not logged in" must show a clear call-to-action, not just a cryptic error.

---

### [N] Invalid API key via env var

```bash
CODIKA_API_KEY="cko_garbage_key_here" codika whoami --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. JSON output contains `loggedIn: true` (a key was found), plus an `error` field describing the verification failure.

**Why**: An invalid key resolves (so `loggedIn: true` in the sense that a key was found) but the remote verification fails. When no cached profile matches, the error path fires with `process.exit(1)`.

---

### [S] Whoami calls remote API (not just cached data)

```bash
codika whoami --profile cli-test-limited --json | jq '.cached // false'
```

**Expect**: `false` -- the `cached` field should not be present (or be false), confirming the data came from the live API.

**Why**: `whoami` must call `verifyApiKey` for fresh data. If it only returned cached data, scope changes or key revocations would not be detected. The `cached: true` flag only appears in the network-error fallback path.

---

## use

Options: `--json`, `--list-names` (hidden, for shell completion). Argument: `[name]`.

---

### [P] List all profiles (no argument)

```bash
codika use
```

**Expect**: Exit code 0. Output contains `Profiles:` header. Lists all configured profiles with marker (filled circle for active, space for inactive), profile name, organization label, and masked key. Footer says `Use: codika use <name>`.

**Why**: The default behavior (no argument) is to list profiles -- this is the discovery path for new users.

---

### [P] List profiles as JSON

```bash
codika use --json
```

**Expect**: Exit code 0. JSON with `activeProfile` (string name of current active), `profiles` array where each entry has `name`, `active` (boolean), `type`, `organizationId`, `organizationName`, `keyPrefix`, `scopes` (array), `expiresAt`.

**Why**: Machine-readable output is critical for agents that need to auto-select profiles based on organizationId matching project.json.

---

### [P] JSON profile objects have correct shape

```bash
codika use --json | jq '.profiles[0] | keys'
```

**Expect**: Exactly 8 keys: `active`, `expiresAt`, `keyPrefix`, `name`, `organizationId`, `organizationName`, `scopes`, `type`.

**Why**: Ensures the JSON contract is stable. Missing or extra fields break agent integrations that parse this output.

---

### [P] Switch to a valid profile

```bash
codika use cli-test-member
```

**Expect**: Exit code 0. Output contains `Switched to "cli-test-member"`, shows `Organization:` and `Key:` for the member profile.

**Why**: Core profile switching -- verifies `setActiveProfile()` persists the change and the confirmation message is displayed.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Verify switch persists across invocations

```bash
codika use cli-test-limited && codika use --json | jq '.activeProfile'
```

**Expect**: `"cli-test-limited"` -- confirms the switch was written to disk and the next `use --json` reads it correctly.

**Why**: Profile switching must persist across CLI invocations (written to `~/.config/codika/config.json`).

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Switch displays organization and masked key

```bash
codika use cli-test-owner-full
```

**Expect**: Output contains `Switched to "cli-test-owner-full"`, `Organization: Test Organization from CLI`, `Key:` with masked value starting `cko_KBuc...`.

**Why**: The confirmation message must show enough context for the user to verify they switched to the intended profile.

---

### [P] --list-names outputs one name per line (hidden flag)

```bash
codika use --list-names
```

**Expect**: Exit code 0. Output is one profile name per line with no formatting, markers, or labels. Should include `cli-test-owner-full`, `cli-test-owner`, `cli-test-member`, `cli-test-limited`.

**Why**: The hidden `--list-names` flag is used by shell completion scripts. It must output raw names only.

---

### [N] Switch to nonexistent profile

```bash
codika use nonexistent-profile 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Error message contains `Profile "nonexistent-profile" not found` and lists available profiles.

**Why**: Switching to a nonexistent profile should fail clearly and show the user what profiles are available.

---

### [N] No profiles configured -- human-readable

This test requires temporarily clearing all profiles. **Document expected behavior instead of running destructively.**

**Expected behavior**: If no profiles exist, `codika use` prints `No profiles configured. Run 'codika login' to add one.` and exits 1 (human-readable) or exits 0 with `{"activeProfile": null, "profiles": []}` (JSON).

**Why**: The exit code difference between human and JSON mode is intentional: human mode treats "no profiles" as an error state (the user needs to act), while JSON mode returns valid data (an empty list is a valid response for programmatic consumers).

---

## logout

Options: `--list-names` (hidden, for shell completion). Argument: `[name]`.

---

### [P] Remove a specific profile by name

First create a throwaway profile, then remove it:

```bash
codika login --api-key "cko_throwaway_test_key" --name "throwaway-test" --skip-verify && codika logout throwaway-test
```

**Expect**: `login` succeeds with `Configuration saved`. `logout` prints `Removed profile "throwaway-test"` and indicates the new active profile or says no profiles remaining.

**Why**: Tests the named-removal path -- users should be able to remove any profile by name, not just the active one.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Remove active profile (no argument)

```bash
codika login --api-key "cko_active_removal_test" --name "active-remove-test" --skip-verify && codika use active-remove-test && codika logout
```

**Expect**: `logout` prints `Removed profile "active-remove-test"` and either shows the new active profile or says no profiles remaining.

**Why**: `codika logout` without an argument removes the currently active profile. This is the most common logout flow.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Logout shows remaining active profile

```bash
codika login --api-key "cko_remain_test" --name "remain-test" --skip-verify && codika logout remain-test
```

**Expect**: Output contains `Removed profile "remain-test"` and `Active profile is now` with one of the existing test profiles.

**Why**: After removing a non-active profile, the CLI should confirm which profile is still active so the user knows their context.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] --list-names outputs profile names (hidden flag)

```bash
codika logout --list-names
```

**Expect**: Exit code 0. Output is one profile name per line with no formatting. Should include `cli-test-owner-full`, `cli-test-owner`, `cli-test-member`, `cli-test-limited`.

**Why**: The hidden `--list-names` flag is used by shell completion scripts for tab-completing profile names to remove.

---

### [N] Logout nonexistent profile

```bash
codika logout nonexistent-profile 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Error message contains `Profile "nonexistent-profile" not found` and lists available profiles.

**Why**: Attempting to remove a profile that doesn't exist should fail with a clear error.

---

### [N] Logout with no profiles configured

This test requires all profiles to be temporarily cleared -- **skip in normal runs** to avoid destructive side effects. Document the expected behavior instead.

**Expected behavior**: If no profiles exist, `codika logout` prints `No profiles configured.` and exits 0 (graceful, nothing to remove).

**Why**: Edge case around empty config state. The source code (line 35-39 of `logout.ts`) returns without calling `process.exit()`, so exit code is 0.

---

### [N] Logout with no active profile (no argument)

This test requires an active profile to be unset while other profiles exist -- **skip in normal runs** to avoid destructive side effects.

**Expected behavior**: If profiles exist but none is active, `codika logout` (without a name argument) prints `No active profile to remove.` and exits 1.

**Why**: The source code (line 43-48 of `logout.ts`) calls `process.exit(1)` when `targetName` is undefined (no argument and no active profile).

---

## Last tested

Not yet tested.
