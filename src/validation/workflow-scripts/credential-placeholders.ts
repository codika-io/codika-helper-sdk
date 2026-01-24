/**
 * Script: CRED-PLACEHOLDER
 *
 * Validates that credential references in workflows use proper placeholders.
 *
 * Valid credential placeholder patterns:
 * - {{FLEXCRED_*_DERCXELF}}  (flexible - tries org first, falls back to user)
 * - {{USERCRED_*_DERCRESU}}  (user credentials)
 * - {{ORGCRED_*_DERCGRO}}    (organization credentials)
 *
 * Detects hardcoded credential IDs that should be placeholders.
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CRED-PLACEHOLDER',
  name: 'credential_placeholders',
  severity: 'should',
  description: 'Credential references should use proper placeholders',
  details: 'Replace hardcoded credential IDs with FLEXCRED, USERCRED, or ORGCRED placeholders',
  category: 'credentials',
};

// Valid credential placeholder patterns
const VALID_CRED_PATTERNS = [
  /\{\{FLEXCRED_[A-Z0-9_]+_DERCXELF\}\}/,
  /\{\{USERCRED_[A-Z0-9_]+_DERCRESU\}\}/,
  /\{\{ORGCRED_[A-Z0-9_]+_DERCGRO\}\}/,
];

// Pattern to detect hardcoded credential IDs (common n8n patterns)
// Looks for credential objects with id fields that contain UUIDs or numeric IDs
const HARDCODED_CRED_PATTERN = /"credentials"\s*:\s*\{[^}]*"id"\s*:\s*"([^"]+)"/g;

// Pattern to find credential blocks
const CREDENTIAL_BLOCK_PATTERN = /"credentials"\s*:\s*(\{[^}]*\})/g;

/**
 * Check if a value is a valid credential placeholder
 */
function isValidCredentialPlaceholder(value: string): boolean {
  return VALID_CRED_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Check if a value looks like a hardcoded credential ID
 */
function looksLikeHardcodedId(value: string): boolean {
  // UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    return true;
  }

  // Numeric ID
  if (/^\d+$/.test(value)) {
    return true;
  }

  // Firebase-style ID
  if (/^[A-Za-z0-9]{20,}$/.test(value)) {
    return true;
  }

  return false;
}

/**
 * Check for hardcoded credential IDs that should be placeholders
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

          // Check if id field exists and looks hardcoded
          if (credObj?.id) {
            const idValue = credObj.id;

            // Skip if it's already a placeholder
            if (isValidCredentialPlaceholder(idValue)) {
              continue;
            }

            // Check if it looks like a hardcoded ID
            if (looksLikeHardcodedId(idValue)) {
              findings.push({
                rule: metadata.id,
                severity: metadata.severity,
                path,
                message: `Node "${node.name || node.id}" has hardcoded credential ID for "${credType}"`,
                raw_details: `Replace the hardcoded credential ID "${idValue}" with a placeholder like {{FLEXCRED_${credType.toUpperCase()}_DERCXELF}}. Hardcoded IDs won't work when the workflow is deployed to different environments.`,
                nodeId: node.id,
              });
            }
          }
        }
      }
    }
  }

  return findings;
}
