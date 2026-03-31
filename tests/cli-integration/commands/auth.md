# `codika login / logout / whoami / use`

Authentication and profile management commands. `login` saves a named profile with full metadata (alias for `config set`). `whoami` shows the current identity by calling `/verifyApiKey`. `use` switches the active profile or lists all profiles. `logout` removes a profile.

**Scope required**: None (local profile CRUD) + `verifyApiKey` Cloud Function for `whoami` and `login` verification
**Method**: POST (verifyApiKey), Local (profile CRUD)
**Cloud Function**: `verifyApiKeyPublic` (whoami, login verification)

---

## whoami

### [P] Happy path — Owner identity with JSON

```bash
codika whoami --profile cli-test-owner-full --json
```

**Expect**: `loggedIn: true`, `organizationName` = `"Test Organization from CLI"`, `organizationId` = `"l0gM8nHm2o2lpupMpm5x"`, `type` = `"org-api-key"`, `scopes` is an array of 11 scopes, `profileName` = `"cli-test-owner-full"`, `keyName` = `"cli-test-owner-full"`.

**Why**: Core happy path — verifies that `whoami` calls the remote verifyApiKey endpoint and returns full identity data including org, scopes, key name, and profile name.

---

### [P] Human-readable output

```bash
codika whoami --profile cli-test-owner-full
```

**Expect**: Output contains `Logged in to Codika`, `Organization:` line with `Test Organization from CLI (l0gM8nHm2o2lpupMpm5x)`, `Key name:` line with `cli-test-owner-full`, `Key:` line with masked key `cko_KBuc...`, `Scopes:` line listing scopes, `Profile:` line with `cli-test-owner-full`.

**Why**: Verifies the human-readable formatter displays all identity fields correctly — not just the JSON path.

---

### [P] Member profile shows different identity

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

### [N] No API key configured

```bash
codika whoami --api-key "" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, output contains `loggedIn: false`.

**Why**: When no API key can be resolved, whoami should clearly indicate the user is not logged in and exit non-zero.

---

### [N] Invalid API key

```bash
codika whoami --api-key "cko_garbage_key_here" --json 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, `loggedIn: true` (key exists but verification failed), `error` field present describing the failure.

**Why**: An invalid key resolves (so `loggedIn: true` in the sense that a key was found) but the remote verification fails. The error should be surfaced, and the command should exit non-zero.

---

## use

### [P] List all profiles (no argument)

```bash
codika use
```

**Expect**: Output contains `Profiles:` header. Lists all configured profiles with marker (`●` for active, space for inactive), profile name, organization label, and masked key. Footer says `Use: codika use <name>`.

**Why**: The default behavior (no argument) is to list profiles — this is the discovery path for new users.

---

### [P] List profiles as JSON

```bash
codika use --json
```

**Expect**: JSON with `activeProfile` (string name of current active), `profiles` array where each entry has `name`, `active` (boolean), `type`, `organizationId`, `organizationName`, `keyPrefix`, `scopes` (array), `expiresAt`.

**Why**: Machine-readable output is critical for agents that need to auto-select profiles based on organizationId matching project.json.

---

### [P] Switch to a valid profile

```bash
codika use cli-test-member
```

**Expect**: Output contains `Switched to "cli-test-member"`, shows `Organization:` and `Key:` for the member profile.

**Why**: Core profile switching — verifies `setActiveProfile()` persists the change and the confirmation message is displayed.

**Cleanup**: Switch back to the original active profile:
```bash
codika use cli-test-owner-full
```

---

### [P] Verify switch persists

```bash
codika use cli-test-limited && codika use --json | jq '.activeProfile'
```

**Expect**: `"cli-test-limited"` — confirms the switch was written to disk and the next `use --json` reads it correctly.

**Why**: Profile switching must persist across CLI invocations (written to `~/.config/codika/config.json`).

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [N] Nonexistent profile

```bash
codika use nonexistent-profile 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, error message contains `Profile "nonexistent-profile" not found`, lists available profiles.

**Why**: Switching to a nonexistent profile should fail clearly and show the user what profiles are available.

---

## logout

### [P] Remove a specific profile by name

First create a throwaway profile, then remove it:

```bash
codika login --api-key "cko_KBucJBHX_test_throwaway" --name "throwaway-test" --skip-verify && codika logout throwaway-test
```

**Expect**: `login` succeeds with `Configuration saved`. `logout` prints `Removed profile "throwaway-test"` and indicates the new active profile (or says no profiles remaining).

**Why**: Tests the named-removal path — users should be able to remove any profile by name, not just the active one.

---

### [N] Logout nonexistent profile

```bash
codika logout nonexistent-profile 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, error message contains `Profile "nonexistent-profile" not found`, lists available profiles.

**Why**: Attempting to remove a profile that doesn't exist should fail with a clear error.

---

### [N] Logout with no profiles

This test requires all profiles to be temporarily cleared — **skip in normal runs** to avoid destructive side effects. Document the expected behavior instead:

**Expected behavior**: If no profiles exist, `codika logout` prints `No profiles configured.` and exits 0. If profiles exist but none is active, `codika logout` (without a name argument) prints `No active profile to remove.` and exits 1.

**Why**: Edge cases around empty config state should be handled gracefully.

---

## login

### [P] Login with --api-key flag (non-interactive)

```bash
codika login --api-key "$(codika use --json | jq -r '.profiles[] | select(.name == "cli-test-owner-full") | .keyPrefix')" --name "login-test-temp" --skip-verify
```

**Expect**: `Configuration saved`, profile name `login-test-temp` is set as active. Output shows masked key.

**Why**: Non-interactive login is essential for CI/CD and agent usage. The `--skip-verify` flag saves without a network call.

**Cleanup**:
```bash
codika logout login-test-temp && codika use cli-test-owner-full
```

---

### [P] Login verifies key against platform

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "login-verify-test"
```

**Expect**: `Verifying API key...` followed by `Logged in successfully`. Output shows Profile, Organization, Key name, Key (masked), Scopes. Profile `login-verify-test` is now active.

**Why**: Default login behavior (without `--skip-verify`) calls `verifyApiKey` and persists the full metadata (org name, scopes, key name, type) into the profile.

**Cleanup**:
```bash
codika logout login-verify-test && codika use cli-test-owner-full
```

---

### [N] Login with invalid API key

```bash
codika login --api-key "cko_invalid_key_garbage" --name "bad-key-test" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, output contains `API key verification failed`.

**Why**: Invalid keys should be rejected at login time (not silently saved) so users get immediate feedback.

---

### [P] Login with --name flag creates custom profile name

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "custom-name-test" --skip-verify && codika use --json | jq '.profiles[] | select(.name == "custom-name-test") | .name'
```

**Expect**: `"custom-name-test"` — the profile is saved with the exact name provided.

**Why**: Custom names allow users to organize profiles semantically (e.g., `production`, `staging`, `client-a`).

**Cleanup**:
```bash
codika logout custom-name-test && codika use cli-test-owner-full
```

---

## Last tested

Not yet tested.
