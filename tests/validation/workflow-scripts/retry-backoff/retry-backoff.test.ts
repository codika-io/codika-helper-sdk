/**
 * Tests for RETRY-BACKOFF validator
 *
 * Validates that API/HTTP nodes have retry configuration enabled.
 * Provides auto-fix with sensible defaults (3 retries, 1000ms wait).
 */

import { describe, it, expect } from 'vitest';
import { checkRetryBackoff, metadata } from '../../../../src/validation/workflow-scripts/retry-backoff.js';

const testPath = '/test/workflow.json';

function makeWorkflow(nodes: any[], connections: any = {}): string {
  return JSON.stringify({ name: 'Test', nodes, connections, settings: { executionOrder: 'v1' } });
}

function makeNode(overrides: Partial<{ id: string; name: string; type: string; parameters: any; retryOnFail: boolean; maxTries: number; waitBetweenTries: number }>): any {
  return {
    id: overrides.id ?? 'n1',
    name: overrides.name ?? 'Node',
    type: overrides.type ?? 'n8n-nodes-base.httpRequest',
    position: [0, 0],
    parameters: overrides.parameters ?? {},
    ...(overrides.retryOnFail !== undefined && { retryOnFail: overrides.retryOnFail }),
    ...(overrides.maxTries !== undefined && { maxTries: overrides.maxTries }),
    ...(overrides.waitBetweenTries !== undefined && { waitBetweenTries: overrides.waitBetweenTries }),
  };
}

describe('RETRY-BACKOFF Script', () => {
  // ============================================================================
  // METADATA
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('RETRY-BACKOFF');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });
  });

  // ============================================================================
  // VALID: Nodes with retry configured
  // ============================================================================
  describe('valid - retry configured', () => {
    it('should PASS when HTTP Request has retryOnFail at top level', () => {
      const content = makeWorkflow([makeNode({ retryOnFail: true })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when retryOnFail is in parameters.options', () => {
      const content = makeWorkflow([makeNode({
        parameters: { options: { retryOnFail: true } },
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when retryOnFail is in parameters directly', () => {
      const content = makeWorkflow([makeNode({
        parameters: { retryOnFail: true },
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for non-API nodes without retry', () => {
      const content = makeWorkflow([makeNode({
        type: 'n8n-nodes-base.code',
        name: 'Code Node',
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for workflow with no nodes', () => {
      const content = makeWorkflow([]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // INVALID: API nodes missing retry
  // ============================================================================
  describe('invalid - missing retry', () => {
    it('should FAIL for HTTP Request without retry', () => {
      const content = makeWorkflow([makeNode({
        name: 'Get Data',
        type: 'n8n-nodes-base.httpRequest',
      })]);
      const findings = checkRetryBackoff(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('RETRY-BACKOFF');
      expect(findings[0].severity).toBe('should');
      expect(findings[0].message).toContain('Get Data');
    });

    it('should FAIL for Google Sheets node without retry', () => {
      const content = makeWorkflow([makeNode({
        name: 'Read Sheet',
        type: 'n8n-nodes-base.googleSheets',
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Gmail node without retry', () => {
      const content = makeWorkflow([makeNode({
        name: 'Send Email',
        type: 'n8n-nodes-base.gmail',
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Facebook node without retry', () => {
      const content = makeWorkflow([makeNode({
        name: 'Post to Facebook',
        type: 'n8n-nodes-base.facebookGraphApi',
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL when retryOnFail is explicitly false', () => {
      const content = makeWorkflow([makeNode({
        name: 'API Call',
        retryOnFail: false,
      })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should report one finding per node', () => {
      const content = makeWorkflow([
        makeNode({ id: 'n1', name: 'API 1', type: 'n8n-nodes-base.httpRequest' }),
        makeNode({ id: 'n2', name: 'API 2', type: 'n8n-nodes-base.httpRequest' }),
        makeNode({ id: 'n3', name: 'Code', type: 'n8n-nodes-base.code' }),
      ]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(2);
    });
  });

  // ============================================================================
  // NODE TYPE DETECTION
  // ============================================================================
  describe('node type detection', () => {
    const apiTypes = [
      'n8n-nodes-base.httpRequest',
      'n8n-nodes-base.googleSheets',
      'n8n-nodes-base.googleDrive',
      'n8n-nodes-base.gmail',
      'n8n-nodes-base.googleCalendar',
      'n8n-nodes-base.facebookGraphApi',
      'n8n-nodes-base.microsoftOutlook',
      'n8n-nodes-base.slack',
      'n8n-nodes-base.telegram',
      'n8n-nodes-base.airtable',
      'n8n-nodes-base.notion',
      'n8n-nodes-base.hubspot',
      'n8n-nodes-base.stripe',
      'n8n-nodes-base.twilio',
    ];

    for (const nodeType of apiTypes) {
      it(`should flag ${nodeType} without retry`, () => {
        const content = makeWorkflow([makeNode({ type: nodeType, name: nodeType })]);
        const findings = checkRetryBackoff(content, testPath);
        expect(findings).toHaveLength(1);
      });
    }

    const nonApiTypes = [
      'n8n-nodes-base.code',
      'n8n-nodes-base.if',
      'n8n-nodes-base.switch',
      'n8n-nodes-base.set',
      'n8n-nodes-base.merge',
      'n8n-nodes-base.noOp',
      'n8n-nodes-base.stickyNote',
      'n8n-nodes-base.webhook',
      'n8n-nodes-base.scheduleTrigger',
      'n8n-nodes-base.executeWorkflowTrigger',
      'n8n-nodes-base.executeWorkflow',
      'n8n-nodes-codika.codika',
      // Database / data-store nodes (internal, reliable connections)
      'n8n-nodes-base.supabase',
      'n8n-nodes-base.postgres',
      'n8n-nodes-base.mySql',
      'n8n-nodes-base.mongoDb',
      'n8n-nodes-base.redis',
      'n8n-nodes-base.elasticsearch',
    ];

    for (const nodeType of nonApiTypes) {
      it(`should NOT flag ${nodeType}`, () => {
        const content = makeWorkflow([makeNode({ type: nodeType, name: nodeType })]);
        const findings = checkRetryBackoff(content, testPath);
        expect(findings).toHaveLength(0);
      });
    }
  });

  // ============================================================================
  // AUTO-FIX
  // ============================================================================
  describe('auto-fix', () => {
    it('should provide a fix function', () => {
      const content = makeWorkflow([makeNode({ name: 'API Call' })]);
      const findings = checkRetryBackoff(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should add retryOnFail, maxTries, and waitBetweenTries', () => {
      const content = makeWorkflow([makeNode({ id: 'n1', name: 'API Call' })]);
      const findings = checkRetryBackoff(content, testPath);

      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const node = parsed.nodes[0];

      expect(node.retryOnFail).toBe(true);
      expect(node.maxTries).toBe(3);
      expect(node.waitBetweenTries).toBe(1000);
    });

    it('should produce valid JSON after fix', () => {
      const content = makeWorkflow([makeNode({ name: 'API Call' })]);
      const findings = checkRetryBackoff(content, testPath);
      const fixed = findings[0].fix!.apply(content);

      expect(() => JSON.parse(fixed)).not.toThrow();
    });

    it('should pass validation after fix', () => {
      const content = makeWorkflow([makeNode({ name: 'API Call' })]);
      const findings = checkRetryBackoff(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const recheck = checkRetryBackoff(fixed, testPath);

      expect(recheck).toHaveLength(0);
    });

    it('should fix multiple nodes independently', () => {
      const content = makeWorkflow([
        makeNode({ id: 'n1', name: 'API 1' }),
        makeNode({ id: 'n2', name: 'API 2' }),
      ]);
      const findings = checkRetryBackoff(content, testPath);

      let fixed = content;
      for (const finding of findings) {
        fixed = finding.fix!.apply(fixed);
      }
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].retryOnFail).toBe(true);
      expect(parsed.nodes[1].retryOnFail).toBe(true);
    });

    it('should not overwrite existing maxTries if already set', () => {
      const content = makeWorkflow([makeNode({
        id: 'n1',
        name: 'API Call',
        retryOnFail: false,
        maxTries: 5,
        waitBetweenTries: 2000,
      })]);
      const findings = checkRetryBackoff(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const node = parsed.nodes[0];

      expect(node.retryOnFail).toBe(true);
      expect(node.maxTries).toBe(5);
      expect(node.waitBetweenTries).toBe(2000);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const findings = checkRetryBackoff('not valid json', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const findings = checkRetryBackoff('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with null nodes', () => {
      const content = JSON.stringify({ name: 'Test', nodes: null });
      const findings = checkRetryBackoff(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should include nodeId in findings', () => {
      const content = makeWorkflow([makeNode({ id: 'my-node-123', name: 'API Call' })]);
      const findings = checkRetryBackoff(content, testPath);
      expect(findings[0].nodeId).toBe('my-node-123');
    });
  });
});
