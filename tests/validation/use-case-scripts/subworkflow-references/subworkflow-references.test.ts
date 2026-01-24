/**
 * Tests for SUBWKFL-REFERENCES validation script
 *
 * This script validates that all SUBWKFL_ placeholders in workflow files
 * reference existing workflowTemplateId values defined in config.ts
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkSubworkflowReferences, RULE_ID, metadata } from '../../../../src/validation/use-case-scripts/subworkflow-references.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('SUBWKFL-REFERENCES Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('SUBWKFL-REFERENCES');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/placeholder-patterns.md');
    });
  });

  describe('valid use cases', () => {
    it('should PASS when all SUBWKFL_ placeholders reference existing template IDs', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-refs');
      const findings = await checkSubworkflowReferences(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when no SUBWKFL_ placeholders exist', async () => {
      const useCasePath = join(FIXTURES_PATH, 'no-subworkflows');
      const findings = await checkSubworkflowReferences(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use cases', () => {
    it('should FAIL when SUBWKFL_ placeholder references non-existent template ID', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-ref');
      const findings = await checkSubworkflowReferences(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('non-existent-helper'));
      expect(finding).toBeDefined();
      expect(finding?.severity).toBe('must');
      expect(finding?.guideRef).toBeDefined();
    });

    it('should include the workflow file path in the finding', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-ref');
      const findings = await checkSubworkflowReferences(useCasePath);

      const finding = findings[0];
      expect(finding?.path).toContain('main-workflow.json');
    });

    it('should include available template IDs in the fix details', async () => {
      const useCasePath = join(FIXTURES_PATH, 'invalid-missing-ref');
      const findings = await checkSubworkflowReferences(useCasePath);

      const finding = findings[0];
      expect(finding?.raw_details).toContain('main-workflow');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkSubworkflowReferences(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].message.includes('config') || findings[0].message.includes('Cannot')).toBe(true);
    });
  });
});
