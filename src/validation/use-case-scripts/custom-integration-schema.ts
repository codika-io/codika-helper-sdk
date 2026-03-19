/**
 * Script: CUSTOM-INTEGRATION
 *
 * Validates custom integration schemas defined in config.ts:
 * - All customIntegrations[].id must start with 'cstm_'
 * - IDs must be snake_case (only lowercase letters, numbers, underscores)
 * - No duplicate IDs within customIntegrations
 * - n8nCredentialMapping keys must exist in secretFields or metadataFields
 * - secretFields[].key must be UPPER_SNAKE_CASE
 * - No duplicate field keys within an integration
 * - If n8nCredentialType !== 'none', n8nCredentialMapping must be provided and non-empty
 * - Custom integration IDs in integrationUids must have corresponding entries in customIntegrations
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'CUSTOM-INTEGRATION';

export const metadata: RuleMetadata = {
  id: RULE_ID,
  name: 'custom_integration_schema',
  severity: 'must',
  description: 'Custom integration schemas must be well-formed and consistent',
  details:
    'Validates cstm_ prefix, snake_case IDs, UPPER_SNAKE_CASE secret keys, no duplicates, credential mapping consistency, and integrationUids references',
  category: 'config',
};

/** snake_case: only lowercase letters, numbers, and underscores */
const SNAKE_CASE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** UPPER_SNAKE_CASE: only uppercase letters, numbers, and underscores */
const UPPER_SNAKE_CASE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

/**
 * Extract custom integration definitions and integrationUids from config.ts source.
 *
 * This uses regex-based extraction from the TypeScript source code rather than
 * importing the module, since the config may not be compiled.
 * We look for the customIntegrations array and integrationUids arrays.
 */
function extractCustomIntegrations(content: string): {
  ids: string[];
  integrations: Array<{
    id: string;
    n8nCredentialType: string;
    n8nCredentialMappingKeys: string[];
    secretFieldKeys: string[];
    metadataFieldKeys: string[];
    allFieldKeys: string[];
  }>;
  integrationUidsCstm: string[];
} {
  const ids: string[] = [];
  const integrations: Array<{
    id: string;
    n8nCredentialType: string;
    n8nCredentialMappingKeys: string[];
    secretFieldKeys: string[];
    metadataFieldKeys: string[];
    allFieldKeys: string[];
  }> = [];
  const integrationUidsCstm: string[] = [];

  // Extract custom integration IDs from id fields
  // Pattern: id: 'cstm_...' or id: "cstm_..."
  const idPattern = /id:\s*['"]([^'"]+)['"]/g;
  let idMatch;

  // Find customIntegrations array block
  const customIntBlock = findArrayBlock(content, 'customIntegrations');
  if (!customIntBlock) {
    // No customIntegrations found — check integrationUids for orphaned cstm_ refs
    extractCstmFromIntegrationUids(content, integrationUidsCstm);
    return { ids, integrations, integrationUidsCstm };
  }

  // Extract each integration object from the block.
  // First try inline objects inside the customIntegrations array.
  let objectBlocks = extractObjectBlocks(customIntBlock);

  // If no inline objects found, the config likely uses variable references
  // (e.g., customIntegrations: [weatherApiIntegration, orgCrmIntegration]).
  // In that case, find top-level variable declarations that match the
  // CustomIntegrationSchema shape: have id: 'cstm_...', n8nCredentialType, and secretFields.
  if (objectBlocks.length === 0) {
    // Extract all top-level const/let/var assignments that contain cstm_ integration patterns
    // by finding balanced {} blocks that contain the signature fields
    const topLevelPattern = /(?:const|let|var)\s+\w+\s*(?::\s*\w+)?\s*=\s*\{/g;
    let varMatch;
    while ((varMatch = topLevelPattern.exec(content)) !== null) {
      const startIdx = content.indexOf('{', varMatch.index);
      if (startIdx === -1) continue;
      let depth = 0;
      let endIdx = -1;
      for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') depth++;
        else if (content[i] === '}') {
          depth--;
          if (depth === 0) { endIdx = i; break; }
        }
      }
      if (endIdx === -1) continue;
      const block = content.slice(startIdx, endIdx + 1);
      if (
        /id:\s*['"]cstm_/.test(block) &&
        /n8nCredentialType:\s*['"]/.test(block) &&
        /secretFields:\s*\[/.test(block)
      ) {
        objectBlocks.push(block);
      }
    }
  }

  for (const block of objectBlocks) {
    const idM = block.match(/id:\s*['"]([^'"]+)['"]/);
    const id = idM ? idM[1] : '';
    if (id) ids.push(id);

    const credTypeM = block.match(/n8nCredentialType:\s*['"]([^'"]+)['"]/);
    const n8nCredentialType = credTypeM ? credTypeM[1] : 'none';

    // Extract n8nCredentialMapping keys
    const mappingKeys = extractMappingKeys(block);

    // Extract secretFields keys
    const secretFieldKeys = extractFieldKeys(block, 'secretFields');

    // Extract metadataFields keys
    const metadataFieldKeys = extractFieldKeys(block, 'metadataFields');

    integrations.push({
      id,
      n8nCredentialType,
      n8nCredentialMappingKeys: mappingKeys,
      secretFieldKeys,
      metadataFieldKeys,
      allFieldKeys: [...secretFieldKeys, ...metadataFieldKeys],
    });
  }

  // Extract cstm_ IDs from integrationUids at all levels
  extractCstmFromIntegrationUids(content, integrationUidsCstm);

  return { ids, integrations, integrationUidsCstm };
}

/**
 * Find a named array block in the source, e.g., customIntegrations: [...]
 */
function findArrayBlock(content: string, name: string): string | null {
  const startIdx = content.indexOf(`${name}:`);
  if (startIdx === -1) return null;

  // Find the opening bracket
  const bracketStart = content.indexOf('[', startIdx);
  if (bracketStart === -1) return null;

  // Find matching closing bracket
  let depth = 0;
  for (let i = bracketStart; i < content.length; i++) {
    if (content[i] === '[') depth++;
    else if (content[i] === ']') {
      depth--;
      if (depth === 0) {
        return content.slice(bracketStart, i + 1);
      }
    }
  }
  return null;
}

/**
 * Extract top-level object blocks from an array string.
 */
function extractObjectBlocks(arrayStr: string): string[] {
  const blocks: string[] = [];
  let depth = 0;
  let start = -1;

  for (let i = 0; i < arrayStr.length; i++) {
    if (arrayStr[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (arrayStr[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        blocks.push(arrayStr.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return blocks;
}

/**
 * Extract mapping keys from n8nCredentialMapping: { KEY: 'value', ... }
 */
function extractMappingKeys(block: string): string[] {
  const keys: string[] = [];
  const mappingBlock = findObjectBlock(block, 'n8nCredentialMapping');
  if (!mappingBlock) return keys;

  const keyPattern = /['"]?([A-Z_][A-Z0-9_]*)['"]?\s*:/g;
  let m;
  while ((m = keyPattern.exec(mappingBlock)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

/**
 * Find a named object block, e.g., n8nCredentialMapping: { ... }
 */
function findObjectBlock(content: string, name: string): string | null {
  const startIdx = content.indexOf(`${name}:`);
  if (startIdx === -1) return null;

  const braceStart = content.indexOf('{', startIdx);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        return content.slice(braceStart, i + 1);
      }
    }
  }
  return null;
}

/**
 * Extract field keys from a named array of field objects (secretFields or metadataFields).
 */
function extractFieldKeys(block: string, fieldName: string): string[] {
  const keys: string[] = [];
  const arrayBlock = findArrayBlock(block, fieldName);
  if (!arrayBlock) return keys;

  const keyPattern = /key:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = keyPattern.exec(arrayBlock)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

/**
 * Extract cstm_* IDs from integrationUids arrays throughout the config.
 */
function extractCstmFromIntegrationUids(content: string, result: string[]): void {
  // Find all integrationUids arrays (at workflow and top level)
  const pattern = /integrationUids:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    const arrayContent = m[1];
    const idPattern = /['"]([^'"]+)['"]/g;
    let idM;
    while ((idM = idPattern.exec(arrayContent)) !== null) {
      if (idM[1].startsWith('cstm_') && !result.includes(idM[1])) {
        result.push(idM[1]);
      }
    }
  }
}

/**
 * Validate custom integration schemas in a use case config.ts
 */
export async function checkCustomIntegrationSchema(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const configTsPath = join(useCasePath, 'config.ts');
  const configJsPath = join(useCasePath, 'config.js');

  let configPath: string | null = null;
  if (existsSync(configTsPath)) {
    configPath = configTsPath;
  } else if (existsSync(configJsPath)) {
    configPath = configJsPath;
  }

  if (!configPath) {
    // CONFIG-EXPORTS script already handles missing config
    return findings;
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return findings;
  }

  // Quick check: does the config reference customIntegrations at all?
  if (!content.includes('customIntegrations')) {
    return findings;
  }

  const { ids, integrations, integrationUidsCstm } = extractCustomIntegrations(content);

  // If no custom integrations found, nothing to validate
  if (integrations.length === 0 && integrationUidsCstm.length === 0) {
    return findings;
  }

  // Rule 1: All IDs must start with 'cstm_'
  for (const integration of integrations) {
    if (integration.id && !integration.id.startsWith('cstm_')) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Custom integration ID '${integration.id}' must start with 'cstm_'`,
        raw_details: `Rename to 'cstm_${integration.id}' or another cstm_-prefixed ID`,
      });
    }
  }

  // Rule 2: IDs must be snake_case
  for (const integration of integrations) {
    if (integration.id && !SNAKE_CASE_PATTERN.test(integration.id)) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Custom integration ID '${integration.id}' must be snake_case (lowercase letters, numbers, underscores)`,
        raw_details: 'Use only lowercase letters, numbers, and underscores. Must start with a letter.',
      });
    }
  }

  // Rule 3: No duplicate IDs
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Duplicate custom integration ID '${id}'`,
        raw_details: 'Each custom integration must have a unique ID',
      });
    }
    seen.add(id);
  }

  // Rule 4: n8nCredentialMapping keys must exist in secretFields or metadataFields
  for (const integration of integrations) {
    for (const mappingKey of integration.n8nCredentialMappingKeys) {
      if (!integration.allFieldKeys.includes(mappingKey)) {
        findings.push({
          rule: RULE_ID,
          severity: 'must',
          path: configPath,
          message: `Integration '${integration.id}': n8nCredentialMapping key '${mappingKey}' not found in secretFields or metadataFields`,
          raw_details: `Add a field with key '${mappingKey}' to secretFields or metadataFields, or remove it from n8nCredentialMapping`,
        });
      }
    }
  }

  // Rule 5: secretFields keys must be UPPER_SNAKE_CASE
  for (const integration of integrations) {
    for (const key of integration.secretFieldKeys) {
      if (!UPPER_SNAKE_CASE_PATTERN.test(key)) {
        findings.push({
          rule: RULE_ID,
          severity: 'must',
          path: configPath,
          message: `Integration '${integration.id}': secretFields key '${key}' must be UPPER_SNAKE_CASE`,
          raw_details: 'Secret field keys must use only uppercase letters, numbers, and underscores (e.g., API_KEY, BASE_URL)',
        });
      }
    }
  }

  // Rule 6: No duplicate field keys within an integration
  for (const integration of integrations) {
    const fieldSeen = new Set<string>();
    for (const key of integration.allFieldKeys) {
      if (fieldSeen.has(key)) {
        findings.push({
          rule: RULE_ID,
          severity: 'must',
          path: configPath,
          message: `Integration '${integration.id}': duplicate field key '${key}'`,
          raw_details: 'Each field key must be unique within an integration (across both secretFields and metadataFields)',
        });
      }
      fieldSeen.add(key);
    }
  }

  // Rule 7: If n8nCredentialType !== 'none', n8nCredentialMapping must be provided and non-empty
  for (const integration of integrations) {
    if (integration.n8nCredentialType !== 'none' && integration.n8nCredentialMappingKeys.length === 0) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Integration '${integration.id}': n8nCredentialType is '${integration.n8nCredentialType}' but n8nCredentialMapping is missing or empty`,
        raw_details: 'When n8nCredentialType is not "none", you must provide n8nCredentialMapping to map field keys to n8n credential data fields',
      });
    }
  }

  // Rule 8: Custom integration IDs in integrationUids must have corresponding entries in customIntegrations
  const definedIds = new Set(ids);
  for (const cstmId of integrationUidsCstm) {
    if (!definedIds.has(cstmId)) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `integrationUids references '${cstmId}' but no matching entry in customIntegrations`,
        raw_details: `Add a custom integration definition with id '${cstmId}' to the customIntegrations array, or remove it from integrationUids`,
      });
    }
  }

  return findings;
}
