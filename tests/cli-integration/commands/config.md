# `codika config set|show|clear`

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

### [P] Shows custom base URL when configured

**Setup**: Create a profile with a custom base URL first.

```bash
codika config set --api-key "cko_base_url_show_test" --name "show-url-test" --base-url "http://localhost:5001" --skip-verify && codika config show
```

**Expect**: Output includes `Base URL: http://localhost:5001` with the source annotation. Exit code 0.

**Why**: Verifies the custom base URL is surfaced when non-default — important for developers working against local emulators.

**Cleanup**:
```bash
codika logout show-url-test && codika use cli-test-owner-full
```

---

### [N] No profiles configured

This test requires a clean config state (e.g. after `codika config clear`). See the "Clear all" test below for creating this state.

```bash
codika config show 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, output contains `No profiles configured.` and `Run 'codika login'` suggestion.

**Why**: Exit 1 signals to scripts/agents that the CLI is not configured and cannot make API calls.

---

## config set

### [P] Set with --api-key and --skip-verify

```bash
codika config set --api-key "cko_test_config_set_key" --name "config-set-test" --skip-verify
```

**Expect**: `Configuration saved`, profile `config-set-test` created and set as active. Output shows masked key (`cko_test...`). No `Verifying API key...` message (verification was skipped). Exit code 0.

**Why**: `--skip-verify` is the fast path — saves without a network call. The key type is inferred from prefix (`cko_` = org key).

**Cleanup**:
```bash
codika logout config-set-test && codika use cli-test-owner-full
```

---

### [P] Key type inferred from prefix — org key (cko_)

```bash
codika config set --api-key "cko_org_type_test" --name "type-org" --skip-verify && codika use --json | jq '.[] | select(.name == "type-org")'
```

**Expect**: Profile created with type `org-api-key`. The `cko_` prefix maps to org key type.

**Why**: When `--skip-verify` is used, the CLI infers key type from the prefix. Org keys (`cko_`) are the most common type.

**Cleanup**:
```bash
codika logout type-org && codika use cli-test-owner-full
```

---

### [P] Key type inferred from prefix — admin key (cka_)

```bash
codika config set --api-key "cka_admin_type_test" --name "type-admin" --skip-verify && codika use --json | jq '.[] | select(.name == "type-admin")'
```

**Expect**: Profile created with type `admin-api-key`. The `cka_` prefix maps to admin key type.

**Why**: Admin keys have different display treatment in `config show` (shown as `(admin)` instead of org name).

**Cleanup**:
```bash
codika logout type-admin && codika use cli-test-owner-full
```

---

### [P] Key type inferred from prefix — personal key (ckp_)

```bash
codika config set --api-key "ckp_personal_type_test" --name "type-personal" --skip-verify && codika use --json | jq '.[] | select(.name == "type-personal")'
```

**Expect**: Profile created with type `personal-api-key`. The `ckp_` prefix maps to personal key type.

**Why**: Personal keys may have different capabilities (e.g. creating org keys). Correct type inference ensures downstream logic works.

**Cleanup**:
```bash
codika logout type-personal && codika use cli-test-owner-full
```

---

### [P] Set with verification (valid key)

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "config-set-verified"
```

**Expect**: `Verifying API key...` followed by `Logged in successfully`. Output shows Profile, Organization, Key name, Key (masked), Scopes. Exit code 0. The profile contains full metadata from the verifyApiKey response.

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

**Expect**: `Configuration saved`, output includes `Base URL: http://localhost:5001`. Exit code 0. The profile stores the custom base URL.

**Why**: Developers testing against local emulators need to override the base URL. The custom URL should be persisted per-profile.

**Cleanup**:
```bash
codika logout custom-url-test && codika use cli-test-owner-full
```

---

### [P] Default base URL not shown in output

```bash
codika config set --api-key "cko_no_url_shown" --name "no-url-test" --skip-verify
```

**Expect**: `Configuration saved`, output does **not** include a `Base URL:` line. Only non-default URLs appear in the output.

**Why**: Production is the default — showing it adds noise. Mirrors the same logic in `config show`.

**Cleanup**:
```bash
codika logout no-url-test && codika use cli-test-owner-full
```

---

### [P] Set replaces existing profile by name

```bash
codika config set --api-key "cko_first_key" --name "replace-test" --skip-verify && codika config set --api-key "cko_second_key" --name "replace-test" --skip-verify
```

**Expect**: Both calls succeed. Second call updates the existing `replace-test` profile rather than creating a duplicate. `codika use --json | jq '[.[] | select(.name == "replace-test")] | length'` returns `1`. The stored key is the second one (`cko_second_key`).

**Why**: `upsertProfile` should update in place, not accumulate duplicates when the same profile name is reused.

**Cleanup**:
```bash
codika logout replace-test && codika use cli-test-owner-full
```

---

### [P] Set replaces existing profile by organizationId (verified key)

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "org-replace-a" && codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner"].apiKey')"
```

**Expect**: First call creates profile `org-replace-a`. Second call (no `--name`) detects that a profile for the same organizationId already exists and replaces `org-replace-a` rather than creating a new profile. The profile count for this org remains 1.

**Note**: This test may match existing profiles if the owner key's organization already has a profile configured (e.g., `cli-test-owner-full`). In that case, the second call may replace the existing profile rather than `org-replace-a`. To isolate this test, use a fabricated org ID that doesn't match any existing profile's organizationId.

**Why**: When `--name` is omitted and the key belongs to an org that already has a profile, `findProfileByOrgId` kicks in and reuses the existing profile name.

**Cleanup**:
```bash
codika logout org-replace-a && codika use cli-test-owner-full
```

---

### [P] Newly created profile becomes active

```bash
codika config set --api-key "cko_active_test" --name "active-test" --skip-verify && codika use --json | jq '.[] | select(.active == true) | .name'
```

**Expect**: Output is `"active-test"`. The newly created profile is automatically set as active.

**Why**: `setActiveProfile` is called after every `config set` — the most recently configured profile should be the active one.

**Cleanup**:
```bash
codika logout active-test && codika use cli-test-owner-full
```

---

### [P] Auto-derived profile name (from verification)

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')"
```

**Expect**: Profile created with an auto-derived name based on the org name or key name (e.g. `test-organization-from-cli` or similar). `codika use --json | jq '.[] | select(.active == true) | .name'` returns a non-empty string.

**Why**: When `--name` is omitted, the CLI derives a profile name from the verifyApiKey response data. This makes first-time setup frictionless.

**Cleanup**: Remove the auto-derived profile and restore:
```bash
codika logout "$(codika use --json | jq -r '.[] | select(.active == true) | .name')" && codika use cli-test-owner-full
```

---

### [P] Auto-derived profile name (skip-verify, no name)

```bash
codika config set --api-key "cko_no_name_skip" --skip-verify && codika use --json | jq '.[] | select(.active == true) | .name'
```

**Expect**: Profile created with an auto-derived fallback name (e.g. `profile-1` or similar). Not null, not empty.

**Why**: When both `--name` and verification are skipped, there's no org data to derive from — the CLI must still generate a usable profile name.

**Cleanup**:
```bash
codika logout "$(codika use --json | jq -r '.[] | select(.active == true) | .name')" && codika use cli-test-owner-full
```

---

### [P] Verified key stores full metadata

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "metadata-test" && cat ~/.config/codika/config.json | jq '.profiles["metadata-test"] | keys'
```

**Expect**: Profile contains keys beyond just `apiKey` and `type`: should include `organizationId`, `organizationName`, `scopes`, `keyName`, `keyPrefix`. May also include `createdAt` and `expiresAt` if set.

**Why**: Metadata from verification is essential for org-aware profile matching (deployment auto-selects profile by org) and for `codika whoami` output.

**Cleanup**:
```bash
codika logout metadata-test && codika use cli-test-owner-full
```

---

### [P] Verified key shows expiry in output (when key has expiry)

```bash
codika config set --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "expiry-test"
```

**Expect**: If the key has an `expiresAt` field, the output includes an `Expires:` line with a formatted date. If the key has no expiry, the line is absent.

**Why**: Expiry visibility helps users know when to rotate keys before they break CI/CD pipelines.

**Cleanup**:
```bash
codika logout expiry-test && codika use cli-test-owner-full
```

---

### [N] Set with invalid API key (verification fails)

```bash
codika config set --api-key "cko_invalid_garbage_key" --name "bad-key" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Output contains `Verifying API key...` then `API key verification failed` with an error message. Profile `bad-key` is **not** saved — `codika use --json | jq '.[] | select(.name == "bad-key")'` returns nothing.

**Why**: Invalid keys should be rejected at save time when verification is enabled. No profile should be persisted for a key that fails verification.

---

### [N] Set with invalid --base-url (verification against unreachable host)

```bash
codika config set --api-key "cko_unreachable_test" --name "unreachable" --base-url "http://localhost:99999" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1. Output contains `Verifying API key...` then `API key verification failed` with a network error. Profile is **not** saved.

**Why**: If verification is enabled and the base URL is unreachable, the CLI should fail rather than silently saving an unusable profile.

---

## config set via `login` alias

### [P] Login alias works identically to config set

```bash
codika login --api-key "cko_login_alias_test" --name "login-alias" --skip-verify
```

**Expect**: `Configuration saved`, profile `login-alias` created and set as active. Identical behavior and output to `codika config set` with the same flags.

**Why**: `login` is a top-level alias for `config set` — both must produce identical results since they call the same `runConfigSet` function.

**Cleanup**:
```bash
codika logout login-alias && codika use cli-test-owner-full
```

---

### [P] Login alias supports all flags

```bash
codika login --api-key "cko_login_all_flags" --name "login-flags" --base-url "http://localhost:5001" --skip-verify
```

**Expect**: `Configuration saved`, profile shows custom name, masked key, and `Base URL: http://localhost:5001`. All four flags (`--api-key`, `--name`, `--base-url`, `--skip-verify`) work through the alias.

**Why**: The alias registers the same options as `config set`. Confirms no option was missed in the alias definition.

**Cleanup**:
```bash
codika logout login-flags && codika use cli-test-owner-full
```

---

### [P] Login with verification (valid key)

```bash
codika login --api-key "$(cat ~/.config/codika/config.json | jq -r '.profiles["cli-test-owner-full"].apiKey')" --name "login-verified"
```

**Expect**: `Verifying API key...` followed by `Logged in successfully`. Full metadata output (Organization, Key name, Key, Scopes). Exit code 0.

**Why**: Confirms the default verification path works through the `login` alias, not just `config set`.

**Cleanup**:
```bash
codika logout login-verified && codika use cli-test-owner-full
```

---

## config clear

### [P] Clear a specific profile

```bash
codika config set --api-key "cko_clearable_key" --name "clear-me" --skip-verify && codika config clear --profile "clear-me"
```

**Expect**: `config set` saves the profile. `config clear --profile "clear-me"` prints `Profile "clear-me" removed`. Exit code 0. The profile no longer appears in `codika use --json`.

**Why**: Targeted removal — users can clean up individual profiles without affecting others.

**Cleanup**:
```bash
codika use cli-test-owner-full
```

---

### [P] Clear specific profile does not affect other profiles

```bash
codika config set --api-key "cko_keep_me" --name "keep-me" --skip-verify && codika config set --api-key "cko_remove_me" --name "remove-me" --skip-verify && codika config clear --profile "remove-me" && codika use --json | jq '[.[] | .name]'
```

**Expect**: The output array contains `"keep-me"` (and other pre-existing profiles) but does **not** contain `"remove-me"`. Only the targeted profile is removed.

**Why**: `--profile` removal must be surgical — other profiles must be untouched.

**Cleanup**:
```bash
codika logout keep-me && codika use cli-test-owner-full
```

---

### [N] Clear nonexistent profile

```bash
codika config clear --profile "nonexistent-profile" 2>&1; echo "EXIT:$?"
```

**Expect**: Exit code 1, error message contains `Profile "nonexistent-profile" not found.`

**Why**: Attempting to clear a profile that doesn't exist should fail explicitly rather than silently succeeding.

---

### [P] Clear all (destructive)

**WARNING**: This test removes all profiles. Only run in isolated test environments.

```bash
codika config clear
```

**Expect**: `Configuration cleared`. Exit code 0. `codika config show 2>&1` now shows `No profiles configured.` and exits 1.

**Why**: Nuclear option — users should be able to wipe all config and start fresh.

**Cleanup**: Re-create all test profiles using the setup procedure in `setup.md`.

---

## Last tested

Not yet tested.
