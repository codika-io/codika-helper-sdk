/**
 * Tests for DB-ALWAYS-OUTPUT validator
 *
 * Validates that database nodes have alwaysOutputData: true set.
 * Without this, empty query results cause all downstream nodes to
 * be silently skipped — the #1 gotcha in n8n workflow development.
 */

import { describe, it, expect } from 'vitest';
import { checkDbAlwaysOutput, metadata } from '../../../../src/validation/workflow-scripts/db-always-output.js';

const testPath = '/test/workflow.json';

function makeWorkflow(nodes: any[]): string {
  return JSON.stringify({
    name: 'Test Workflow',
    nodes,
    connections: {},
    settings: { executionOrder: 'v1' },
  });
}

function makeDbNode(overrides: Partial<{
  id: string;
  name: string;
  type: string;
  alwaysOutputData: boolean | undefined;
  parameters: any;
}> = {}): any {
  const node: any = {
    id: overrides.id ?? 'db-001',
    name: overrides.name ?? 'Query Database',
    type: overrides.type ?? 'n8n-nodes-base.supabase',
    typeVersion: 1,
    position: [0, 0],
    parameters: overrides.parameters ?? { operation: 'getAll', tableId: 'users' },
  };
  if (overrides.alwaysOutputData !== undefined) {
    node.alwaysOutputData = overrides.alwaysOutputData;
  }
  return node;
}

function makeOtherNode(name = 'Code', type = 'n8n-nodes-base.code'): any {
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

describe('DB-ALWAYS-OUTPUT Script', () => {
  // ===========================================================================
  // METADATA
  // ===========================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('DB-ALWAYS-OUTPUT');
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
    it('should PASS for Supabase node with alwaysOutputData: true', () => {
      const content = makeWorkflow([makeDbNode({ alwaysOutputData: true })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for Postgres node with alwaysOutputData: true', () => {
      const content = makeWorkflow([makeDbNode({
        type: 'n8n-nodes-base.postgres', alwaysOutputData: true,
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for non-database node without alwaysOutputData', () => {
      const content = makeWorkflow([makeOtherNode()]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for HTTP Request node without alwaysOutputData (not a DB node)', () => {
      const content = makeWorkflow([makeOtherNode('HTTP Request', 'n8n-nodes-base.httpRequest')]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for workflow with no database nodes', () => {
      const content = makeWorkflow([
        makeOtherNode('Code', 'n8n-nodes-base.code'),
        makeOtherNode('IF', 'n8n-nodes-base.if'),
      ]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for empty workflow', () => {
      const content = makeWorkflow([]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for executeWorkflowTrigger without alwaysOutputData', () => {
      const content = makeWorkflow([makeOtherNode('Trigger', 'n8n-nodes-base.executeWorkflowTrigger')]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully', () => {
      const findings = checkDbAlwaysOutput('not json', testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ===========================================================================
  // INVALID — Findings expected
  // ===========================================================================
  describe('invalid workflows', () => {
    it('should FAIL for Supabase node without alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode()]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('DB-ALWAYS-OUTPUT');
      expect(findings[0].severity).toBe('should');
      expect(findings[0].message).toContain('Query Database');
      expect(findings[0].message).toContain('alwaysOutputData');
    });

    it('should FAIL for Supabase node with alwaysOutputData: false', () => {
      const content = makeWorkflow([makeDbNode({ alwaysOutputData: false })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Postgres node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'Query Postgres', type: 'n8n-nodes-base.postgres',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Query Postgres');
    });

    it('should FAIL for MySQL node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'MySQL Query', type: 'n8n-nodes-base.mysql',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for MongoDB node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'Mongo Find', type: 'n8n-nodes-base.mongoDb',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Redis node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'Redis Get', type: 'n8n-nodes-base.redis',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Elasticsearch node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'ES Search', type: 'n8n-nodes-base.elasticsearch',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for Microsoft SQL node missing alwaysOutputData', () => {
      const content = makeWorkflow([makeDbNode({
        name: 'MSSQL Query', type: 'n8n-nodes-base.microsoftSql',
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for multiple DB nodes, some missing alwaysOutputData', () => {
      const good = makeDbNode({ id: 'db-001', name: 'Good Query', alwaysOutputData: true });
      const bad1 = makeDbNode({ id: 'db-002', name: 'Bad Query 1' });
      const bad2 = makeDbNode({ id: 'db-003', name: 'Bad Query 2', type: 'n8n-nodes-base.postgres' });
      const content = makeWorkflow([good, bad1, bad2]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(2);
      expect(findings[0].message).toContain('Bad Query 1');
      expect(findings[1].message).toContain('Bad Query 2');
    });

    it('should include node ID in the finding', () => {
      const content = makeWorkflow([makeDbNode({ id: 'my-db-node' })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings[0].nodeId).toBe('my-db-node');
    });

    it('should still FAIL even if alwaysOutputData is in parameters (wrong location)', () => {
      const node = makeDbNode({
        parameters: { operation: 'getAll', alwaysOutputData: true },
      });
      const content = makeWorkflow([node]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
    });
  });

  // ===========================================================================
  // AUTO-FIX
  // ===========================================================================
  describe('auto-fix', () => {
    it('should be fixable', () => {
      const content = makeWorkflow([makeDbNode()]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should add alwaysOutputData: true to node', () => {
      const content = makeWorkflow([makeDbNode()]);
      const findings = checkDbAlwaysOutput(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed.nodes[0].alwaysOutputData).toBe(true);
    });

    it('should change alwaysOutputData from false to true', () => {
      const content = makeWorkflow([makeDbNode({ alwaysOutputData: false })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed.nodes[0].alwaysOutputData).toBe(true);
    });

    it('should preserve existing node properties when fixing', () => {
      const content = makeWorkflow([makeDbNode({
        id: 'my-db',
        name: 'Get Users',
        type: 'n8n-nodes-base.supabase',
        parameters: { operation: 'getAll', tableId: 'users', returnAll: true },
      })]);
      const findings = checkDbAlwaysOutput(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const node = parsed.nodes[0];
      expect(node.id).toBe('my-db');
      expect(node.name).toBe('Get Users');
      expect(node.type).toBe('n8n-nodes-base.supabase');
      expect(node.parameters.operation).toBe('getAll');
      expect(node.parameters.tableId).toBe('users');
      expect(node.alwaysOutputData).toBe(true);
    });

    it('should produce valid JSON after fix', () => {
      const content = makeWorkflow([makeDbNode()]);
      const findings = checkDbAlwaysOutput(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(() => JSON.parse(fixed)).not.toThrow();
    });

    it('should fix the correct node when multiple are present', () => {
      const good = makeDbNode({ id: 'db-001', name: 'Good Query', alwaysOutputData: true });
      const bad = makeDbNode({ id: 'db-002', name: 'Bad Query' });
      const content = makeWorkflow([good, bad]);
      const findings = checkDbAlwaysOutput(content, testPath);
      expect(findings).toHaveLength(1);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed.nodes[0].alwaysOutputData).toBe(true); // was already true
      expect(parsed.nodes[1].alwaysOutputData).toBe(true); // now fixed
    });
  });
});
