/**
 * Tests for INSTPARM-QUOTE Script
 *
 * Script: Detects quoted INSTPARM placeholders that should not be quoted
 */

import { describe, it, expect } from 'vitest';
import { checkInstparmQuoting, metadata } from '../../../../src/validation/workflow-scripts/instparm-quoting.js';
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

describe('INSTPARM-QUOTE Script', () => {
  const testPath = 'test-workflow.json';

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('INSTPARM-QUOTE');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });
  });

  describe('valid content', () => {
    it('should PASS when INSTPARM is not quoted', () => {
      const content = `
        const maxItems = {{INSTPARM_MAX_ITEMS_MRAPTSNI}};
        const name = {{INSTPARM_COMPANY_NAME_MRAPTSNI}};
      `;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when no INSTPARM placeholders exist', () => {
      const content = `
        const x = 42;
        const name = "hello";
      `;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for other placeholder types', () => {
      const content = `
        const secret = '{{ORGSECRET_API_KEY_TERCESORG}}';
      `;
      const findings = checkInstparmQuoting(content, testPath);

      // ORGSECRET is not INSTPARM, so this should pass
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-instparm.json fixture', () => {
      const content = loadFixture('valid-instparm.json');
      const findings = checkInstparmQuoting(content, 'valid-instparm.json');

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid content', () => {
    it('should FAIL when INSTPARM is single-quoted', () => {
      const content = `const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';`;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'INSTPARM-QUOTE');
      expect(finding.severity).toBe('must');
      expect(finding.message).toContain('should not be quoted');
    });

    it('should FAIL when INSTPARM is double-quoted', () => {
      const content = `const name = "{{INSTPARM_COMPANY_NAME_MRAPTSNI}}";`;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'INSTPARM-QUOTE');
    });

    it('should detect multiple quoted INSTPARM placeholders', () => {
      const content = `
        const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';
        const max = "{{INSTPARM_MAX_ITEMS_MRAPTSNI}}";
      `;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(2);
    });

    it('should provide line number in finding', () => {
      const content = `line1
line2
const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';
line4`;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBe(3);
    });

    it('should FAIL for quoted-instparm.json fixture', () => {
      const content = loadFixture('quoted-instparm.json');
      const findings = checkInstparmQuoting(content, 'quoted-instparm.json');

      // The fixture has a quoted INSTPARM in the jsCode
      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'INSTPARM-QUOTE');
    });
  });

  describe('auto-fix functionality', () => {
    it('should provide a fix function', () => {
      const content = `const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';`;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
      expect(findings[0].fix?.description).toContain('Remove quotes');
    });

    it('should correctly remove single quotes when fix is applied', () => {
      const content = `const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';`;
      const findings = checkInstparmQuoting(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`const name = {{INSTPARM_COMPANY_NAME_MRAPTSNI}};`);
    });

    it('should correctly remove double quotes when fix is applied', () => {
      const content = `const name = "{{INSTPARM_COMPANY_NAME_MRAPTSNI}}";`;
      const findings = checkInstparmQuoting(content, testPath);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toBe(`const name = {{INSTPARM_COMPANY_NAME_MRAPTSNI}};`);
    });

    it('should handle multiple fixes independently', () => {
      const content = `const a = '{{INSTPARM_A_MRAPTSNI}}'; const b = '{{INSTPARM_B_MRAPTSNI}}';`;
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(2);

      // Apply first fix
      let result = findings[0].fix?.apply(content);
      expect(result).toContain('{{INSTPARM_A_MRAPTSNI}}');

      // Apply second fix
      result = findings[1].fix?.apply(result!);
      expect(result).not.toContain("'{{INSTPARM");
    });
  });

  describe('JSON workflow content', () => {
    it('should detect quoted INSTPARM in JSON workflow', () => {
      const content = JSON.stringify({
        nodes: [
          {
            parameters: {
              jsCode: "const name = '{{INSTPARM_COMPANY_NAME_MRAPTSNI}}';",
            },
          },
        ],
      });
      const findings = checkInstparmQuoting(content, testPath);

      expect(findings).toHaveLength(1);
    });
  });
});
