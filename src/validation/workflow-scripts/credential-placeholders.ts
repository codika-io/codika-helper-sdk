/**
 * Script: CRED-PLACEHOLDER
 *
 * Validates that credential references in workflows use proper placeholders.
 *
 * Valid credential placeholder patterns:
 * - {{FLEXCRED_CREDNAME_ID_DERCXELF}}   / {{FLEXCRED_CREDNAME_NAME_DERCXELF}}   (flexible - tries org first, falls back to user)
 * - {{USERCRED_CREDNAME_ID_DERCRESU}}   / {{USERCRED_CREDNAME_NAME_DERCRESU}}   (user credentials)
 * - {{ORGCRED_CREDNAME_ID_DERCGRO}}     / {{ORGCRED_CREDNAME_NAME_DERCGRO}}     (organization credentials)
 * - {{INSTCRED_CREDNAME_ID_DERCTSNI}}   / {{INSTCRED_CREDNAME_NAME_DERCTSNI}}   (instance credentials)
 *
 * Both `id` and `name` fields must use proper placeholders with _ID_ and _NAME_ markers respectively.
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CRED-PLACEHOLDER',
  name: 'credential_placeholders',
  severity: 'should',
  description: 'Credential references should use proper placeholders',
  details:
    'Replace hardcoded credential values with FLEXCRED, USERCRED, ORGCRED, or INSTCRED placeholders. ' +
    'Use _ID_ suffix for id field and _NAME_ suffix for name field.',
  category: 'credentials',
};

// Credential types and their corresponding suffixes
const CREDENTIAL_TYPES = {
  FLEXCRED: 'DERCXELF',
  USERCRED: 'DERCRESU',
  ORGCRED: 'DERCGRO',
  INSTCRED: 'DERCTSNI',
} as const;

type CredentialType = keyof typeof CREDENTIAL_TYPES;

// Pattern to extract credential type from a placeholder
const PLACEHOLDER_PATTERN = /^\{\{(FLEXCRED|USERCRED|ORGCRED|INSTCRED)_([A-Z0-9_]+)_(ID|NAME)_(DERCXELF|DERCRESU|DERCGRO|DERCTSNI)\}\}$/;

// Pattern to detect if something looks like a placeholder but has wrong format
const LOOKS_LIKE_PLACEHOLDER = /^\{\{[A-Z_]+.*\}\}$/;

/**
 * Validates a credential ID placeholder
 * Returns null if valid, error message if invalid
 */
function validateIdPlaceholder(value: string): { valid: boolean; error?: string; type?: CredentialType } {
  const match = value.match(PLACEHOLDER_PATTERN);

  if (!match) {
    // Check if it looks like a placeholder but has wrong format
    if (LOOKS_LIKE_PLACEHOLDER.test(value)) {
      // Check for missing _ID_ marker
      if (!value.includes('_ID_')) {
        return { valid: false, error: 'missing _ID_ marker in placeholder' };
      }
      // Check for unknown credential type
      const typeMatch = value.match(/^\{\{([A-Z]+)_/);
      if (typeMatch && !(typeMatch[1] in CREDENTIAL_TYPES)) {
        return { valid: false, error: `unknown credential type "${typeMatch[1]}"` };
      }
      // Check for wrong suffix
      for (const [type, suffix] of Object.entries(CREDENTIAL_TYPES)) {
        if (value.includes(`{{${type}_`)) {
          if (!value.endsWith(`_${suffix}}}`)) {
            return { valid: false, error: `wrong suffix for ${type} (expected ${suffix})` };
          }
        }
      }
      return { valid: false, error: 'invalid placeholder format' };
    }
    return { valid: false };
  }

  const [, credType, , marker, suffix] = match;

  // Validate marker is ID for id field
  if (marker !== 'ID') {
    return { valid: false, error: 'id field should use _ID_ marker, not _NAME_' };
  }

  // Validate suffix matches credential type
  const expectedSuffix = CREDENTIAL_TYPES[credType as CredentialType];
  if (suffix !== expectedSuffix) {
    return { valid: false, error: `wrong suffix for ${credType} (expected ${expectedSuffix}, got ${suffix})` };
  }

  return { valid: true, type: credType as CredentialType };
}

/**
 * Validates a credential NAME placeholder
 * Returns null if valid, error message if invalid
 */
function validateNamePlaceholder(value: string): { valid: boolean; error?: string; type?: CredentialType } {
  const match = value.match(PLACEHOLDER_PATTERN);

  if (!match) {
    // Check if it looks like a placeholder but has wrong format
    if (LOOKS_LIKE_PLACEHOLDER.test(value)) {
      // Check for missing _NAME_ marker
      if (!value.includes('_NAME_')) {
        return { valid: false, error: 'missing _NAME_ marker in placeholder' };
      }
      // Check for unknown credential type
      const typeMatch = value.match(/^\{\{([A-Z]+)_/);
      if (typeMatch && !(typeMatch[1] in CREDENTIAL_TYPES)) {
        return { valid: false, error: `unknown credential type "${typeMatch[1]}"` };
      }
      // Check for wrong suffix
      for (const [type, suffix] of Object.entries(CREDENTIAL_TYPES)) {
        if (value.includes(`{{${type}_`)) {
          if (!value.endsWith(`_${suffix}}}`)) {
            return { valid: false, error: `wrong suffix for ${type} (expected ${suffix})` };
          }
        }
      }
      return { valid: false, error: 'invalid placeholder format' };
    }
    return { valid: false };
  }

  const [, credType, , marker, suffix] = match;

  // Validate marker is NAME for name field
  if (marker !== 'NAME') {
    return { valid: false, error: 'name field should use _NAME_ marker, not _ID_' };
  }

  // Validate suffix matches credential type
  const expectedSuffix = CREDENTIAL_TYPES[credType as CredentialType];
  if (suffix !== expectedSuffix) {
    return { valid: false, error: `wrong suffix for ${credType} (expected ${expectedSuffix}, got ${suffix})` };
  }

  return { valid: true, type: credType as CredentialType };
}

/**
 * Check if a value looks like a hardcoded credential ID
 */
function looksLikeHardcodedValue(value: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }

  // Numeric ID
  if (/^\d+$/.test(value)) {
    return true;
  }

  // Firebase-style ID (alphanumeric, 20+ chars)
  if (/^[A-Za-z0-9]{20,}$/.test(value)) {
    return true;
  }

  // Plain text name (not a placeholder)
  if (!value.startsWith('{{') && value.length > 0) {
    return true;
  }

  return false;
}

/**
 * Generate helpful fix instructions
 */
function generateFixInstructions(credType: string, field: 'id' | 'name'): string {
  const marker = field === 'id' ? 'ID' : 'NAME';
  const example = `{{FLEXCRED_${credType.toUpperCase()}_${marker}_DERCXELF}}`;

  return (
    `Use a proper credential placeholder with _${marker}_ marker. ` +
    `Available types: FLEXCRED (suffix: DERCXELF), USERCRED (suffix: DERCRESU), ORGCRED (suffix: DERCGRO), INSTCRED (suffix: DERCTSNI). ` +
    `Example: ${example}`
  );
}

/**
 * Check for credential placeholder issues
 */
export function checkCredentialPlaceholders(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Parse as JSON to properly inspect credential blocks
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // If not valid JSON, skip this check
    return [];
  }

  // Check each node's credentials
  if (Array.isArray(parsed.nodes)) {
    for (const node of parsed.nodes) {
      if (node.credentials) {
        for (const [credType, credValue] of Object.entries(node.credentials)) {
          const credObj = credValue as any;
          if (!credObj) continue;

          const nodeName = node.name || node.id;
          let idType: CredentialType | undefined;
          let nameType: CredentialType | undefined;

          // Check ID field
          if (credObj.id !== undefined) {
            const idValue = String(credObj.id);

            // First check if it looks like a placeholder
            if (LOOKS_LIKE_PLACEHOLDER.test(idValue)) {
              const validation = validateIdPlaceholder(idValue);
              if (!validation.valid) {
                findings.push({
                  rule: metadata.id,
                  severity: metadata.severity,
                  path,
                  message: `Node "${nodeName}" credential "${credType}" id: ${validation.error || 'invalid placeholder'}`,
                  raw_details: generateFixInstructions(credType, 'id'),
                  nodeId: node.id,
                });
              } else {
                idType = validation.type;
              }
            } else if (looksLikeHardcodedValue(idValue)) {
              // It's a hardcoded value, not a placeholder
              findings.push({
                rule: metadata.id,
                severity: metadata.severity,
                path,
                message: `Node "${nodeName}" has hardcoded credential id for "${credType}"`,
                raw_details: generateFixInstructions(credType, 'id'),
                nodeId: node.id,
              });
            }
          } else {
            // Missing id field entirely
            findings.push({
              rule: metadata.id,
              severity: metadata.severity,
              path,
              message: `Node "${nodeName}" credential "${credType}" is missing id field`,
              raw_details: generateFixInstructions(credType, 'id'),
              nodeId: node.id,
            });
          }

          // Check NAME field
          if (credObj.name !== undefined) {
            const nameValue = String(credObj.name);

            // First check if it looks like a placeholder
            if (LOOKS_LIKE_PLACEHOLDER.test(nameValue)) {
              const validation = validateNamePlaceholder(nameValue);
              if (!validation.valid) {
                findings.push({
                  rule: metadata.id,
                  severity: metadata.severity,
                  path,
                  message: `Node "${nodeName}" credential "${credType}" name: ${validation.error || 'invalid placeholder'}`,
                  raw_details: generateFixInstructions(credType, 'name'),
                  nodeId: node.id,
                });
              } else {
                nameType = validation.type;
              }
            } else if (looksLikeHardcodedValue(nameValue)) {
              // It's a hardcoded value, not a placeholder
              findings.push({
                rule: metadata.id,
                severity: metadata.severity,
                path,
                message: `Node "${nodeName}" has hardcoded credential name for "${credType}"`,
                raw_details: generateFixInstructions(credType, 'name'),
                nodeId: node.id,
              });
            }
          } else {
            // Missing name field entirely
            findings.push({
              rule: metadata.id,
              severity: metadata.severity,
              path,
              message: `Node "${nodeName}" credential "${credType}" is missing name field`,
              raw_details: generateFixInstructions(credType, 'name'),
              nodeId: node.id,
            });
          }

          // Check for mismatched types between id and name
          if (idType && nameType && idType !== nameType) {
            findings.push({
              rule: metadata.id,
              severity: metadata.severity,
              path,
              message: `Node "${nodeName}" credential "${credType}" has mismatched types: id uses ${idType} but name uses ${nameType}`,
              raw_details: 'Both id and name should use the same credential type (FLEXCRED, USERCRED, ORGCRED, or INSTCRED)',
              nodeId: node.id,
            });
          }
        }
      }
    }
  }

  return findings;
}
