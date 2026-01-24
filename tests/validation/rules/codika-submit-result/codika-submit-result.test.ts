/**
 * Tests for CODIKA-SUBMIT Rule
 *
 * Rule: Parent workflows must end with Codika Submit Result or Report Error
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

      // Filter out non-CODIKA-SUBMIT findings
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
  });

  describe('invalid workflows', () => {
    it('should FAIL when workflow ends without Codika result node', () => {
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

      expect(findings[0].raw_details).toContain('Add a Codika Submit Result node');
    });
  });

  describe('invalid terminal nodes (BUG FIX: these should FAIL)', () => {
    it('should FAIL when workflow ends with Respond to Webhook', () => {
      const { graph } = loadLocalFixture('invalid-responds-to-webhook.json');
      const findings = codikaSubmitResult(graph, ctx);

      const submitFindings = findings.filter(f => f.rule === 'CODIKA-SUBMIT');
      expect(submitFindings).toHaveLength(1);
      expect(submitFindings[0].severity).toBe('must');
    });

    it('should FAIL when workflow ends with Stop and Output', () => {
      const { graph } = loadLocalFixture('invalid-stop-and-output.json');
      const findings = codikaSubmitResult(graph, ctx);

      const submitFindings = findings.filter(f => f.rule === 'CODIKA-SUBMIT');
      expect(submitFindings).toHaveLength(1);
      expect(submitFindings[0].severity).toBe('must');
    });

    it('should FAIL when workflow ends with No Operation', () => {
      const { graph } = loadLocalFixture('invalid-no-operation.json');
      const findings = codikaSubmitResult(graph, ctx);

      const submitFindings = findings.filter(f => f.rule === 'CODIKA-SUBMIT');
      expect(submitFindings).toHaveLength(1);
      expect(submitFindings[0].severity).toBe('must');
    });

    it('should FAIL when one branch ends with invalid terminal node', () => {
      const { graph } = loadLocalFixture('invalid-mixed-endpoints.json');
      const findings = codikaSubmitResult(graph, ctx);

      // Should detect the Respond to Webhook branch as invalid
      const submitFindings = findings.filter(f => f.rule === 'CODIKA-SUBMIT');
      expect(submitFindings).toHaveLength(1);
      expect(submitFindings[0].severity).toBe('must');
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

    it('should handle workflow with multiple terminal nodes', () => {
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
  });
});
