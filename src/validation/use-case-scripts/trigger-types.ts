/**
 * Script: TRIGGER-TYPES
 *
 * Validates that trigger `type` values in config.ts are valid platform types.
 * Only checks `type:` values at the trigger object level inside `triggers: [...]`
 * blocks — ignores nested `inputSchema` arrays which use schema field types.
 *
 * Valid trigger types: http, schedule, service_event, subworkflow, data_ingestion
 *
 * For service_event triggers, also validates the `service` field:
 * Valid services: telegram, email, slack, discord, pipedrive, other
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'TRIGGER-TYPES',
  name: 'trigger_types',
  severity: 'must',
  description: 'Trigger types must be valid platform types',
  details: 'Use only supported trigger types (http, schedule, service_event, subworkflow, data_ingestion)',
  category: 'triggers',
};

const VALID_TRIGGER_TYPES = new Set([
  'http',
  'schedule',
  'service_event',
  'subworkflow',
  'data_ingestion',
]);

const VALID_SERVICE_TYPES = new Set([
  'telegram',
  'email',
  'slack',
  'discord',
  'pipedrive',
  'other',
]);

/**
 * Extract trigger-level type: and service: values from config content.
 *
 * Two-pass approach:
 * 1. Find all triggers: [...] blocks (line ranges)
 * 2. Within those blocks, find inputSchema: [...] sub-ranges to exclude
 * 3. Extract type:/service: matches only from non-excluded lines
 */
interface TypeRef {
  key: 'type' | 'service';
  value: string;
  line: number;
}

interface LineRange {
  start: number; // 1-based inclusive
  end: number;   // 1-based inclusive
}

/**
 * Find balanced bracket ranges starting from a pattern match.
 * Returns the line range of the matched bracket block.
 */
function findBracketRanges(lines: string[], pattern: RegExp, openChar: string, closeChar: string): LineRange[] {
  const ranges: LineRange[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!pattern.test(lines[i])) continue;

    let depth = 0;
    let foundOpen = false;

    for (let j = i; j < lines.length; j++) {
      for (const ch of lines[j]) {
        if (ch === openChar) {
          depth++;
          foundOpen = true;
        } else if (ch === closeChar) {
          depth--;
          if (foundOpen && depth <= 0) {
            ranges.push({ start: i + 1, end: j + 1 });
            // Jump outer loop past this range
            i = j;
            // Use goto-like break
            depth = -999;
            break;
          }
        }
      }
      if (depth === -999) break;
    }
  }

  return ranges;
}

function isInRanges(line: number, ranges: LineRange[]): boolean {
  return ranges.some(r => line >= r.start && line <= r.end);
}

function extractTriggerValues(content: string): TypeRef[] {
  const results: TypeRef[] = [];
  const lines = content.split('\n');

  // Step 1: Find all triggers: [...] ranges
  const triggerRanges = findBracketRanges(lines, /\btriggers\s*:\s*\[/, '[', ']');
  if (triggerRanges.length === 0) return results;

  // Step 2: Within trigger ranges, find inputSchema: [...] sub-ranges to exclude
  const excludeRanges: LineRange[] = [];
  for (const tr of triggerRanges) {
    for (let i = tr.start - 1; i < tr.end; i++) {
      if (/\binputSchema\s*:\s*\[/.test(lines[i])) {
        // Find the end of this inputSchema array
        let depth = 0;
        let foundOpen = false;
        for (let j = i; j < tr.end; j++) {
          for (const ch of lines[j]) {
            if (ch === '[') { depth++; foundOpen = true; }
            else if (ch === ']') {
              depth--;
              if (foundOpen && depth <= 0) {
                excludeRanges.push({ start: i + 1, end: j + 1 });
                i = j; // skip past
                depth = -999;
                break;
              }
            }
          }
          if (depth === -999) break;
        }
      }
    }
  }

  // Step 3: Extract type:/service: from trigger ranges, excluding inputSchema ranges
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    if (!isInRanges(lineNum, triggerRanges)) continue;
    if (isInRanges(lineNum, excludeRanges)) continue;

    const line = lines[i];

    const typeMatch = line.match(/\btype\s*:\s*['"]([^'"]+)['"]/);
    if (typeMatch) {
      results.push({ key: 'type', value: typeMatch[1], line: lineNum });
    }

    const serviceMatch = line.match(/\bservice\s*:\s*['"]([^'"]+)['"]/);
    if (serviceMatch) {
      results.push({ key: 'service', value: serviceMatch[1], line: lineNum });
    }
  }

  return results;
}

/**
 * Check trigger types in config.ts
 */
export async function checkTriggerTypes(useCasePath: string): Promise<Finding[]> {
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

  const refs = extractTriggerValues(content);

  for (const ref of refs) {
    if (ref.key === 'type') {
      if (!VALID_TRIGGER_TYPES.has(ref.value)) {
        findings.push({
          rule: metadata.id,
          severity: 'must',
          path: configPath,
          message: `Unknown trigger type: "${ref.value}" (line ${ref.line})`,
          raw_details: `Valid trigger types are: ${Array.from(VALID_TRIGGER_TYPES).join(', ')}`,
          line: ref.line,
        });
      }
    } else if (ref.key === 'service') {
      if (!VALID_SERVICE_TYPES.has(ref.value)) {
        findings.push({
          rule: metadata.id,
          severity: 'must',
          path: configPath,
          message: `Unknown service type: "${ref.value}" (line ${ref.line})`,
          raw_details: `Valid service types are: ${Array.from(VALID_SERVICE_TYPES).join(', ')}`,
          line: ref.line,
        });
      }
    }
  }

  return findings;
}
