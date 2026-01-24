/**
 * Tests for PLACEHOLDER-SYNTAX Script
 *
 * Script: Validates that Codika placeholders use the correct suffix format
 */

import { describe, it, expect } from 'vitest';
import { checkPlaceholderSyntax, metadata } from '../../../../src/validation/workflow-scripts/placeholder-syntax.js';
import { expectFindingWithRule } from '../../../helpers/test-utils.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file for fixtures path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

/**
 * Load a fixture file from the local fixtures folder
 */
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_PATH, filename), 'utf-8');
}

describe('PLACEHOLDER-SYNTAX Script', () => {
  const testPath = 'test-workflow.json';

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('PLACEHOLDER-SYNTAX');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });
  });

  describe('valid placeholders', () => {
    it('should PASS for correct ORGSECRET suffix', () => {
      const content = `{{ORGSECRET_API_KEY_TERCESORG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct PROCDATA suffix', () => {
      const content = `{{PROCDATA_PROCESS_ID_ATADCORP}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct USERDATA suffix', () => {
      const content = `{{USERDATA_INSTANCE_UID_ATADRESU}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct MEMSECRT suffix', () => {
      const content = `{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct FLEXCRED suffix', () => {
      const content = `{{FLEXCRED_ANTHROPIC_DERCXELF}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct USERCRED suffix', () => {
      const content = `{{USERCRED_GMAIL_DERCRESU}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct ORGCRED suffix', () => {
      const content = `{{ORGCRED_SLACK_DERCGRO}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct SUBWKFL suffix', () => {
      const content = `{{SUBWKFL_HELPER_WORKFLOW_LFKWBUS}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for correct INSTPARM suffix', () => {
      const content = `{{INSTPARM_COMPANY_NAME_MRAPTSNI}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for multiple correct placeholders', () => {
      const content = `
        {{ORGSECRET_KEY_TERCESORG}}
        {{PROCDATA_ID_ATADCORP}}
        {{INSTPARM_NAME_MRAPTSNI}}
      `;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-placeholder-suffix.json fixture', () => {
      const content = loadFixture('valid-placeholder-suffix.json');
      const findings = checkPlaceholderSyntax(content, 'valid-placeholder-suffix.json');
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid placeholders', () => {
    it('should FAIL for wrong ORGSECRET suffix', () => {
      const content = `{{ORGSECRET_API_KEY_WRONGSUFFIX}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'PLACEHOLDER-SYNTAX');
      expect(finding.message).toContain('_TERCESORG');
    });

    it('should FAIL for wrong PROCDATA suffix', () => {
      const content = `{{PROCDATA_PROCESS_ID_TYPO}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('_ATADCORP');
    });

    it('should FAIL for wrong INSTPARM suffix', () => {
      const content = `{{INSTPARM_NAME_WRONG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('_MRAPTSNI');
    });

    it('should detect multiple invalid placeholders', () => {
      const content = `
        {{ORGSECRET_KEY_WRONG}}
        {{PROCDATA_ID_BAD}}
      `;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(2);
    });

    it('should provide line number in finding', () => {
      const content = `line1
line2
{{ORGSECRET_KEY_WRONG}}
line4`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBe(3);
    });

    it('should FAIL for invalid-placeholder-suffix.json fixture', () => {
      const content = loadFixture('invalid-placeholder-suffix.json');
      const findings = checkPlaceholderSyntax(content, 'invalid-placeholder-suffix.json');

      // The fixture has invalid suffixes
      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'PLACEHOLDER-SYNTAX');
    });
  });

  describe('auto-fix functionality', () => {
    it('should provide a fix function', () => {
      const content = `{{ORGSECRET_API_KEY_WRONG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should correctly fix ORGSECRET suffix', () => {
      const content = `{{ORGSECRET_API_KEY_WRONG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`{{ORGSECRET_API_KEY_TERCESORG}}`);
    });

    it('should correctly fix PROCDATA suffix', () => {
      const content = `{{PROCDATA_PROCESS_ID_TYPO}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`{{PROCDATA_PROCESS_ID_ATADCORP}}`);
    });

    it('should correctly fix INSTPARM suffix', () => {
      const content = `{{INSTPARM_NAME_BAD}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`{{INSTPARM_NAME_MRAPTSNI}}`);
    });

    it('should preserve the rest of the content when fixing', () => {
      const content = `const path = "{{PROCDATA_ID_WRONG}}/execute";`;
      const findings = checkPlaceholderSyntax(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`const path = "{{PROCDATA_ID_ATADCORP}}/execute";`);
    });
  });

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const findings = checkPlaceholderSyntax('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should ignore non-placeholder content', () => {
      const content = `const x = "hello world"; // no placeholders`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle placeholders with numbers in name', () => {
      const content = `{{INSTPARM_MAX_123_ITEMS_MRAPTSNI}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });
});
