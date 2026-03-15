/**
 * Tests for CODIKA-INIT Rule
 *
 * Rule: Parent workflows must contain at least one Codika Init node.
 * Sub-workflows are exempt.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseN8n } from '@replikanti/flowlint-core';
import type { Graph } from '@replikanti/flowlint-core';
import { codikaInitRequired, metadata } from '../../../../src/validation/rules/codika-init-required.js';
import {
  createRuleContext,
  createMinimalWorkflow,
  expectFindingWithRule,
  expectNoFindingWithRule,
} from '../../../helpers/test-utils.js';

// Get the directory of this file for loading local fixtures
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a workflow fixture from the local fixtures folder
 */
function loadLocalFixture(filename: string): { content: string; graph: Graph } {
  const filepath = join(__dirname, 'fixtures', filename);
  const content = readFileSync(filepath, 'utf-8');
  const graph = parseN8n(content);
  return { content, graph };
}

describe('CODIKA-INIT Rule', () => {
  const ctx = createRuleContext();

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CODIKA-INIT');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when Codika Init exists in workflow', () => {
      const { graph } = loadLocalFixture('valid-parent-workflow.json');
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when Codika Init follows trigger with initWorkflow operation', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: true,
        hasSubmitResult: true,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for sub-workflows (exempt from rule)', () => {
      const { graph } = loadLocalFixture('valid-subworkflow.json');
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for sub-workflows even without Codika Init', () => {
      const workflowJson = createMinimalWorkflow({
        isSubworkflow: true,
        hasCodikaInit: false,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when Codika Init is not the second node (e.g. router pattern)', () => {
      const workflowJson = JSON.stringify({
        name: 'Router Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Process Input', type: 'n8n-nodes-base.code', position: [220, 0], parameters: {} },
          { id: '3', name: 'Route', type: 'n8n-nodes-base.if', position: [440, 0], parameters: {} },
          {
            id: '4',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [660, 0],
            parameters: { operation: 'initWorkflow' },
          },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Process Input', type: 'main', index: 0 }]] },
          'Process Input': { main: [[{ node: 'Route', type: 'main', index: 0 }]] },
          'Route': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows', () => {
    it('should FAIL when Codika Init is missing', () => {
      const { graph } = loadLocalFixture('missing-codika-init.json');
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CODIKA-INIT');
      expect(finding.severity).toBe('must');
      expect(finding.message).toContain('missing');
    });

    it('should FAIL when no Codika Init node exists', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: false,
        hasSubmitResult: true,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'CODIKA-INIT');
    });

    it('should include helpful details', () => {
      const { graph } = loadLocalFixture('missing-codika-init.json');
      const findings = codikaInitRequired(graph, ctx);

      expect(findings[0].raw_details).toContain('Codika Init');
      expect(findings[0].raw_details).toContain('initWorkflow');
    });
  });

  describe('edge cases', () => {
    it('should handle workflow with no nodes', () => {
      const graph = parseN8n(JSON.stringify({
        name: 'Empty Workflow',
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      }));
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with only trigger node', () => {
      const graph = parseN8n(JSON.stringify({
        name: 'Only Trigger',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
        ],
        connections: {},
        settings: { executionOrder: 'v1' },
      }));
      const findings = codikaInitRequired(graph, ctx);

      // No Codika Init — should fail
      expect(findings).toHaveLength(1);
    });

    it('should detect Codika Init with initDataIngestion operation', () => {
      const workflowJson = JSON.stringify({
        name: 'Data Ingestion Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'initDataIngestion' },
          },
          { id: '3', name: 'Process', type: 'n8n-nodes-base.code', position: [440, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Codika Init': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should FAIL if Codika node has wrong operation', () => {
      const workflowJson = JSON.stringify({
        name: 'Wrong Operation',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Submit',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'submitResult' }, // Wrong operation!
          },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Codika Submit', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'CODIKA-INIT');
    });
  });

  describe('different trigger types', () => {
    it('should work with schedule trigger', () => {
      const workflowJson = JSON.stringify({
        name: 'Schedule Workflow',
        nodes: [
          { id: '1', name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'initWorkflow' },
          },
        ],
        connections: {
          'Schedule': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should FAIL for Gmail trigger without Codika Init', () => {
      const workflowJson = JSON.stringify({
        name: 'Gmail Workflow',
        nodes: [
          { id: '1', name: 'Gmail', type: 'n8n-nodes-base.gmailTrigger', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Process',
            type: 'n8n-nodes-base.code',
            position: [220, 0],
            parameters: {},
          },
        ],
        connections: {
          'Gmail': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaInitRequired(graph, ctx);

      // Should fail - Gmail trigger is a parent workflow trigger, needs Codika Init
      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, 'CODIKA-INIT');
    });
  });
});
