/**
 * Tests for EXEC-WORKFLOW-WAIT validator
 *
 * Validates that executeWorkflow nodes have waitForSubWorkflow: true
 * in their options. Without this, the parent workflow doesn't wait
 * for the sub-workflow to complete and return values are silently lost.
 */

import { describe, it, expect } from 'vitest';
import { checkExecWorkflowWait, metadata } from '../../../../src/validation/workflow-scripts/exec-workflow-wait.js';

const testPath = '/test/workflow.json';

function makeWorkflow(nodes: any[]): string {
  return JSON.stringify({
    name: 'Test Workflow',
    nodes,
    connections: {},
    settings: { executionOrder: 'v1' },
  });
}

function makeExecWorkflowNode(overrides: Partial<{
  id: string;
  name: string;
  typeVersion: number;
  parameters: any;
}> = {}): any {
  return {
    id: overrides.id ?? 'exec-001',
    name: overrides.name ?? 'Call Sub-Workflow',
    type: 'n8n-nodes-base.executeWorkflow',
    typeVersion: overrides.typeVersion ?? 1.2,
    position: [0, 0],
    parameters: overrides.parameters ?? {
      workflowId: { __rl: true, mode: 'id', value: '{{SUBWKFL_helper_LFKWBUS}}' },
      options: { waitForSubWorkflow: true },
    },
  };
}

function makeOtherNode(name = 'Code Node', type = 'n8n-nodes-base.code'): any {
  return {
    id: 'other-001',
    name,
    type,
    typeVersion: 2,
    position: [0, 0],
    parameters: {},
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('EXEC-WORKFLOW-WAIT Script', () => {
  // ===========================================================================
  // METADATA
  // ===========================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('EXEC-WORKFLOW-WAIT');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });
  });

  // ===========================================================================
  // VALID — No findings expected
  // ===========================================================================
  describe('valid workflows', () => {
    it('should PASS when executeWorkflow has waitForSubWorkflow: true', () => {
      const content = makeWorkflow([makeExecWorkflowNode()]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for workflow with no executeWorkflow nodes', () => {
      const content = makeWorkflow([makeOtherNode()]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for empty workflow', () => {
      const content = makeWorkflow([]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for other node types — no false positive', () => {
      const content = makeWorkflow([
        makeOtherNode('IF', 'n8n-nodes-base.if'),
        makeOtherNode('Trigger', 'n8n-nodes-base.executeWorkflowTrigger'),
        makeOtherNode('Code', 'n8n-nodes-base.code'),
      ]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for executeWorkflow with typeVersion 1.3', () => {
      const content = makeWorkflow([makeExecWorkflowNode({ typeVersion: 1.3 })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for executeWorkflow with typeVersion 1.0', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        typeVersion: 1.0,
        parameters: { workflowId: 'abc', options: { waitForSubWorkflow: true } },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when multiple executeWorkflow nodes all have waitForSubWorkflow', () => {
      const content = makeWorkflow([
        makeExecWorkflowNode({ id: 'exec-001', name: 'Call A' }),
        makeExecWorkflowNode({ id: 'exec-002', name: 'Call B' }),
      ]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const findings = checkExecWorkflowWait('not json', testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ===========================================================================
  // INVALID — Findings expected
  // ===========================================================================
  describe('invalid workflows', () => {
    it('should PASS when executeWorkflow has waitForSubWorkflow: false (deliberate fire-and-forget)', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: {
          workflowId: { __rl: true, mode: 'id', value: '123' },
          options: { waitForSubWorkflow: false },
        },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should FAIL when executeWorkflow has no options object', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: {
          workflowId: { __rl: true, mode: 'id', value: '123' },
        },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL when options exists but missing waitForSubWorkflow', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: {
          workflowId: { __rl: true, mode: 'id', value: '123' },
          options: { mode: 'each' },
        },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for multiple executeWorkflow nodes with some missing wait', () => {
      const good = makeExecWorkflowNode({ id: 'exec-001', name: 'Good Call' });
      const missing = makeExecWorkflowNode({
        id: 'exec-002', name: 'Missing Wait',
        parameters: { workflowId: '1' },
      });
      const deliberate = makeExecWorkflowNode({
        id: 'exec-003', name: 'Deliberate False',
        parameters: { workflowId: '2', options: { waitForSubWorkflow: false } },
      });
      const content = makeWorkflow([good, missing, deliberate]);
      const findings = checkExecWorkflowWait(content, testPath);
      // Only 1 finding: the missing one. Deliberate false is respected.
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Missing Wait');
    });

    it('should include node ID in the finding', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        id: 'my-exec-node',
        parameters: { workflowId: '123' },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings[0].nodeId).toBe('my-exec-node');
    });
  });

  // ===========================================================================
  // AUTO-FIX
  // ===========================================================================
  describe('auto-fix', () => {
    it('should be fixable', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: { workflowId: '123' },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should add waitForSubWorkflow: true to existing options', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: { workflowId: '123', options: { mode: 'each' } },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed.nodes[0].parameters.options.waitForSubWorkflow).toBe(true);
      expect(parsed.nodes[0].parameters.options.mode).toBe('each');
    });

    it('should create options object when missing', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: { workflowId: '123' },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed.nodes[0].parameters.options.waitForSubWorkflow).toBe(true);
    });

    it('should not produce a finding for explicit false (no fix needed)', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: { workflowId: '123', options: { waitForSubWorkflow: false } },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should preserve other node properties when fixing', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        id: 'my-node',
        name: 'My Exec',
        typeVersion: 1.3,
        parameters: {
          workflowId: { __rl: true, mode: 'id', value: '{{SUBWKFL_test_LFKWBUS}}' },
          workflowInputs: { mappingMode: 'defineBelow', value: { key: 'val' } },
        },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const node = parsed.nodes[0];
      expect(node.id).toBe('my-node');
      expect(node.name).toBe('My Exec');
      expect(node.parameters.workflowId.value).toBe('{{SUBWKFL_test_LFKWBUS}}');
      expect(node.parameters.workflowInputs.mappingMode).toBe('defineBelow');
      expect(node.parameters.options.waitForSubWorkflow).toBe(true);
    });

    it('should produce valid JSON after fix', () => {
      const content = makeWorkflow([makeExecWorkflowNode({
        parameters: { workflowId: '123' },
      })]);
      const findings = checkExecWorkflowWait(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(() => JSON.parse(fixed)).not.toThrow();
    });

    it('should fix the correct node when multiple are present', () => {
      const good = makeExecWorkflowNode({
        id: 'exec-001', name: 'Good Call',
      });
      const bad = makeExecWorkflowNode({
        id: 'exec-002', name: 'Bad Call',
        parameters: { workflowId: '123' },
      });
      const content = makeWorkflow([good, bad]);
      const findings = checkExecWorkflowWait(content, testPath);
      expect(findings).toHaveLength(1);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      // Good node untouched
      expect(parsed.nodes[0].parameters.options.waitForSubWorkflow).toBe(true);
      // Bad node fixed
      expect(parsed.nodes[1].parameters.options.waitForSubWorkflow).toBe(true);
    });
  });
});
