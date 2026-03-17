/**
 * Tests for MERGE-BEFORE-TERMINAL validator
 *
 * Validates that Merge nodes are never directly connected to terminal
 * Codika nodes (Submit Result / Report Error / Ingestion Callback).
 * A Merge node immediately before a terminal Codika node causes the
 * workflow to hang indefinitely because the Merge waits for all inputs
 * but only one conditional branch runs.
 */

import { describe, it, expect } from 'vitest';
import { checkMergeBeforeTerminal, metadata } from '../../../../src/validation/workflow-scripts/merge-before-terminal.js';

const testPath = '/test/workflow.json';

/**
 * Helper: build a workflow JSON string with given nodes and connections.
 *
 * `nodes` — array of node objects (at minimum: name, type, id, parameters)
 * `connections` — n8n connection map: { [sourceName]: { main: [ [ { node, type, index } ] ] } }
 */
function makeWorkflow(nodes: any[], connections: Record<string, any> = {}): string {
  return JSON.stringify({
    name: 'Test Workflow',
    nodes,
    connections,
    settings: { executionOrder: 'v1' },
  });
}

function makeNode(overrides: Partial<{
  id: string;
  name: string;
  type: string;
  parameters: any;
  typeVersion: number;
}>): any {
  return {
    id: overrides.id ?? 'node-001',
    name: overrides.name ?? 'Node',
    type: overrides.type ?? 'n8n-nodes-base.noOp',
    typeVersion: overrides.typeVersion ?? 1,
    position: [0, 0],
    parameters: overrides.parameters ?? {},
  };
}

// Shorthand factories
function mergeNode(name = 'Merge', id = 'merge-001') {
  return makeNode({ id, name, type: 'n8n-nodes-base.merge', typeVersion: 3 });
}

function submitResultNode(name = 'Codika Submit Result', id = 'submit-001') {
  return makeNode({
    id, name, type: 'n8n-nodes-codika.codika',
    parameters: { resource: 'workflowOutputs', operation: 'submitResult' },
  });
}

function reportErrorNode(name = 'Codika Report Error', id = 'report-001') {
  return makeNode({
    id, name, type: 'n8n-nodes-codika.codika',
    parameters: { resource: 'errorHandling', operation: 'reportError', errorMessage: 'fail', errorType: 'node_failure' },
  });
}

function ingestionCallbackNode(name = 'Codika Ingestion Callback', id = 'ingest-001') {
  return makeNode({
    id, name, type: 'n8n-nodes-codika.codika',
    parameters: { resource: 'dataIngestion', operation: 'ingestionCallback' },
  });
}

function codeNode(name = 'Transform', id = 'code-001') {
  return makeNode({ id, name, type: 'n8n-nodes-base.code', parameters: { jsCode: 'return items;' } });
}

function codikaInitNode(name = 'Codika Init', id = 'init-001') {
  return makeNode({
    id, name, type: 'n8n-nodes-codika.codika',
    parameters: { resource: 'initializeExecution', operation: 'initWorkflow' },
  });
}

/** Creates a connection entry: source → target on main output index */
function conn(sourceName: string, targetName: string, outputIndex = 0): Record<string, any> {
  return {
    [sourceName]: {
      main: (() => {
        const arr: any[][] = [];
        for (let i = 0; i <= outputIndex; i++) {
          arr.push(i === outputIndex ? [{ node: targetName, type: 'main', index: 0 }] : []);
        }
        return arr;
      })(),
    },
  };
}

/** Merge multiple connection objects */
function mergeConns(...conns: Record<string, any>[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const c of conns) {
    for (const [key, val] of Object.entries(c)) {
      if (result[key]) {
        // Merge main arrays
        const existing = result[key].main;
        const incoming = val.main;
        for (let i = 0; i < incoming.length; i++) {
          if (!existing[i]) existing[i] = [];
          existing[i].push(...incoming[i]);
        }
      } else {
        result[key] = val;
      }
    }
  }
  return result;
}

// =============================================================================
// TESTS
// =============================================================================

describe('MERGE-BEFORE-TERMINAL Script', () => {
  // ===========================================================================
  // METADATA
  // ===========================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('MERGE-BEFORE-TERMINAL');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should NOT be fixable', () => {
      expect(metadata.fixable).toBeFalsy();
    });
  });

  // ===========================================================================
  // VALID — No findings expected
  // ===========================================================================
  describe('valid workflows', () => {
    it('should PASS for workflow with no Merge nodes', () => {
      const nodes = [codikaInitNode(), codeNode(), submitResultNode()];
      const connections = mergeConns(
        conn('Codika Init', 'Transform'),
        conn('Transform', 'Codika Submit Result'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for Merge → Code → Submit Result (indirect)', () => {
      const nodes = [mergeNode(), codeNode(), submitResultNode()];
      const connections = mergeConns(
        conn('Merge', 'Transform'),
        conn('Transform', 'Codika Submit Result'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for Merge → non-Codika terminal node', () => {
      const nodes = [mergeNode(), makeNode({ name: 'Final Set', type: 'n8n-nodes-base.set', id: 'set-001' })];
      const connections = mergeConns(
        conn('Merge', 'Final Set'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for Merge → Codika Init (not a terminal operation)', () => {
      const nodes = [mergeNode(), codikaInitNode()];
      const connections = mergeConns(
        conn('Merge', 'Codika Init'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for empty workflow', () => {
      const content = makeWorkflow([]);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for sub-workflow with Merge and no Codika terminal nodes', () => {
      const trigger = makeNode({
        id: 'trigger-001', name: 'When Executed', type: 'n8n-nodes-base.executeWorkflowTrigger',
      });
      const nodes = [trigger, mergeNode(), codeNode()];
      const connections = mergeConns(
        conn('When Executed', 'Merge'),
        conn('Merge', 'Transform'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when invalid JSON is provided', () => {
      const findings = checkMergeBeforeTerminal('not json', testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ===========================================================================
  // INVALID — Findings expected
  // ===========================================================================
  describe('invalid workflows', () => {
    it('should FAIL for Merge → Submit Result (direct connection)', () => {
      const nodes = [mergeNode(), submitResultNode()];
      const connections = mergeConns(
        conn('Merge', 'Codika Submit Result'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('MERGE-BEFORE-TERMINAL');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('Merge');
      expect(findings[0].message).toContain('Codika Submit Result');
    });

    it('should FAIL for Merge → Report Error (direct connection)', () => {
      const nodes = [mergeNode(), reportErrorNode()];
      const connections = mergeConns(
        conn('Merge', 'Codika Report Error'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Codika Report Error');
    });

    it('should FAIL for Merge → Ingestion Callback (direct connection)', () => {
      const nodes = [mergeNode(), ingestionCallbackNode()];
      const connections = mergeConns(
        conn('Merge', 'Codika Ingestion Callback'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Codika Ingestion Callback');
    });

    it('should FAIL for Merge output index 1 → Submit Result', () => {
      const nodes = [mergeNode(), codeNode(), submitResultNode()];
      // Output 0 → Code (fine), Output 1 → Submit Result (bad)
      const connections = mergeConns(
        conn('Merge', 'Transform', 0),
        conn('Merge', 'Codika Submit Result', 1),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Merge');
    });

    it('should FAIL for multiple Merge nodes, one connecting to terminal', () => {
      const merge1 = mergeNode('Merge 1', 'merge-001');
      const merge2 = mergeNode('Merge 2', 'merge-002');
      const nodes = [merge1, merge2, codeNode(), submitResultNode()];
      const connections = mergeConns(
        conn('Merge 1', 'Transform'),           // fine
        conn('Merge 2', 'Codika Submit Result'), // bad
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Merge 2');
    });

    it('should report both when two Merge nodes connect to terminal nodes', () => {
      const merge1 = mergeNode('Merge 1', 'merge-001');
      const merge2 = mergeNode('Merge 2', 'merge-002');
      const submit = submitResultNode();
      const report = reportErrorNode();
      const nodes = [merge1, merge2, submit, report];
      const connections = mergeConns(
        conn('Merge 1', 'Codika Submit Result'),
        conn('Merge 2', 'Codika Report Error'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings).toHaveLength(2);
    });

    it('should include the merge node ID in the finding', () => {
      const nodes = [mergeNode('My Merge', 'merge-xyz'), submitResultNode()];
      const connections = mergeConns(
        conn('My Merge', 'Codika Submit Result'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings[0].nodeId).toBe('merge-xyz');
    });

    it('should include guide reference in finding', () => {
      const nodes = [mergeNode(), submitResultNode()];
      const connections = mergeConns(
        conn('Merge', 'Codika Submit Result'),
      );
      const content = makeWorkflow(nodes, connections);
      const findings = checkMergeBeforeTerminal(content, testPath);
      expect(findings[0].guideRef).toBeDefined();
      expect(findings[0].guideRef?.path).toContain('codika-nodes');
    });
  });
});
