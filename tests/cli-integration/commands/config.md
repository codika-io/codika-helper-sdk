# `codika config set / show / clear`

Configuration management commands. `config set` saves an API key with optional verification (also aliased as `codika login`). `config show` displays all profiles and the current base URL. `config clear` removes all configuration or a single profile.

**Scope required**: None (local only)
**Method**: Local (profile CRUD) + POST for key verification in `config set`
**Cloud Function**: `verifyApiKeyPublic` (only during `config set` verification)

---

## config show

### [P] Show all profiles

```bash
codika config show
```

**Expect**: Output contains `Codika Configuration` header, `Profiles:` section listing all configured profiles. Each profile shows a marker (`●` for active), name, organization label (or `(admin)`), and masked key. Exit code 0.

**Why**: The primary discovery command — users run this to see what's configured and which profile is active.

---

### [P] Shows base URL only when non-default

```bash
codika config show
```

**Expect**: If all profiles use the production base URL, the `Base URL:` line is **not** shown. Only appears when a custom base URL is configured.

**Why**: Clean output — production is the default, so showing it adds noise. Only non-default URLs are worth calling out.

---

### [N] No profiles configured

This test requires a clean config state. **Expected behavior**: If no profiles exist, output contains `No profiles configured.` and `Run 'codika login'` suggestion. Exit code 1.

**Why**: Exit 1 signals to scripts/agents that the CLI is not configured and cannot make API calls.

---

## config set

### [P] Set with --api-key and --skip-verify

```bash
codika config set --api-key "cko_test_config_set_key" --name "config-set-test" --skip-verify
```

**Expect**: `Configuration saved`, profile `config-set-test` created and set as active. Output shows masked key. No `Verifying API key...` message (verification was skipped).

**Why**: `--skip-verify` is the fast path — saves without a network call. The key type is inferred from prefix (`cko_` = org key, `cka_` = admin, `ckp_` = personal).

**Cleanup**:
```bash
codika logout config-set-test && codika use cli-test-owner-full
```

---

### [P] Set with verification (valid key)

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "config-set-verified"
```

**Expect**: `Verifying API key...` followed by `Logged in successfully`. Profile shows Organization, Key name, Key (masked), Scopes. The profile contains full metadata from verifyApiKey response.

**Why**: Default behavior verifies the key and persists org name, scopes, type, expiry — essential for features like auto-profile-matching based on organizationId.

**Cleanup**:
```bash
codika logout config-set-verified && codika use cli-test-owner-full
```

---

### [P] Set with custom --base-url

```bash
codika config set --api-key "cko_test_custom_url" --name "custom-url-test" --base-url "http://localhost:5001" --skip-verify
```

**Expect**: `Configuration saved`, output includes `Base URL: http://localhost:5001`. The profile stores the custom base URL.

**Why**: Developers testing against local emulators need to override the base URL. The custom URL should be persisted per-profile.

**Cleanup**:
```bash
codika logout custom-url-test && codika use cli-test-owner-full
```

---

### [P] Set replaces existing profile for same org

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "replace-test" && codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "replace-test"
```

**Expect**: Both calls succeed. Second call updates the existing `replace-test` profile rather than creating a duplicate. `codika use --json | jq '[.profiles[] | select(.name == "replace-test")] | length'` returns `1`.

**Why**: `upsertProfile` should update in place, not accumulate duplicates when the same profile name is reused.

**Cleanup**:
```bash
codika logout replace-test && codika use cli-test-owner-full
```

---

### [N] Set with invalid API key (verification fails)

```bash
codika config set --api-key "cko_invalid_garbage_key" --name "bad-key" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, output contains `Verifying API key...` then `API key verification failed`. Profile is **not** saved.

**Why**: Invalid keys should be rejected at save time when verification is enabled. No profile should be persisted for a key that fails verification.

---

### [P] Auto-derived profile name

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" && codika use --json | jq '.activeProfile'
```

**Expect**: Active profile name is auto-derived from the org name or key name (e.g. `test-organization-from-cli` or similar). Not null, not empty.

**Why**: When `--name` is omitted, the CLI derives a profile name from the verifyApiKey response data. This makes first-time setup frictionless.

**Cleanup**: Remove the auto-derived profile and restore:
```bash
codika logout "$(codika use --json | jq -r '.activeProfile')" && codika use cli-test-owner-full
```

---

## config clear

### [P] Clear a specific profile

```bash
codika config set --api-key "cko_clearable_key" --name "clear-me" --skip-verify && codika config clear --profile "clear-me"
```

**Expect**: `config set` saves the profile. `config clear --profile "clear-me"` prints `Profile "clear-me" removed`. The profile no longer appears in `codika use --json`.

**Why**: Targeted removal — users can clean up individual profiles without affecting others.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [N] Clear nonexistent profile

```bash
codika config clear --profile "nonexistent-profile" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, error message contains `Profile "nonexistent-profile" not found.`

**Why**: Attempting to clear a profile that doesn't exist should fail explicitly.

---

### [P] Clear all (destructive)

**WARNING**: This test removes all profiles. Only run in isolated test environments.

```bash
# Save current state, then clear all, then verify
codika config clear
```

**Expect**: `Configuration cleared`. `codika config show` now shows `No profiles configured.` and exits 1.

**Why**: Nuclear option — users should be able to wipe all config and start fresh.

**Cleanup**: Re-create all test profiles using the setup procedure in `setup.md`.

---

## Last tested

Not yet tested.
