/**
 * Tests for WORKFLOW-SETTINGS validation script
 *
 * This script validates that workflows have required settings:
 * - settings.executionOrder: "v1"
 * - settings.errorWorkflow: "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkWorkflowSettings, RULE_ID, metadata } from '../../../../src/validation/workflow-scripts/workflow-settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_PATH, name), 'utf-8');
}

describe('WORKFLOW-SETTINGS Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('WORKFLOW-SETTINGS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('use-case-guide.md');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when workflow has all required settings', () => {
      const content = loadFixture('valid-all-settings.json');
      const findings = checkWorkflowSettings(content, 'valid-all-settings.json');

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows - missing settings', () => {
    it('should FAIL when settings object is missing entirely', () => {
      const content = loadFixture('missing-settings.json');
      const findings = checkWorkflowSettings(content, 'missing-settings.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings.some(f => f.message.includes('settings'))).toBe(true);
    });

    it('should FAIL when errorWorkflow is missing', () => {
      const content = loadFixture('missing-error-workflow.json');
      const findings = checkWorkflowSettings(content, 'missing-error-workflow.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const errorWorkflowFinding = findings.find(f => f.message.includes('errorWorkflow'));
      expect(errorWorkflowFinding).toBeDefined();
      expect(errorWorkflowFinding?.severity).toBe('must');
      expect(errorWorkflowFinding?.guideRef).toBeDefined();
    });

    it('should FAIL when executionOrder is missing', () => {
      const content = loadFixture('missing-execution-order.json');
      const findings = checkWorkflowSettings(content, 'missing-execution-order.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const execOrderFinding = findings.find(f => f.message.includes('executionOrder'));
      expect(execOrderFinding).toBeDefined();
      expect(execOrderFinding?.severity).toBe('must');
    });
  });

  describe('invalid workflows - wrong values', () => {
    it('should FAIL when errorWorkflow has hardcoded value instead of placeholder', () => {
      const content = loadFixture('wrong-error-workflow.json');
      const findings = checkWorkflowSettings(content, 'wrong-error-workflow.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const finding = findings.find(f => f.message.includes('errorWorkflow'));
      expect(finding).toBeDefined();
      expect(finding?.message).toContain('placeholder');
    });
  });

  describe('auto-fix functionality', () => {
    it('should provide a fix function for missing settings', () => {
      const content = loadFixture('missing-settings.json');
      const findings = checkWorkflowSettings(content, 'missing-settings.json');

      const fixableFinding = findings.find(f => f.fixable);
      expect(fixableFinding).toBeDefined();
      expect(fixableFinding?.fix).toBeDefined();
    });

    it('should correctly add missing errorWorkflow when fix is applied', () => {
      const content = loadFixture('missing-error-workflow.json');
      const findings = checkWorkflowSettings(content, 'missing-error-workflow.json');

      const fixableFinding = findings.find(f => f.message.includes('errorWorkflow') && f.fixable);
      expect(fixableFinding?.fix).toBeDefined();

      if (fixableFinding?.fix) {
        const fixedContent = fixableFinding.fix.apply(content);
        const fixedWorkflow = JSON.parse(fixedContent);
        expect(fixedWorkflow.settings.errorWorkflow).toBe('{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}');
      }
    });

    it('should correctly add missing executionOrder when fix is applied', () => {
      const content = loadFixture('missing-execution-order.json');
      const findings = checkWorkflowSettings(content, 'missing-execution-order.json');

      const fixableFinding = findings.find(f => f.message.includes('executionOrder') && f.fixable);
      expect(fixableFinding?.fix).toBeDefined();

      if (fixableFinding?.fix) {
        const fixedContent = fixableFinding.fix.apply(content);
        const fixedWorkflow = JSON.parse(fixedContent);
        expect(fixedWorkflow.settings.executionOrder).toBe('v1');
      }
    });

    it('should correctly fix wrong errorWorkflow value', () => {
      const content = loadFixture('wrong-error-workflow.json');
      const findings = checkWorkflowSettings(content, 'wrong-error-workflow.json');

      const fixableFinding = findings.find(f => f.message.includes('errorWorkflow') && f.fixable);
      expect(fixableFinding?.fix).toBeDefined();

      if (fixableFinding?.fix) {
        const fixedContent = fixableFinding.fix.apply(content);
        const fixedWorkflow = JSON.parse(fixedContent);
        expect(fixedWorkflow.settings.errorWorkflow).toBe('{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json';
      const findings = checkWorkflowSettings(content, 'invalid.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].message.includes('parse') || findings[0].message.includes('JSON')).toBe(true);
    });
  });
});
