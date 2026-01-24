/**
 * Script: INSTPARM-QUOTE
 *
 * Checks that INSTPARM placeholders are not incorrectly quoted.
 *
 * CORRECT:   const x = {{INSTPARM_NAME_MRAPTSNI}};
 * INCORRECT: const x = '{{INSTPARM_NAME_MRAPTSNI}}';
 *
 * When INSTPARM placeholders are quoted, they become string literals
 * instead of being replaced with the actual value at runtime.
 *
 * This script provides auto-fix capability to remove the quotes.
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'INSTPARM-QUOTE',
  name: 'instparm_quoting',
  severity: 'must',
  description: 'INSTPARM placeholders should not be wrapped in quotes',
  details: 'Remove quotes around INSTPARM placeholders so they are properly replaced at runtime',
  fixable: true,
  category: 'placeholder',
};

// Regex to find quoted INSTPARM placeholders
// Matches: '{{INSTPARM_..._MRAPTSNI}}' or "{{INSTPARM_..._MRAPTSNI}}"
const QUOTED_INSTPARM_REGEX = /(['"])(\{\{INSTPARM_[A-Z0-9_]+_MRAPTSNI\}\})\1/g;

/**
 * Check for incorrectly quoted INSTPARM placeholders
 */
export function checkInstparmQuoting(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Reset regex state
  QUOTED_INSTPARM_REGEX.lastIndex = 0;

  let match;
  while ((match = QUOTED_INSTPARM_REGEX.exec(content)) !== null) {
    const quote = match[1];
    const placeholder = match[2];
    const fullMatch = match[0];

    // Calculate line number
    const lineNumber = content.substring(0, match.index).split('\n').length;

    findings.push({
      rule: metadata.id,
      severity: metadata.severity,
      path,
      message: `INSTPARM placeholder should not be quoted: ${fullMatch}`,
      raw_details: `Remove the ${quote} quotes around ${placeholder}. Quoted placeholders become string literals instead of being replaced with values.`,
      line: lineNumber,
      fixable: true,
      fix: {
        description: `Remove quotes around ${placeholder}`,
        apply: (fileContent: string) => {
          // Replace this specific quoted placeholder with unquoted version
          return fileContent.replace(fullMatch, placeholder);
        },
      },
    });
  }

  return findings;
}
