/**
 * Script: PLACEHOLDER-SYNTAX
 *
 * Validates Codika placeholder patterns in workflow files.
 *
 * This validator has TWO responsibilities:
 * 1. Validate known placeholders have correct suffixes (MUST severity - errors)
 * 2. Detect unknown/unrecognized placeholders (SHOULD severity - warnings)
 *
 * Known placeholder patterns and their required suffixes:
 * - ORGSECRET_*_TERCESORG  (organization secrets)
 * - PROCDATA_*_ATADCORP    (process data)
 * - USERDATA_*_ATADRESU    (user data)
 * - MEMSECRT_*_TRCESMEM    (member secrets)
 * - FLEXCRED_*_DERCXELF    (flexible credentials)
 * - USERCRED_*_DERCRESU    (user credentials)
 * - ORGCRED_*_DERCGRO      (organization credentials)
 * - INSTCRED_*_DERCTSNI    (instance credentials)
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
  'INSTCRED': 'DERCTSNI',
  'SUBWKFL': 'LFKWBUS',
  'INSTPARM': 'MRAPTSNI',
};

// All valid prefixes
const VALID_PREFIXES = Object.keys(PLACEHOLDER_SUFFIXES);

// Regex to find ALL potential Codika-style placeholders
// Matches: {{UPPERCASE_WITH_UNDERSCORES}} (no spaces, no special chars, no lowercase)
// This catches EVERYTHING that looks like a Codika placeholder
const ALL_UPPERCASE_PLACEHOLDERS = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

// Regex to find known placeholders with their structure
// Matches: {{PREFIX_NAME_SUFFIX}} where PREFIX is one of our known prefixes
const KNOWN_PLACEHOLDER_REGEX = /\{\{(ORGSECRET|PROCDATA|USERDATA|MEMSECRT|FLEXCRED|USERCRED|ORGCRED|INSTCRED|SUBWKFL|INSTPARM)_([A-Z0-9_]+)_([A-Z]+)\}\}/g;

/**
 * Check if a placeholder matches a known valid pattern
 */
function matchesKnownPattern(placeholder: string): { isKnown: boolean; prefix?: string; name?: string; suffix?: string; expectedSuffix?: string } {
  for (const [prefix, expectedSuffix] of Object.entries(PLACEHOLDER_SUFFIXES)) {
    // Check if it starts with this prefix followed by underscore
    if (placeholder.startsWith(prefix + '_')) {
      // Try to extract the structure: PREFIX_NAME_SUFFIX
      const afterPrefix = placeholder.slice(prefix.length + 1);
      const lastUnderscoreIndex = afterPrefix.lastIndexOf('_');

      if (lastUnderscoreIndex > 0) {
        const name = afterPrefix.slice(0, lastUnderscoreIndex);
        const suffix = afterPrefix.slice(lastUnderscoreIndex + 1);

        return {
          isKnown: true,
          prefix,
          name,
          suffix,
          expectedSuffix,
        };
      }
    }
  }

  return { isKnown: false };
}

/**
 * Calculate line number from content and match index
 */
function getLineNumber(content: string, index: number): number {
  return content.substring(0, index).split('\n').length;
}

/**
 * Check for placeholders with incorrect suffixes and unknown placeholders
 */
export function checkPlaceholderSyntax(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Track which positions we've already processed (to avoid duplicates)
  const processedPositions = new Set<number>();

  // First pass: Check known placeholders with wrong suffixes (MUST severity)
  KNOWN_PLACEHOLDER_REGEX.lastIndex = 0;
  let match;

  while ((match = KNOWN_PLACEHOLDER_REGEX.exec(content)) !== null) {
    const fullMatch = match[0];
    const prefix = match[1];
    const name = match[2];
    const actualSuffix = match[3];
    const expectedSuffix = PLACEHOLDER_SUFFIXES[prefix];

    // Mark this position as processed
    processedPositions.add(match.index);

    if (actualSuffix !== expectedSuffix) {
      const lineNumber = getLineNumber(content, match.index);
      const correctPlaceholder = `{{${prefix}_${name}_${expectedSuffix}}}`;

      findings.push({
        rule: metadata.id,
        severity: 'must',
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

  // Second pass: Find ALL uppercase placeholders and check for unknown ones
  ALL_UPPERCASE_PLACEHOLDERS.lastIndex = 0;

  while ((match = ALL_UPPERCASE_PLACEHOLDERS.exec(content)) !== null) {
    // Skip if we already processed this position (known placeholder with valid/invalid suffix)
    if (processedPositions.has(match.index)) {
      continue;
    }

    const fullMatch = match[0];
    const placeholder = match[1]; // The content inside {{ }}

    // Check if this matches a known pattern
    const result = matchesKnownPattern(placeholder);

    if (result.isKnown) {
      // It's a known prefix - we already handled it in first pass if suffix was wrong
      // But if it got here, the suffix is correct, so skip
      continue;
    }

    // This is an UNKNOWN placeholder - report as warning
    const lineNumber = getLineNumber(content, match.index);

    findings.push({
      rule: metadata.id,
      severity: 'should',
      path,
      message: `Unknown placeholder pattern: ${fullMatch}`,
      raw_details: `This doesn't match any known Codika placeholder pattern. Valid prefixes are: ${VALID_PREFIXES.join(', ')}. Each placeholder must follow the pattern: {{PREFIX_NAME_SUFFIX}} with the correct suffix for each prefix.`,
      line: lineNumber,
      fixable: false,
      // No fix for unknown placeholders - we don't know what they should be
    });
  }

  return findings;
}
