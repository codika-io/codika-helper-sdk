/**
 * Integration Set Command
 *
 * Creates or updates an integration by encrypting secrets and sending them to the platform.
 *
 * Usage:
 *   codika integration set openai --secret OPENAI_API_KEY=sk-xxx
 *   codika integration set supabase --path . --secret SUPABASE_HOST=https://xxx.supabase.co --secret SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *   codika integration set openai --secrets '{"OPENAI_API_KEY":"sk-xxx"}' --json
 */

import { Command, Option } from 'commander';
import { resolve, join } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  createIntegrationRemote,
  deleteIntegrationRemote,
  isCreateIntegrationSuccess,
  type CreateIntegrationRequest,
} from '../../../utils/integration-client.js';
import { encryptSecret, type EncryptedField } from '../../../utils/encryption.js';
import {
  getIntegrationDef,
  isOAuthIntegration,
  INTEGRATION_FIELDS,
} from '../../../data/integration-fields.js';
import {
  resolveApiKey,
  resolveEndpointUrl,
  resolveBaseUrl,
  API_KEY_MISSING_MESSAGE,
  getActiveProfile,
  findProfileByOrgId,
} from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';
import { extractCustomIntegrationSchema } from '../../../utils/config-loader.js';

interface SetCommandOptions {
  secret?: string[];
  secrets?: string;
  secretsFile?: string;
  metadata?: string[];
  contextType?: string;
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  environment?: string;
  customSchemaFile?: string;
  force?: boolean;
  profile?: string;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
}

export const setCommand = new Command('set')
  .description('Create or update an integration')
  .argument('<integrationId>', 'Integration ID (e.g., openai, supabase, cstm_acme_crm)')
  .option(
    '--secret <KEY=VALUE>',
    'Secret field (repeatable)',
    (value: string, previous: string[]) => previous.concat([value]),
    [] as string[],
  )
  .option('--secrets <json>', 'JSON string with all secrets')
  .option('--secrets-file <path>', 'Path to JSON file with secrets')
  .option(
    '--metadata <KEY=VALUE>',
    'Metadata field (repeatable)',
    (value: string, previous: string[]) => previous.concat([value]),
    [] as string[],
  )
  .option('--context-type <type>', 'Context type: organization, member, or process_instance')
  .option('--process-instance-id <id>', 'Process instance ID (for process_instance context)')
  .option('--path <path>', 'Path to use case folder (for project.json resolution)')
  .option('--project-file <path>', 'Custom project file')
  .addOption(new Option('--environment <env>', 'Environment: dev or prod').choices(['dev', 'prod']).default('dev'))
  .option('--custom-schema-file <path>', 'Path to custom integration schema JSON (for cstm_* integrations)')
  .option('--force', 'Delete existing integration and recreate')
  .option('--profile <name>', 'Use a specific profile')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output as JSON')
  .action(async (integrationId: string, options: SetCommandOptions) => {
    try {
      await runSet(integrationId, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: { message: error instanceof Error ? error.message : String(error) },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

async function runSet(integrationId: string, options: SetCommandOptions): Promise<void> {
  // ── Check OAuth integrations ─────────────────────────
  if (isOAuthIntegration(integrationId)) {
    const profile = getActiveProfile();
    const orgId = profile?.profile.organizationId || 'YOUR_ORG_ID';
    const dashboardUrl = `https://app.codika.io/organizations/${orgId}/integrations`;

    if (options.json) {
      console.log(JSON.stringify({
        success: false,
        error: {
          code: 'OAUTH_REQUIRED',
          message: `${integrationId} requires OAuth authentication. Connect it via the dashboard.`,
          dashboardUrl,
        },
      }, null, 2));
    } else {
      console.error(`\x1b[33m⚠ ${integrationId} requires OAuth authentication.\x1b[0m`);
      console.error(`  Connect it via the dashboard at: ${dashboardUrl}`);
    }
    process.exit(2);
  }

  // ── Resolve context type ─────────────────────────────
  let contextType = options.contextType as 'organization' | 'member' | 'process_instance' | undefined;

  if (!contextType) {
    const def = getIntegrationDef(integrationId);
    if (def) {
      contextType = def.contextType;
    } else if (integrationId.startsWith('cstm_')) {
      // Custom integrations default to process_instance
      contextType = 'process_instance';
    } else {
      contextType = 'organization';
    }
  }

  // ── Resolve process instance ID + organizationId ────
  let processInstanceId = options.processInstanceId;
  let organizationId: string | undefined;

  {
    const useCasePath = resolve(options.path || process.cwd());
    const projectJson = readProjectJson(useCasePath, options.projectFile);

    if (projectJson) {
      organizationId = projectJson.organizationId;
      if (contextType === 'process_instance' && !processInstanceId) {
        processInstanceId = options.environment === 'prod'
          ? projectJson.prodProcessInstanceId
          : projectJson.devProcessInstanceId;
      }
    }

    if (contextType === 'process_instance' && !processInstanceId) {
      exitWithError(
        `processInstanceId is required for process_instance context. Either:\n` +
        `  1. Pass --process-instance-id flag\n` +
        `  2. Ensure project.json exists with devProcessInstanceId (use --path to specify location)`
      );
    }
  }

  // ── Resolve API key ──────────────────────────────────
  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    exitWithError(API_KEY_MISSING_MESSAGE);
  }

  // ── Merge secrets ────────────────────────────────────
  let secretsMap: Record<string, string> = {};

  // Layer 1: secrets-file (lowest priority)
  if (options.secretsFile) {
    const fileContent = readFileSync(resolve(options.secretsFile), 'utf-8');
    secretsMap = { ...secretsMap, ...JSON.parse(fileContent) };
  }

  // Layer 2: --secrets JSON string
  if (options.secrets) {
    secretsMap = { ...secretsMap, ...JSON.parse(options.secrets) };
  }

  // Layer 3: individual --secret flags (highest priority)
  if (options.secret?.length) {
    for (const s of options.secret) {
      const eqIndex = s.indexOf('=');
      if (eqIndex === -1) exitWithError(`Invalid --secret format: "${s}". Expected KEY=VALUE`);
      secretsMap[s.slice(0, eqIndex)] = s.slice(eqIndex + 1);
    }
  }

  if (Object.keys(secretsMap).length === 0) {
    exitWithError('At least one secret is required. Use --secret KEY=VALUE, --secrets, or --secrets-file');
  }

  // Validate field names against registry (warning only)
  const def = getIntegrationDef(integrationId);
  if (def && def.secretFields.length > 0) {
    const expectedKeys = new Set(def.secretFields.map(f => f.key));
    for (const key of Object.keys(secretsMap)) {
      if (!expectedKeys.has(key)) {
        if (!options.json) {
          console.warn(`\x1b[33m⚠ Unexpected secret field "${key}" for ${integrationId}. Expected: ${[...expectedKeys].join(', ')}\x1b[0m`);
        }
      }
    }
    // Check required fields
    for (const field of def.secretFields) {
      if (field.required && !secretsMap[field.key]) {
        if (!options.json) {
          console.warn(`\x1b[33m⚠ Missing required field "${field.key}" (${field.description})\x1b[0m`);
        }
      }
    }
  }

  // ── Parse metadata ───────────────────────────────────
  const metadataMap: Record<string, any> = {
    connectedAt: new Date().toISOString(),
    installedBy: 'cli',
    hasValidTokens: true,
  };

  if (options.metadata?.length) {
    for (const m of options.metadata) {
      const eqIndex = m.indexOf('=');
      if (eqIndex === -1) exitWithError(`Invalid --metadata format: "${m}". Expected KEY=VALUE`);
      metadataMap[m.slice(0, eqIndex)] = m.slice(eqIndex + 1);
    }
  }

  // ── Encrypt secrets ──────────────────────────────────
  if (!options.json) {
    console.log(`\nConfiguring ${integrationId}...`);
    console.log(`  Context:    ${contextType}`);
    if (processInstanceId) console.log(`  Instance:   ${processInstanceId}`);
    console.log(`  Secrets:    ${Object.keys(secretsMap).length} field(s)`);
    if (options.force) console.log(`  Force:      yes`);
    console.log('');
    console.log('  Encrypting secrets...');
  }

  const encryptedSecrets: Record<string, EncryptedField> = {};
  for (const [key, value] of Object.entries(secretsMap)) {
    encryptedSecrets[key] = await encryptSecret(value, key);
  }

  // ── Force delete existing ────────────────────────────
  if (options.force) {
    if (!options.json) console.log('  Deleting existing integration (--force)...');

    const deleteUrl = resolveEndpointUrl('deleteIntegration', options.apiUrl, options.profile);
    await deleteIntegrationRemote({
      apiUrl: deleteUrl,
      apiKey,
      body: {
        organizationId,
        integrationId,
        contextType,
        processInstanceId,
        confirmDeletion: true,
      },
    });
  }

  // ── Load custom schema for cstm_* integrations ──────
  let customIntegrationSchema: Record<string, any> | undefined;
  if (integrationId.startsWith('cstm_')) {
    if (options.customSchemaFile) {
      // Explicit schema file takes precedence
      const schemaContent = readFileSync(resolve(options.customSchemaFile), 'utf-8');
      customIntegrationSchema = JSON.parse(schemaContent);
    } else {
      // Auto-extract from config.ts in the --path directory (or CWD)
      const useCasePath = resolve(options.path || process.cwd());
      const hasConfig = existsSync(join(useCasePath, 'config.ts')) || existsSync(join(useCasePath, 'config.js'));

      if (hasConfig) {
        try {
          const schema = await extractCustomIntegrationSchema(useCasePath, integrationId);
          if (schema) {
            customIntegrationSchema = schema;
            if (!options.json) {
              console.log(`  Schema:     auto-extracted from config.ts`);
            }
          } else {
            exitWithError(
              `Custom integration ${integrationId} not found in config.ts customIntegrations array at ${useCasePath}.\n` +
              `  Either add it to customIntegrations in config.ts, or pass --custom-schema-file.`
            );
          }
        } catch (err) {
          exitWithError(
            `Failed to load config.ts at ${useCasePath}: ${err instanceof Error ? err.message : String(err)}\n` +
            `  You can bypass this by passing --custom-schema-file with the schema JSON.`
          );
        }
      } else {
        exitWithError(
          `Custom integration ${integrationId} requires a schema.\n` +
          `  Option 1: Use --path to point to a use case folder with config.ts (schema auto-extracted)\n` +
          `  Option 2: Pass --custom-schema-file with the schema JSON`
        );
      }
    }
  }

  // ── Call API ─────────────────────────────────────────
  if (!options.json) console.log('  Creating integration...');

  const createUrl = resolveEndpointUrl('createIntegration', options.apiUrl, options.profile);

  const requestBody: CreateIntegrationRequest = {
    organizationId,
    integrationId,
    contextType,
    secrets: encryptedSecrets,
    metadata: metadataMap,
  };

  if (processInstanceId) requestBody.processInstanceId = processInstanceId;
  if (customIntegrationSchema) requestBody.customIntegrationSchema = customIntegrationSchema;

  const result = await createIntegrationRemote({
    apiUrl: createUrl,
    apiKey,
    body: requestBody,
  });

  if (isCreateIntegrationSuccess(result)) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`\n\x1b[32m✓ ${integrationId} integration created successfully!\x1b[0m`);
      if (result.data.n8nCredentialId) {
        console.log(`  n8n Credential ID: ${result.data.n8nCredentialId}`);
      }
      console.log('');
    }
    process.exit(0);
  }

  // Error response
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    const err = (result as any).error;
    console.error(`\n\x1b[31m✗ Failed to create integration:\x1b[0m ${err?.code || 'UNKNOWN'} — ${err?.message || 'Unknown error'}`);
  }
  process.exit(1);
}

function exitWithError(message: string): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(2);
}
