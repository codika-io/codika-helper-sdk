/**
 * Script: PLACEHOLDER-SYNTAX
 *
 * Validates that Codika placeholders use the correct suffix format.
 *
 * Placeholder types and their required suffixes:
 * - ORGSECRET_*_TERCESORG  (organization secrets)
 * - PROCDATA_*_ATADCORP    (process data)
 * - USERDATA_*_ATADRESU    (user data)
 * - MEMSECRT_*_TRCESMEM    (member secrets)
 * - FLEXCRED_*_DERCXELF    (flexible credentials)
 * - USERCRED_*_DERCRESU    (user credentials)
 * - ORGCRED_*_DERCGRO      (organization credentials)
 * - SUBWKFL_*_LFKWBUS      (subworkflow references)
 * - INSTPARM_*_MRAPTSNI    (instance parameters)
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'PLACEHOLDER-SYNTAX',
  name: 'placeholder_syntax',
  severity: 'must',
  description: 'Placeholders must use correct suffix format',
  details: 'Each placeholder type has a specific required suffix. Check the placeholder documentation for correct formats.',
  fixable: true,
  category: 'placeholder',
};

// Placeholder prefix to expected suffix mapping
const PLACEHOLDER_SUFFIXES: Record<string, string> = {
  'ORGSECRET': 'TERCESORG',
  'PROCDATA': 'ATADCORP',
  'USERDATA': 'ATADRESU',
  'MEMSECRT': 'TRCESMEM',
  'FLEXCRED': 'DERCXELF',
  'USERCRED': 'DERCRESU',
  'ORGCRED': 'DERCGRO',
  'SUBWKFL': 'LFKWBUS',
  'INSTPARM': 'MRAPTSNI',
};

// Regex to find all placeholders
// Matches: {{PREFIX_NAME_SUFFIX}} where PREFIX is one of our known prefixes
const PLACEHOLDER_REGEX = /\{\{(ORGSECRET|PROCDATA|USERDATA|MEMSECRT|FLEXCRED|USERCRED|ORGCRED|SUBWKFL|INSTPARM)_([A-Z0-9_]+)_([A-Z]+)\}\}/g;

/**
 * Check for placeholders with incorrect suffixes
 */
export function checkPlaceholderSyntax(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Reset regex state
  PLACEHOLDER_REGEX.lastIndex = 0;

  let match;
  while ((match = PLACEHOLDER_REGEX.exec(content)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    const actualSuffix = match[3];
    const expectedSuffix = PLACEHOLDER_SUFFIXES[prefix];

    if (actualSuffix !== expectedSuffix) {
      // Calculate line number
      const lineNumber = content.substring(0, match.index).split('\n').length;

      // Build the correct placeholder
      const correctPlaceholder = `{{${prefix}_${name}_${expectedSuffix}}}`;

      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Invalid placeholder suffix: ${fullMatch} should end with _${expectedSuffix}`,
        raw_details: `Replace ${fullMatch} with ${correctPlaceholder}`,
        line: lineNumber,
        fixable: true,
        fix: {
          description: `Fix suffix: ${fullMatch} -> ${correctPlaceholder}`,
          apply: (fileContent: string) => {
            return fileContent.replace(fullMatch, correctPlaceholder);
          },
        },
      });
    }
  }

  return findings;
}
