/**
 * Tests for WORKFLOW-SETTINGS validator
 *
 * Validates that every workflow has required settings:
 * - settings.errorWorkflow: "{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}"
 * - settings.executionOrder: "v1"
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkWorkflowSettings, metadata } from '../../../../src/validation/workflow-scripts/workflow-settings.js';

const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_PATH, name), 'utf-8');
}

const testPath = '/test/workflow.json';

describe('WORKFLOW-SETTINGS Script', () => {
  // ============================================================================
  // METADATA
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('WORKFLOW-SETTINGS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have a description', () => {
      expect(metadata.description).toBeTruthy();
    });
  });

  // ============================================================================
  // VALID WORKFLOWS
  // ============================================================================
  describe('valid workflows', () => {
    it('should PASS when workflow has all required settings', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has additional settings', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
          executionOrder: 'v1',
          saveDataSuccessExecution: 'all',
          saveManualExecutions: true,
        },
      });
      const findings = checkWorkflowSettings(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-all-settings.json fixture', () => {
      const content = loadFixture('valid-all-settings.json');
      const findings = checkWorkflowSettings(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // INVALID: Missing errorWorkflow
  // ============================================================================
  describe('invalid - missing errorWorkflow', () => {
    it('should FAIL when errorWorkflow is missing', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WORKFLOW-SETTINGS');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('errorWorkflow');
    });

    it('should FAIL when errorWorkflow has wrong value', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: 'wrong-value',
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('errorWorkflow');
      expect(findings[0].message).toContain('wrong value');
    });

    it('should FAIL when errorWorkflow has typo in placeholder', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_TERCESORG}}', // Missing _ID_
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('errorWorkflow');
    });

    it('should FAIL for missing-error-workflow.json fixture', () => {
      const content = loadFixture('missing-error-workflow.json');
      const findings = checkWorkflowSettings(content, testPath);

      const errorWorkflowFindings = findings.filter(f => f.message.includes('errorWorkflow'));
      expect(errorWorkflowFindings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INVALID: Missing executionOrder
  // ============================================================================
  describe('invalid - missing executionOrder', () => {
    it('should FAIL when executionOrder is missing', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WORKFLOW-SETTINGS');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('executionOrder');
    });

    it('should FAIL when executionOrder has wrong value', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
          executionOrder: 'v0', // Wrong value
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('executionOrder');
    });

    it('should FAIL for missing-execution-order.json fixture', () => {
      const content = loadFixture('missing-execution-order.json');
      const findings = checkWorkflowSettings(content, testPath);

      const executionOrderFindings = findings.filter(f => f.message.includes('executionOrder'));
      expect(executionOrderFindings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INVALID: Missing settings object entirely
  // ============================================================================
  describe('invalid - missing settings object', () => {
    it('should FAIL when settings object is missing entirely', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings.length).toBe(2); // Both errorWorkflow and executionOrder missing
    });

    it('should FAIL when settings is null', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: null,
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings.length).toBe(2);
    });

    it('should FAIL when settings is empty object', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {},
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings.length).toBe(2);
    });
  });

  // ============================================================================
  // AUTO-FIX FUNCTIONALITY
  // ============================================================================
  describe('auto-fix functionality', () => {
    it('should provide fix function for missing errorWorkflow', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should provide fix function for missing executionOrder', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should correctly fix missing errorWorkflow', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          executionOrder: 'v1',
        },
      }, null, 2);
      const findings = checkWorkflowSettings(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.settings.errorWorkflow).toBe('{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}');
      expect(parsed.settings.executionOrder).toBe('v1'); // Preserved
    });

    it('should correctly fix missing executionOrder', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
        },
      }, null, 2);
      const findings = checkWorkflowSettings(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.settings.executionOrder).toBe('v1');
      expect(parsed.settings.errorWorkflow).toBe('{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}'); // Preserved
    });

    it('should correctly fix wrong errorWorkflow value', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {
          errorWorkflow: 'wrong-value',
          executionOrder: 'v1',
        },
      }, null, 2);
      const findings = checkWorkflowSettings(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.settings.errorWorkflow).toBe('{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}');
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const findings = checkWorkflowSettings(content, testPath);
      expect(findings).toHaveLength(0); // Skip invalid JSON
    });

    it('should handle empty content', () => {
      const findings = checkWorkflowSettings('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with no nodes', () => {
      const content = JSON.stringify({
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSettings(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    it('should include expected value in error message', () => {
      const content = JSON.stringify({
        name: 'Test Workflow',
        nodes: [],
        settings: {},
      });
      const findings = checkWorkflowSettings(content, testPath);

      const errorWorkflowFinding = findings.find(f => f.message.includes('errorWorkflow'));
      expect(errorWorkflowFinding?.raw_details).toContain('ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG');

      const executionOrderFinding = findings.find(f => f.message.includes('executionOrder'));
      expect(executionOrderFinding?.raw_details).toContain('v1');
    });
  });
});
