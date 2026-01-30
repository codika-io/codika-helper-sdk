/**
 * Tests for CALLEDBY-CONSISTENCY validation script
 *
 * This script validates that all workflow callers are correctly listed
 * in subworkflow calledBy arrays in config.ts
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import {
  checkCalledByConsistency,
  RULE_ID,
  metadata,
} from '../../../../src/validation/use-case-scripts/calledby-consistency.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

describe('CALLEDBY-CONSISTENCY Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('CALLEDBY-CONSISTENCY');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should be fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/sub-workflows.md');
      expect(metadata.guideRef?.section).toBe('calledBy Array');
    });
  });

  describe('valid use cases', () => {
    it('should PASS when all callers are listed in calledBy', async () => {
      const useCasePath = join(FIXTURES_PATH, 'valid-calledby');
      const findings = await checkCalledByConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when no subworkflows exist', async () => {
      const useCasePath = join(FIXTURES_PATH, 'no-subworkflows');
      const findings = await checkCalledByConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid use cases', () => {
    it('should FAIL when caller is missing from calledBy array', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-caller');
      const findings = await checkCalledByConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('main'));
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('sub-helper');
      expect(finding?.message).toContain('main');
      expect(finding?.message).toContain('is not listed');
      expect(finding?.severity).toBe('should');
    });

    it('should FAIL when calledBy field is missing entirely', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-calledby-field');
      const findings = await checkCalledByConsistency(useCasePath);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('no calledBy field'));
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('sub-helper');
      expect(finding?.severity).toBe('should');
    });

    it('should report multiple missing callers for the same subworkflow', async () => {
      const useCasePath = join(FIXTURES_PATH, 'multiple-callers');
      const findings = await checkCalledByConsistency(useCasePath);

      // workflow-b is calling shared-tool but is not in calledBy (only workflow-a is)
      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('workflow-b'));
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('shared-tool');
    });

    it('should report correct path (config.ts) in the finding', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-caller');
      const findings = await checkCalledByConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.path).toContain('config.ts');
    });

    it('should include guideRef in findings', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-caller');
      const findings = await checkCalledByConsistency(useCasePath);

      const finding = findings[0];
      expect(finding?.guideRef).toBeDefined();
      expect(finding?.guideRef?.path).toBe('specific/sub-workflows.md');
    });
  });

  describe('fix function', () => {
    it('should include a fix function for missing caller', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-caller');
      const findings = await checkCalledByConsistency(useCasePath);

      const finding = findings.find(f => f.message.includes('main'));
      expect(finding).toBeDefined();
      expect(finding?.fixable).toBe(true);
      expect(finding?.fix).toBeDefined();
      expect(finding?.fix?.description).toContain('main');
    });

    it('should add missing caller to existing calledBy array', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-caller');
      const findings = await checkCalledByConsistency(useCasePath);

      const finding = findings.find(f => f.message.includes('main'));
      expect(finding?.fix).toBeDefined();

      // Read the original config content
      const configPath = join(useCasePath, 'config.ts');
      const originalContent = readFileSync(configPath, 'utf-8');

      // Apply the fix
      const fixedContent = finding!.fix!.apply(originalContent);

      // Verify the fix added 'main' to the calledBy array
      expect(fixedContent).toContain("calledBy: ['other-workflow', 'main']");
    });

    it('should include a fix function for missing calledBy field', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-calledby-field');
      const findings = await checkCalledByConsistency(useCasePath);

      const finding = findings.find(f => f.message.includes('no calledBy field'));
      expect(finding).toBeDefined();
      expect(finding?.fixable).toBe(true);
      expect(finding?.fix).toBeDefined();
      expect(finding?.fix?.description).toContain('calledBy field');
    });
  });

  describe('edge cases', () => {
    it('should handle non-existent use-case path gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'does-not-exist');
      const findings = await checkCalledByConsistency(useCasePath);

      // Should return empty findings (other rules handle missing config.ts)
      expect(findings).toHaveLength(0);
    });

    it('should not report findings for subworkflows without trigger config', async () => {
      // If a workflow calls something that's not configured as a subworkflow trigger,
      // this rule should not report it (SUBWKFL-REFERENCES handles that case)
      const useCasePath = join(FIXTURES_PATH, 'valid-calledby');
      const findings = await checkCalledByConsistency(useCasePath);

      expect(findings).toHaveLength(0);
    });
  });
});
