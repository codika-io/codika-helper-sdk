/**
 * Script: INPUT-SCHEMA-FORMAT
 *
 * Validates that inputSchema fields in HTTP and subworkflow triggers use the
 * `key` property (not the legacy `name` property).
 *
 * The SubworkflowInput interface was migrated from `name` to `key` for
 * consistency with FormFieldBase and other schema types. This rule catches
 * configs that still use the old `name` property.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'INPUT-SCHEMA-FORMAT';

export const metadata: RuleMetadata = {
  id: RULE_ID,
  name: 'input_schema_format',
  severity: 'should',
  description: 'inputSchema fields must use `key` instead of `name`',
  details:
    'SubworkflowInput and HTTP trigger inputSchema fields should use `key: string` ' +
    'instead of the legacy `name: string` property. Update each field object from ' +
    '`{ name: "x", type: "string" }` to `{ key: "x", type: "string" }`.',
  fixable: false,
  category: 'schema',
};

/**
 * Find inputSchema array ranges in the config content.
 * Returns line ranges (1-based) for each inputSchema: [...] block.
 */
function findInputSchemaRanges(content: string): { start: number; end: number }[] {
  const ranges: { start: number; end: number }[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match inputSchema: [ or inputSchema: [{ inline
    if (!/inputSchema\s*:\s*\[/.test(line)) continue;

    // Track bracket depth to find the end of this array
    let depth = 0;
    let foundOpen = false;
    let end = i;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === '[') {
          depth++;
          foundOpen = true;
        } else if (ch === ']') {
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

  return ranges;
}

/**
 * Check if a line number falls within any inputSchema range
 */
function isInInputSchemaContext(line: number, ranges: { start: number; end: number }[]): boolean {
  return ranges.some(r => line >= r.start && line <= r.end);
}

/**
 * Check that inputSchema fields use `key` instead of legacy `name`.
 */
export async function checkInputSchemaFormat(useCasePath: string): Promise<Finding[]> {
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

  const inputSchemaRanges = findInputSchemaRanges(content);
  if (inputSchemaRanges.length === 0) {
    return findings;
  }

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];

    // Only check inside inputSchema contexts
    if (!isInInputSchemaContext(lineNum, inputSchemaRanges)) continue;

    // Detect `name:` property usage (field identifier, not a string value)
    // Match patterns like: name: 'x', name: "x", name: `x`
    const nameMatch = line.match(/\bname\s*:\s*['"`]/);
    if (!nameMatch) continue;

    // Extract the value for the error message
    const valueMatch = line.match(/\bname\s*:\s*['"`]([^'"`]*)['"`]/);
    const fieldValue = valueMatch ? valueMatch[1] : '(unknown)';

    findings.push({
      rule: RULE_ID,
      severity: 'should',
      path: configPath,
      message: `inputSchema field uses legacy "name" property instead of "key" (line ${lineNum}, field: "${fieldValue}")`,
      raw_details:
        `The inputSchema field on line ${lineNum} uses \`name: "${fieldValue}"\` which is the legacy format.\n\n` +
        `Change it to \`key: "${fieldValue}"\` to match the current SubworkflowInput interface.\n\n` +
        `Before: { name: "${fieldValue}", type: "string" }\n` +
        `After:  { key: "${fieldValue}", type: "string" }`,
      line: lineNum,
    });
  }

  return findings;
}

export default checkInputSchemaFormat;
