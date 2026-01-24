/**
 * Tests for PLACEHOLDER-SYNTAX Script
 *
 * This validator has TWO responsibilities:
 * 1. Validate known placeholders have correct suffixes (MUST severity)
 * 2. Detect unknown/unrecognized placeholders (SHOULD severity - warnings)
 *
 * Known placeholder patterns:
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

  // ============================================================================
  // METADATA TESTS
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('PLACEHOLDER-SYNTAX');
    });

    it('should have "must" severity for the rule itself', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have a description', () => {
      expect(metadata.description).toBeDefined();
      expect(metadata.description.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // VALID KNOWN PLACEHOLDERS - Should all PASS
  // ============================================================================
  describe('valid known placeholders', () => {
    describe('ORGSECRET placeholders', () => {
      it('should PASS for correct ORGSECRET suffix', () => {
        const content = `{{ORGSECRET_API_KEY_TERCESORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for ORGSECRET with multiple underscores in name', () => {
        const content = `{{ORGSECRET_MY_SUPER_SECRET_API_KEY_TERCESORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for ORGSECRET with numbers in name', () => {
        const content = `{{ORGSECRET_API_KEY_V2_TERCESORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for common ORGSECRET: ERROR_WORKFLOW_ID', () => {
        const content = `{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('PROCDATA placeholders', () => {
      it('should PASS for correct PROCDATA suffix', () => {
        const content = `{{PROCDATA_PROCESS_ID_ATADCORP}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for PROCDATA with complex name', () => {
        const content = `{{PROCDATA_MY_PROCESS_INSTANCE_123_ATADCORP}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('USERDATA placeholders', () => {
      it('should PASS for correct USERDATA suffix', () => {
        const content = `{{USERDATA_INSTANCE_UID_ATADRESU}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for common USERDATA: PROCESS_INSTANCE_UID', () => {
        const content = `{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('MEMSECRT placeholders', () => {
      it('should PASS for correct MEMSECRT suffix', () => {
        const content = `{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for MEMSECRT with complex name', () => {
        const content = `{{MEMSECRT_USER_API_TOKEN_TRCESMEM}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('FLEXCRED placeholders', () => {
      it('should PASS for correct FLEXCRED suffix', () => {
        const content = `{{FLEXCRED_ANTHROPIC_DERCXELF}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for FLEXCRED with service name', () => {
        const content = `{{FLEXCRED_OPENAI_API_DERCXELF}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('USERCRED placeholders', () => {
      it('should PASS for correct USERCRED suffix', () => {
        const content = `{{USERCRED_GMAIL_DERCRESU}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for USERCRED with service name', () => {
        const content = `{{USERCRED_GOOGLE_DRIVE_OAUTH_DERCRESU}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('ORGCRED placeholders', () => {
      it('should PASS for correct ORGCRED suffix', () => {
        const content = `{{ORGCRED_SLACK_DERCGRO}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for ORGCRED with service name', () => {
        const content = `{{ORGCRED_HUBSPOT_API_DERCGRO}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('SUBWKFL placeholders', () => {
      it('should PASS for correct SUBWKFL suffix', () => {
        const content = `{{SUBWKFL_HELPER_WORKFLOW_LFKWBUS}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for SUBWKFL with template ID', () => {
        const content = `{{SUBWKFL_PROCESS_DOCUMENT_LFKWBUS}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('INSTPARM placeholders', () => {
      it('should PASS for correct INSTPARM suffix', () => {
        const content = `{{INSTPARM_COMPANY_NAME_MRAPTSNI}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for INSTPARM with numbers', () => {
        const content = `{{INSTPARM_MAX_123_ITEMS_MRAPTSNI}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for INSTPARM with multiple parts', () => {
        const content = `{{INSTPARM_USER_FIRST_NAME_MRAPTSNI}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('multiple valid placeholders', () => {
      it('should PASS for multiple correct placeholders in same content', () => {
        const content = `
          {{ORGSECRET_KEY_TERCESORG}}
          {{PROCDATA_ID_ATADCORP}}
          {{INSTPARM_NAME_MRAPTSNI}}
        `;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should PASS for all placeholder types together', () => {
        const content = `
          {{ORGSECRET_API_KEY_TERCESORG}}
          {{PROCDATA_PROCESS_ID_ATADCORP}}
          {{USERDATA_USER_ID_ATADRESU}}
          {{MEMSECRT_AUTH_TOKEN_TRCESMEM}}
          {{FLEXCRED_ANTHROPIC_DERCXELF}}
          {{USERCRED_GMAIL_DERCRESU}}
          {{ORGCRED_SLACK_DERCGRO}}
          {{SUBWKFL_HELPER_LFKWBUS}}
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
  });

  // ============================================================================
  // INVALID SUFFIX - Known prefix with wrong suffix (MUST severity)
  // ============================================================================
  describe('invalid suffix on known placeholders (MUST severity)', () => {
    describe('ORGSECRET with wrong suffix', () => {
      it('should FAIL for wrong ORGSECRET suffix', () => {
        const content = `{{ORGSECRET_API_KEY_WRONGSUFFIX}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        const finding = expectFindingWithRule(findings, 'PLACEHOLDER-SYNTAX');
        expect(finding.severity).toBe('must');
        expect(finding.message).toContain('TERCESORG');
      });

      it('should FAIL for typo in ORGSECRET suffix: TERCSORG', () => {
        const content = `{{ORGSECRET_API_KEY_TERCSORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('must');
      });

      it('should FAIL for reversed ORGSECRET suffix: GROESCRET', () => {
        const content = `{{ORGSECRET_API_KEY_GROESCRET}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
      });
    });

    describe('PROCDATA with wrong suffix', () => {
      it('should FAIL for wrong PROCDATA suffix', () => {
        const content = `{{PROCDATA_PROCESS_ID_TYPO}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('must');
        expect(findings[0].message).toContain('ATADCORP');
      });

      it('should FAIL for typo in PROCDATA suffix: ATADCOR', () => {
        const content = `{{PROCDATA_ID_ATADCOR}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
      });
    });

    describe('USERDATA with wrong suffix', () => {
      it('should FAIL for wrong USERDATA suffix', () => {
        const content = `{{USERDATA_UID_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('ATADRESU');
      });
    });

    describe('MEMSECRT with wrong suffix', () => {
      it('should FAIL for wrong MEMSECRT suffix', () => {
        const content = `{{MEMSECRT_AUTH_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('TRCESMEM');
      });
    });

    describe('FLEXCRED with wrong suffix', () => {
      it('should FAIL for wrong FLEXCRED suffix', () => {
        const content = `{{FLEXCRED_API_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('DERCXELF');
      });
    });

    describe('USERCRED with wrong suffix', () => {
      it('should FAIL for wrong USERCRED suffix', () => {
        const content = `{{USERCRED_GMAIL_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('DERCRESU');
      });
    });

    describe('ORGCRED with wrong suffix', () => {
      it('should FAIL for wrong ORGCRED suffix', () => {
        const content = `{{ORGCRED_SLACK_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('DERCGRO');
      });
    });

    describe('SUBWKFL with wrong suffix', () => {
      it('should FAIL for wrong SUBWKFL suffix', () => {
        const content = `{{SUBWKFL_HELPER_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('LFKWBUS');
      });
    });

    describe('INSTPARM with wrong suffix', () => {
      it('should FAIL for wrong INSTPARM suffix', () => {
        const content = `{{INSTPARM_NAME_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain('MRAPTSNI');
      });

      it('should FAIL for typo in INSTPARM suffix: MRAPTENI', () => {
        const content = `{{INSTPARM_NAME_MRAPTENI}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
      });
    });

    describe('multiple invalid suffixes', () => {
      it('should detect multiple invalid placeholders', () => {
        const content = `
          {{ORGSECRET_KEY_WRONG}}
          {{PROCDATA_ID_BAD}}
          {{INSTPARM_NAME_TYPO}}
        `;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(3);
        findings.forEach(f => expect(f.severity).toBe('must'));
      });

      it('should FAIL for invalid-placeholder-suffix.json fixture', () => {
        const content = loadFixture('invalid-placeholder-suffix.json');
        const findings = checkPlaceholderSyntax(content, 'invalid-placeholder-suffix.json');

        expect(findings.length).toBeGreaterThan(0);
        expectFindingWithRule(findings, 'PLACEHOLDER-SYNTAX');
      });
    });
  });

  // ============================================================================
  // UNKNOWN PLACEHOLDERS - Pattern looks like placeholder but not recognized
  // These should be WARNINGS (should severity)
  // ============================================================================
  describe('unknown/unrecognized placeholders (SHOULD severity - warnings)', () => {
    describe('typos in prefix', () => {
      it('should WARN for typo: ORGSCRET (missing E)', () => {
        const content = `{{ORGSCRET_API_KEY_TERCESORG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
        expect(findings[0].message).toContain('Unknown');
      });

      it('should WARN for typo: PROCDTA (missing A)', () => {
        const content = `{{PROCDTA_ID_ATADCORP}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for typo: USREDATA (swapped letters)', () => {
        const content = `{{USREDATA_UID_ATADRESU}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for typo: INSPTARM (swapped letters)', () => {
        const content = `{{INSPTARM_NAME_MRAPTSNI}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });
    });

    describe('completely unknown patterns', () => {
      it('should WARN for completely made-up placeholder: MYVAR', () => {
        const content = `{{MYVAR_SOMETHING_VALUE}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
        expect(findings[0].message).toContain('Unknown');
      });

      it('should WARN for made-up placeholder: CONFIG', () => {
        const content = `{{CONFIG_DATABASE_URL}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for made-up placeholder: CUSTOM', () => {
        const content = `{{CUSTOM_FIELD_NAME}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for made-up placeholder: ENV', () => {
        const content = `{{ENV_PRODUCTION_KEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for made-up placeholder: SECRET (without ORG prefix)', () => {
        const content = `{{SECRET_API_KEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for made-up placeholder: WORKFLOW (different from SUBWKFL)', () => {
        const content = `{{WORKFLOW_HELPER_ID}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });
    });

    describe('similar but not exact patterns', () => {
      it('should WARN for ORG_SECRET (with underscore)', () => {
        const content = `{{ORG_SECRET_API_KEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for PROC_DATA (with underscore)', () => {
        const content = `{{PROC_DATA_ID}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for USER_DATA (with underscore)', () => {
        const content = `{{USER_DATA_ID}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for INST_PARM (with underscore)', () => {
        const content = `{{INST_PARM_NAME}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });
    });

    describe('placeholders without proper suffix structure', () => {
      it('should WARN for placeholder without suffix: {{ORGSECRET_KEY}}', () => {
        const content = `{{ORGSECRET_KEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        // This should be caught as unknown (doesn't match PREFIX_NAME_SUFFIX pattern)
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for single-part placeholder: {{APIKEY}}', () => {
        const content = `{{APIKEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });

      it('should WARN for two-part placeholder: {{API_KEY}}', () => {
        const content = `{{API_KEY}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('should');
      });
    });

    describe('multiple unknown placeholders', () => {
      it('should WARN for multiple unknown placeholders', () => {
        const content = `
          {{MYVAR_ONE}}
          {{CUSTOM_TWO}}
          {{RANDOM_THREE}}
        `;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(3);
        findings.forEach(f => expect(f.severity).toBe('should'));
      });

      it('should handle mix of valid, invalid suffix, and unknown', () => {
        const content = `
          {{ORGSECRET_VALID_TERCESORG}}
          {{PROCDATA_INVALID_WRONG}}
          {{UNKNOWN_PLACEHOLDER}}
        `;
        const findings = checkPlaceholderSyntax(content, testPath);

        // Should have 2 findings: 1 must (invalid suffix), 1 should (unknown)
        expect(findings).toHaveLength(2);

        const mustFindings = findings.filter(f => f.severity === 'must');
        const shouldFindings = findings.filter(f => f.severity === 'should');

        expect(mustFindings).toHaveLength(1);
        expect(shouldFindings).toHaveLength(1);
      });
    });
  });

  // ============================================================================
  // SHOULD NOT MATCH - Things that look like templates but aren't Codika placeholders
  // ============================================================================
  describe('should NOT flag (non-Codika patterns)', () => {
    describe('n8n expressions', () => {
      it('should IGNORE n8n expression: {{ $json.field }}', () => {
        const content = `{{ $json.field }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ $item.json.name }}', () => {
        const content = `{{ $item.json.name }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ $now }}', () => {
        const content = `{{ $now }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ $today }}', () => {
        const content = `{{ $today }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ $node["Name"].json }}', () => {
        const content = `{{ $node["Name"].json }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ $input.first().json }}', () => {
        const content = `{{ $input.first().json }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression: {{ Math.random() }}', () => {
        const content = `{{ Math.random() }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE n8n expression with newlines', () => {
        const content = `{{
          $json.items.map(item => item.name).join(', ')
        }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('lowercase patterns', () => {
      it('should IGNORE lowercase pattern: {{lowercase_name}}', () => {
        const content = `{{lowercase_name}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE mixed case: {{mixedCase_Name}}', () => {
        const content = `{{mixedCase_Name}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE camelCase: {{camelCaseName}}', () => {
        const content = `{{camelCaseName}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('patterns with special characters', () => {
      it('should IGNORE pattern with dot: {{config.value}}', () => {
        const content = `{{config.value}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE pattern with dash: {{my-variable}}', () => {
        const content = `{{my-variable}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE pattern with brackets: {{items[0]}}', () => {
        const content = `{{items[0]}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE pattern with spaces: {{ SPACED }}', () => {
        const content = `{{ SPACED }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('other template syntaxes', () => {
      it('should IGNORE Jinja2-style: {% if condition %}', () => {
        const content = `{% if condition %}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE triple braces: {{{unescaped}}}', () => {
        const content = `{{{unescaped}}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE single braces: {single}', () => {
        const content = `{single}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });

    describe('empty and whitespace', () => {
      it('should IGNORE empty braces: {{}}', () => {
        const content = `{{}}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });

      it('should IGNORE whitespace only: {{   }}', () => {
        const content = `{{   }}`;
        const findings = checkPlaceholderSyntax(content, testPath);
        expect(findings).toHaveLength(0);
      });
    });
  });

  // ============================================================================
  // AUTO-FIX FUNCTIONALITY
  // ============================================================================
  describe('auto-fix functionality', () => {
    describe('fix function presence', () => {
      it('should provide a fix function for invalid suffix errors', () => {
        const content = `{{ORGSECRET_API_KEY_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        expect(findings[0].fixable).toBe(true);
        expect(findings[0].fix).toBeDefined();
      });

      it('should NOT provide a fix function for unknown placeholders', () => {
        const content = `{{UNKNOWN_PLACEHOLDER}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1);
        // Unknown placeholders can't be auto-fixed (we don't know what they should be)
        expect(findings[0].fixable).toBeFalsy();
      });
    });

    describe('fix application', () => {
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

      it('should correctly fix USERDATA suffix', () => {
        const content = `{{USERDATA_UID_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{USERDATA_UID_ATADRESU}}`);
      });

      it('should correctly fix MEMSECRT suffix', () => {
        const content = `{{MEMSECRT_AUTH_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{MEMSECRT_AUTH_TRCESMEM}}`);
      });

      it('should correctly fix FLEXCRED suffix', () => {
        const content = `{{FLEXCRED_API_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{FLEXCRED_API_DERCXELF}}`);
      });

      it('should correctly fix USERCRED suffix', () => {
        const content = `{{USERCRED_GMAIL_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{USERCRED_GMAIL_DERCRESU}}`);
      });

      it('should correctly fix ORGCRED suffix', () => {
        const content = `{{ORGCRED_SLACK_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{ORGCRED_SLACK_DERCGRO}}`);
      });

      it('should correctly fix SUBWKFL suffix', () => {
        const content = `{{SUBWKFL_HELPER_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{SUBWKFL_HELPER_LFKWBUS}}`);
      });

      it('should correctly fix INSTPARM suffix', () => {
        const content = `{{INSTPARM_NAME_BAD}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{INSTPARM_NAME_MRAPTSNI}}`);
      });
    });

    describe('fix preserves context', () => {
      it('should preserve the rest of the content when fixing', () => {
        const content = `const path = "{{PROCDATA_ID_WRONG}}/execute";`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`const path = "{{PROCDATA_ID_ATADCORP}}/execute";`);
      });

      it('should preserve JSON structure when fixing', () => {
        const content = `{
  "webhookPath": "{{PROCDATA_ID_WRONG}}/callback"
}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toContain('{{PROCDATA_ID_ATADCORP}}');
        expect(fixed).toContain('"webhookPath"');
      });

      it('should fix one placeholder without affecting others', () => {
        const content = `{{ORGSECRET_KEY_TERCESORG}} and {{PROCDATA_ID_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings).toHaveLength(1); // Only PROCDATA is wrong
        const fixed = findings[0].fix?.apply(content);
        expect(fixed).toBe(`{{ORGSECRET_KEY_TERCESORG}} and {{PROCDATA_ID_ATADCORP}}`);
      });
    });
  });

  // ============================================================================
  // LINE NUMBER REPORTING
  // ============================================================================
  describe('line number reporting', () => {
    it('should report line 1 for placeholder on first line', () => {
      const content = `{{ORGSECRET_KEY_WRONG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings[0].line).toBe(1);
    });

    it('should report correct line number for placeholder on line 3', () => {
      const content = `line1
line2
{{ORGSECRET_KEY_WRONG}}
line4`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings[0].line).toBe(3);
    });

    it('should report correct line numbers for multiple findings', () => {
      const content = `{{ORGSECRET_KEY_WRONG}}
line2
{{PROCDATA_ID_BAD}}
line4
{{INSTPARM_NAME_TYPO}}`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings).toHaveLength(3);
      expect(findings[0].line).toBe(1);
      expect(findings[1].line).toBe(3);
      expect(findings[2].line).toBe(5);
    });

    it('should report line number for unknown placeholders too', () => {
      const content = `line1
line2
{{UNKNOWN_VAR}}
line4`;
      const findings = checkPlaceholderSyntax(content, testPath);

      expect(findings[0].line).toBe(3);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    describe('invalid suffix messages', () => {
      it('should include the actual placeholder in the message', () => {
        const content = `{{ORGSECRET_MY_KEY_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings[0].message).toContain('ORGSECRET_MY_KEY_WRONG');
      });

      it('should include the expected suffix in the message', () => {
        const content = `{{ORGSECRET_MY_KEY_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings[0].message).toContain('TERCESORG');
      });

      it('should include fix suggestion in raw_details', () => {
        const content = `{{ORGSECRET_MY_KEY_WRONG}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings[0].raw_details).toContain('ORGSECRET_MY_KEY_TERCESORG');
      });
    });

    describe('unknown placeholder messages', () => {
      it('should clearly indicate the placeholder is unknown', () => {
        const content = `{{MYVAR_SOMETHING}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings[0].message.toLowerCase()).toContain('unknown');
      });

      it('should include the unknown placeholder in the message', () => {
        const content = `{{MYVAR_SOMETHING}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        expect(findings[0].message).toContain('MYVAR_SOMETHING');
      });

      it('should suggest valid prefixes in raw_details', () => {
        const content = `{{MYVAR_SOMETHING}}`;
        const findings = checkPlaceholderSyntax(content, testPath);

        // Should mention some valid prefixes as suggestions
        expect(findings[0].raw_details).toMatch(/ORGSECRET|PROCDATA|INSTPARM/);
      });
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle empty content', () => {
      const findings = checkPlaceholderSyntax('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle content with no placeholders', () => {
      const content = `const x = "hello world"; // no placeholders here`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle very long placeholder names', () => {
      const content = `{{ORGSECRET_THIS_IS_A_VERY_LONG_SECRET_NAME_WITH_MANY_PARTS_TERCESORG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle placeholder at start of line', () => {
      const content = `{{ORGSECRET_KEY_WRONG}} some text after`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should handle placeholder at end of line', () => {
      const content = `some text before {{ORGSECRET_KEY_WRONG}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should handle multiple placeholders on same line', () => {
      const content = `{{ORGSECRET_A_WRONG}} and {{PROCDATA_B_BAD}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(2);
    });

    it('should handle placeholder in JSON string value', () => {
      const content = `{"key": "{{ORGSECRET_VALUE_WRONG}}"}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should handle placeholder in nested JSON', () => {
      const content = `{
        "level1": {
          "level2": {
            "value": "{{ORGSECRET_DEEP_WRONG}}"
          }
        }
      }`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should handle consecutive placeholders without separator', () => {
      const content = `{{ORGSECRET_A_TERCESORG}}{{PROCDATA_B_ATADCORP}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle placeholder with only numbers in name', () => {
      const content = `{{INSTPARM_12345_MRAPTSNI}}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle minified JSON (single line)', () => {
      const content = `{"a":"{{ORGSECRET_X_WRONG}}","b":"{{PROCDATA_Y_BAD}}"}`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(2);
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIOS
  // ============================================================================
  describe('real-world workflow scenarios', () => {
    it('should validate typical webhook path pattern', () => {
      const content = `"path": "{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/callback"`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical credential reference', () => {
      const content = `"credentials": { "id": "{{FLEXCRED_ANTHROPIC_DERCXELF}}" }`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical error workflow setting', () => {
      const content = `"errorWorkflow": "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should validate typical subworkflow reference', () => {
      const content = `"workflowId": "{{SUBWKFL_PROCESS_DOCUMENT_LFKWBUS}}"`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should catch common mistake: wrong error workflow suffix', () => {
      const content = `"errorWorkflow": "{{ORGSECRET_ERROR_WORKFLOW_ID_ORGSECRET}}"`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('must');
    });

    it('should catch common mistake: INSTPARM with wrong suffix', () => {
      const content = `"value": "={{$json.input}} {{INSTPARM_USER_NAME_INSTPARM}}"`;
      const findings = checkPlaceholderSyntax(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].severity).toBe('must');
    });
  });
});
