/**
 * Script: SCHEMA-TYPES
 *
 * Validates that field types inside input/output schema definitions are valid.
 * Only checks `type:` values within schema contexts (inputSchema, outputSchema,
 * DeploymentInputSchema, FormInputSchema, FormOutputSchema functions).
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
 * Find schema function/block ranges in the config content.
 * Returns line ranges (1-based) where schema definitions occur.
 */
function findSchemaRanges(content: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const lines = content.split('\n');

  // Patterns that indicate a schema context
  const schemaStartPatterns = [
    /function\s+get\w*(?:Input|Output|Deployment)Schema/,
    /(?:input|output)Schema\s*:\s*\[/,
    /(?:Input|Output|Deployment)Schema\s*(?:=|:)\s*\[/,
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isSchemaStart = schemaStartPatterns.some(p => p.test(line));

    if (isSchemaStart) {
      // Find the end of this schema block by tracking bracket depth
      let depth = 0;
      let foundOpen = false;
      let end = i;

      for (let j = i; j < lines.length; j++) {
        for (const ch of lines[j]) {
          if (ch === '[' || ch === '{') {
            depth++;
            foundOpen = true;
          } else if (ch === ']' || ch === '}') {
            depth--;
          }
        }
        if (foundOpen && depth <= 0) {
          end = j;
          break;
        }
      }

      ranges.push({ start: i + 1, end: end + 1 }); // 1-based
    }
  }

  return ranges;
}

/**
 * Check if a line number falls within any schema range
 */
function isInSchemaContext(line: number, ranges: { start: number; end: number }[]): boolean {
  return ranges.some(r => line >= r.start && line <= r.end);
}

/**
 * Check schema field types in config.ts
 */
export async function checkSchemaTypes(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const configPath = join(useCasePath, 'config.ts');

  if (!existsSync(configPath)) {
    return findings;
  }

  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch {
    return findings;
  }

  const schemaRanges = findSchemaRanges(content);
  if (schemaRanges.length === 0) {
    return findings;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Only check type: references inside schema contexts
    if (!isInSchemaContext(lineNum, schemaRanges)) continue;

    const typeMatch = line.match(/type\s*:\s*['"]([^'"]+)['"]/);
    if (!typeMatch) continue;

    const typeValue = typeMatch[1];

    // Skip TypeScript 'as const' assertions
    if (typeValue === 'const') continue;

    if (!VALID_FIELD_TYPES.has(typeValue)) {
      findings.push({
        rule: metadata.id,
        severity: 'must',
        path: configPath,
        message: `Unknown schema field type: "${typeValue}" (line ${lineNum})`,
        raw_details: `Valid types are: ${Array.from(VALID_FIELD_TYPES).join(', ')}`,
        line: lineNum,
      });
    }
  }

  return findings;
}
