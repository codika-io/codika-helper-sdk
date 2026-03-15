/**
 * Tests for CODIKA-SUBMIT Rule
 *
 * Rule: Terminal nodes reachable from Codika Init must be Submit Result or Report Error.
 * Terminals NOT reachable from Init are ignored (e.g., early-exit guards in routers).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseN8n } from '@replikanti/flowlint-core';
import type { Graph } from '@replikanti/flowlint-core';
import { codikaSubmitResult, metadata } from '../../../../src/validation/rules/codika-submit-result.js';
import {
  createRuleContext,
  createMinimalWorkflow,
  expectFindingWithRule,
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

describe('CODIKA-SUBMIT Rule', () => {
  const ctx = createRuleContext();

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('CODIKA-SUBMIT');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when workflow ends with Codika Submit Result', () => {
      const { graph } = loadLocalFixture('valid-parent-workflow.json');
      const findings = codikaSubmitResult(graph, ctx);

      const submitFindings = findings.filter(f => f.rule === 'CODIKA-SUBMIT');
      expect(submitFindings).toHaveLength(0);
    });

    it('should PASS for sub-workflows (exempt from rule)', () => {
      const { graph } = loadLocalFixture('valid-subworkflow.json');
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow ends with submitResult operation', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: true,
        hasSubmitResult: true,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for router pattern where early-exit is NOT reachable from Init', () => {
      // Router: Trigger → Process Input → IF
      //   IF true → Codika Init → ... → Codika Submit
      //   IF false → Stop (early exit, not tracked)
      const workflowJson = JSON.stringify({
        name: 'Router Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Process Input', type: 'n8n-nodes-base.code', position: [220, 0], parameters: {} },
          { id: '3', name: 'Is Valid?', type: 'n8n-nodes-base.if', position: [440, 0], parameters: {} },
          {
            id: '4',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [660, -100],
            parameters: { operation: 'initWorkflow' },
          },
          {
            id: '5',
            name: 'Codika Submit',
            type: 'n8n-nodes-codika.codika',
            position: [880, -100],
            parameters: { operation: 'submitResult' },
          },
          { id: '6', name: 'Stop (Not Valid)', type: 'n8n-nodes-base.noOp', position: [660, 100], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Process Input', type: 'main', index: 0 }]] },
          'Process Input': { main: [[{ node: 'Is Valid?', type: 'main', index: 0 }]] },
          'Is Valid?': {
            main: [
              [{ node: 'Codika Init', type: 'main', index: 0 }],
              [{ node: 'Stop (Not Valid)', type: 'main', index: 0 }],
            ],
          },
          'Codika Init': { main: [[{ node: 'Codika Submit', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      // "Stop (Not Valid)" is NOT reachable from Init, so it should pass
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows', () => {
    it('should FAIL when workflow ends without Codika result node after Init', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: true,
        hasSubmitResult: false,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, 'CODIKA-SUBMIT');
      expect(finding.severity).toBe('must');
    });

    it('should include helpful details', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: true,
        hasSubmitResult: false,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings[0].raw_details).toContain('Codika Submit Result');
    });

    it('should FAIL when one branch after Init ends without Submit', () => {
      const workflowJson = JSON.stringify({
        name: 'Branching After Init',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'initWorkflow' },
          },
          { id: '3', name: 'IF', type: 'n8n-nodes-base.if', position: [440, 0], parameters: {} },
          {
            id: '4',
            name: 'Codika Submit',
            type: 'n8n-nodes-codika.codika',
            position: [660, -100],
            parameters: { operation: 'submitResult' },
          },
          { id: '5', name: 'Dead End', type: 'n8n-nodes-base.code', position: [660, 100], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Codika Init': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          'IF': {
            main: [
              [{ node: 'Codika Submit', type: 'main', index: 0 }],
              [{ node: 'Dead End', type: 'main', index: 0 }],
            ],
          },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('Dead End');
    });
  });

  describe('workflows without Init (no findings)', () => {
    it('should return no findings when workflow has no Codika Init', () => {
      const workflowJson = createMinimalWorkflow({
        hasCodikaInit: false,
        hasSubmitResult: false,
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      // CODIKA-INIT rule handles the "no Init" case
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should PASS when workflow ends with reportError operation', () => {
      const workflowJson = JSON.stringify({
        name: 'Error Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'initWorkflow' },
          },
          {
            id: '3',
            name: 'Codika Report Error',
            type: 'n8n-nodes-codika.codika',
            position: [440, 0],
            parameters: { operation: 'reportError' },
          },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Codika Init': { main: [[{ node: 'Codika Report Error', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with multiple terminal nodes all valid', () => {
      const workflowJson = JSON.stringify({
        name: 'Branching Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          {
            id: '2',
            name: 'Codika Init',
            type: 'n8n-nodes-codika.codika',
            position: [220, 0],
            parameters: { operation: 'initWorkflow' },
          },
          { id: '3', name: 'IF', type: 'n8n-nodes-base.if', position: [440, 0], parameters: {} },
          {
            id: '4',
            name: 'Codika Submit',
            type: 'n8n-nodes-codika.codika',
            position: [660, -100],
            parameters: { operation: 'submitResult' },
          },
          {
            id: '5',
            name: 'Codika Error',
            type: 'n8n-nodes-codika.codika',
            position: [660, 100],
            parameters: { operation: 'reportError' },
          },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Codika Init', type: 'main', index: 0 }]] },
          'Codika Init': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          'IF': {
            main: [
              [{ node: 'Codika Submit', type: 'main', index: 0 }],
              [{ node: 'Codika Error', type: 'main', index: 0 }],
            ],
          },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflowJson);
      const findings = codikaSubmitResult(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should handle empty workflow', () => {
      const graph = parseN8n(JSON.stringify({
        name: 'Empty',
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      }));
      const findings = codikaSubmitResult(graph, ctx);
      expect(findings).toHaveLength(0);
    });
  });
});
