/**
 * Integration Schema Command
 *
 * Fetches the n8n credential schema for a given credential type.
 * This tells you exactly which fields are required/optional when
 * creating a custom integration with that n8n credential type.
 *
 * Usage:
 *   codika integration schema twilioApi
 *   codika integration schema openAiApi --json
 */

import { Command } from 'commander';
import { resolveApiKey, resolveEndpointUrl } from '../../../utils/config.js';
import {
  getCredentialSchemaRemote,
  isGetCredentialSchemaSuccess,
} from '../../../utils/integration-client.js';

// ── Command ──────────────────────────────────────────

export const schemaCommand = new Command('schema')
  .description('Fetch the n8n credential schema for a credential type')
  .argument('<credentialType>', 'n8n credential type (e.g., twilioApi, openAiApi, httpHeaderAuth)')
  .option('--profile <name>', 'CLI profile to use')
  .option('--api-key <key>', 'Override API key')
  .option('--api-url <url>', 'Override API base URL')
  .option('--json', 'Output raw JSON', false)
  .action(async (credentialType: string, options: any) => {
    const apiKey = resolveApiKey(options.apiKey, options.profile);
    if (!apiKey) {
      console.error('No API key found. Run `codika login` or pass --api-key.');
      process.exit(2);
    }

    const apiUrl = resolveEndpointUrl('getCredentialSchema', options.apiUrl, options.profile);

    if (!options.json) {
      console.log(`\nFetching schema for "${credentialType}"...\n`);
    }

    try {
      const data = await getCredentialSchemaRemote({ apiUrl, apiKey, credentialType });

      if (!isGetCredentialSchemaSuccess(data)) {
        if (options.json) {
          console.log(JSON.stringify(data, null, 2));
        } else {
          console.error(`\u2717 ${data.error.message}`);
        }
        process.exit(1);
      }

      if (options.json) {
        console.log(JSON.stringify(data.data, null, 2));
        process.exit(0);
      }

      // Pretty print the schema
      const schema = data.data;

      console.log(`Credential type: ${credentialType}`);
      console.log(`Additional properties allowed: ${schema.additionalProperties}`);
      console.log('');

      // Show properties
      console.log('Properties:');
      const props = schema.properties || {};
      const requiredFields = new Set(schema.required || []);

      for (const [name, def] of Object.entries(props)) {
        const req = requiredFields.has(name) ? ' (required)' : '';
        const enumVals = def.enum ? ` [${def.enum.join(', ')}]` : '';
        console.log(`  ${name}: ${def.type}${enumVals}${req}`);
      }

      // Show conditional requirements from allOf
      if (schema.allOf && schema.allOf.length > 0) {
        console.log('');
        console.log('Conditional rules:');
        for (const rule of schema.allOf) {
          if (rule.if && rule.then) {
            const ifProps = Object.entries(rule.if.properties || {});
            if (ifProps.length > 0) {
              const [field, condition] = ifProps[0] as [string, any];
              const condValue = condition.enum ? condition.enum.join('|') : '?';

              const thenRequired: string[] = [];
              if (rule.then.allOf) {
                for (const r of rule.then.allOf) {
                  if (r.required) thenRequired.push(...r.required);
                }
              }

              if (thenRequired.length > 0) {
                console.log(`  if ${field} = ${condValue} then require: ${thenRequired.join(', ')}`);
              }
            }
          }
        }
      }

      console.log('');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: message }));
      } else {
        console.error(`\u2717 Failed to fetch schema: ${message}`);
      }
      process.exit(1);
    }
  });
