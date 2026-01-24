/**
 * Script: SCHEMA-TYPES
 *
 * Validates that input and output schema field types are valid.
 *
 * Valid field types:
 * - string, text, number, boolean, date
 * - select, multiselect, radio
 * - file, array, object, objectArray
 * - section (for grouping)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'SCHEMA-TYPES',
  name: 'schema_types',
  severity: 'must',
  description: 'Schema field types must be valid',
  details: 'Use only supported field types in input and output schemas',
  category: 'schema',
};

// Valid field types for schemas
const VALID_FIELD_TYPES = new Set([
  'string',
  'text',
  'number',
  'boolean',
  'date',
  'select',
  'multiselect',
  'radio',
  'file',
  'array',
  'object',
  'objectArray',
  'section',
]);

/**
 * Extract type references from config content
 */
function findTypeReferences(content: string): { type: string; line: number }[] {
  const results: { type: string; line: number }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match type: 'value' or type: "value" patterns
    const typeMatch = line.match(/type\s*:\s*['"]([^'"]+)['"]/);
    if (typeMatch) {
      results.push({
        type: typeMatch[1],
        line: i + 1,
      });
    }
  }

  return results;
}

/**
 * Check schema field types in config.ts
 */
export async function checkSchemaTypes(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const configPath = join(useCasePath, 'config.ts');

  if (!existsSync(configPath)) {
    // Config file missing is handled by other checks
    return findings;
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return findings;
  }

  // Find all type references
  const typeRefs = findTypeReferences(content);

  for (const ref of typeRefs) {
    // Skip 'const' which is TypeScript assertion, not a field type
    if (ref.type === 'const') continue;

    // Skip trigger types
    if (['http', 'schedule', 'subworkflow', 'third-party'].includes(ref.type)) continue;

    // Skip workflow category types
    if (['user_facing', 'data_ingestion'].includes(ref.type)) continue;

    // Check if it's a valid field type
    if (!VALID_FIELD_TYPES.has(ref.type)) {
      findings.push({
        rule: metadata.id,
        severity: 'should',
        path: configPath,
        message: `Unknown schema field type: "${ref.type}" (line ${ref.line})`,
        raw_details: `Valid types are: ${Array.from(VALID_FIELD_TYPES).join(', ')}`,
        line: ref.line,
      });
    }
  }

  return findings;
}
