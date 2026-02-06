/**
 * Tests for ERROR-BRANCH-REQUIRED Rule
 *
 * Rule: Error-prone nodes (HTTP Request, Google Sheets, Execute Workflow, etc.)
 * must have an error branch (red connector) to handle failures.
 *
 * LangChain sub-nodes (outputParserStructured, lmChatAnthropic, etc.) are
 * excluded because they execute within their parent chain/agent node and
 * cannot have independent error branches.
 *
 * This replaces flowlint's R12 which false-positives on LangChain sub-nodes
 * due to broad regex matching (e.g. "put" in "outputParserStructured").
 */

import { describe, it, expect } from 'vitest';
import { parseN8n } from '@replikanti/flowlint-core';
import {
  errorBranchRequired,
  metadata,
  RULE_ID,
} from '../../../../src/validation/rules/error-branch-required.js';
import { createRuleContext, expectFindingWithRule, expectNoFindingWithRule } from '../../../helpers/test-utils.js';

describe('ERROR-BRANCH-REQUIRED Rule', () => {
  const ctx = createRuleContext();

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('ERROR-BRANCH-REQUIRED');
      expect(metadata.id).toBe('ERROR-BRANCH-REQUIRED');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('LangChain sub-nodes (should NOT trigger)', () => {
    it('should PASS for outputParserStructured (false positive: "put" matches mutation regex)', () => {
      const workflow = JSON.stringify({
        name: 'LangChain Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'LLM Chain', type: '@n8n/n8n-nodes-langchain.chainLlm', position: [200, 0], parameters: {} },
          { id: '3', name: 'Claude Model', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', position: [150, 200], parameters: {} },
          { id: '4', name: 'Categorization Parser', type: '@n8n/n8n-nodes-langchain.outputParserStructured', position: [250, 200], parameters: {} },
          { id: '5', name: 'Next Step', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'LLM Chain', type: 'main', index: 0 }]] },
          'Claude Model': { ai_languageModel: [[{ node: 'LLM Chain', type: 'ai_languageModel', index: 0 }]] },
          'Categorization Parser': { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
          'LLM Chain': { main: [[{ node: 'Next Step', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });

    it('should PASS for lmChatAnthropic (false positive: no error branch needed)', () => {
      const workflow = JSON.stringify({
        name: 'Model Only',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', position: [200, 0], parameters: {} },
          { id: '3', name: 'Claude', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic', position: [150, 200], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
          'Claude': { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });

    it('should PASS for memoryBufferWindow', () => {
      const workflow = JSON.stringify({
        name: 'Memory Node',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', position: [200, 0], parameters: {} },
          { id: '3', name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow', position: [150, 200], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Agent', type: 'main', index: 0 }]] },
          'Memory': { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });

    it('should PASS for embeddingsOpenAi and vectorStorePinecone', () => {
      const workflow = JSON.stringify({
        name: 'Embeddings Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Vector Store', type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', position: [200, 0], parameters: {} },
          { id: '3', name: 'Embeddings', type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', position: [150, 200], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Vector Store', type: 'main', index: 0 }]] },
          'Embeddings': { ai_embedding: [[{ node: 'Vector Store', type: 'ai_embedding', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });

    it('should PASS for documentDefaultDataLoader', () => {
      const workflow = JSON.stringify({
        name: 'Document Loader Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Vector Store', type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', position: [200, 0], parameters: {} },
          { id: '3', name: 'Doc Loader', type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', position: [150, 200], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Vector Store', type: 'main', index: 0 }]] },
          'Doc Loader': { ai_document: [[{ node: 'Vector Store', type: 'ai_document', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });
  });

  describe('error-prone nodes WITHOUT error branch (should trigger)', () => {
    it('should FAIL for HTTP Request node without error branch', () => {
      const workflow = JSON.stringify({
        name: 'HTTP Without Error Branch',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Fetch Data', type: 'n8n-nodes-base.httpRequest', position: [200, 0], parameters: {} },
          { id: '3', name: 'Process', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]] },
          'Fetch Data': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      const finding = expectFindingWithRule(findings, RULE_ID);
      expect(finding.severity).toBe('must');
      expect(finding.message).toContain('Fetch Data');
      expect(finding.message).toContain('error branch');
    });

    it('should FAIL for Google Sheets node without error branch', () => {
      const workflow = JSON.stringify({
        name: 'Google Sheets Without Error Branch',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Read Sheet', type: 'n8n-nodes-base.googleSheets', position: [200, 0], parameters: {} },
          { id: '3', name: 'Process', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Read Sheet', type: 'main', index: 0 }]] },
          'Read Sheet': { main: [[{ node: 'Process', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, RULE_ID);
    });

    it('should FAIL for Supabase node without error branch', () => {
      const workflow = JSON.stringify({
        name: 'Supabase Without Error Branch',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Insert Row', type: 'n8n-nodes-base.supabase', position: [200, 0], parameters: {} },
          { id: '3', name: 'Done', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Insert Row', type: 'main', index: 0 }]] },
          'Insert Row': { main: [[{ node: 'Done', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(1);
      expectFindingWithRule(findings, RULE_ID);
    });
  });

  describe('error-prone nodes WITH error branch (should pass)', () => {
    it('should PASS when node has error edge (second output / red connector)', () => {
      const workflow = JSON.stringify({
        name: 'HTTP With Error Branch',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Fetch Data', type: 'n8n-nodes-base.httpRequest', position: [200, 0], parameters: { onError: 'continueErrorOutput' } },
          { id: '3', name: 'Process', type: 'n8n-nodes-base.code', position: [400, 0], parameters: {} },
          { id: '4', name: 'Handle Error', type: 'n8n-nodes-base.code', position: [400, 200], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]] },
          'Fetch Data': { main: [
            [{ node: 'Process', type: 'main', index: 0 }],
            [{ node: 'Handle Error', type: 'main', index: 0 }],
          ]},
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });

    it('should PASS when node connects to an error handler node', () => {
      const workflow = JSON.stringify({
        name: 'HTTP With Stop And Error',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Fetch Data', type: 'n8n-nodes-base.httpRequest', position: [200, 0], parameters: {} },
          { id: '3', name: 'Stop And Error', type: 'n8n-nodes-base.stopAndError', position: [400, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Fetch Data', type: 'main', index: 0 }]] },
          'Fetch Data': { main: [[{ node: 'Stop And Error', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expectNoFindingWithRule(findings, RULE_ID);
    });
  });

  describe('non-error-prone nodes (should NOT trigger)', () => {
    it('should PASS for Code node without error branch', () => {
      const workflow = JSON.stringify({
        name: 'Code Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Transform', type: 'n8n-nodes-base.code', position: [200, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Transform', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for IF node without error branch', () => {
      const workflow = JSON.stringify({
        name: 'IF Workflow',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Check', type: 'n8n-nodes-base.if', position: [200, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Check', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty workflow', () => {
      const workflow = JSON.stringify({
        name: 'Empty',
        nodes: [],
        connections: {},
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should report multiple error-prone nodes without error branches', () => {
      const workflow = JSON.stringify({
        name: 'Multiple API Calls',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Fetch Users', type: 'n8n-nodes-base.httpRequest', position: [200, 0], parameters: {} },
          { id: '3', name: 'Fetch Orders', type: 'n8n-nodes-base.httpRequest', position: [400, 0], parameters: {} },
          { id: '4', name: 'Done', type: 'n8n-nodes-base.code', position: [600, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Fetch Users', type: 'main', index: 0 }]] },
          'Fetch Users': { main: [[{ node: 'Fetch Orders', type: 'main', index: 0 }]] },
          'Fetch Orders': { main: [[{ node: 'Done', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(2);
    });

    it('should include nodeId in findings', () => {
      const workflow = JSON.stringify({
        name: 'Node ID Test',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: 'http-abc-123', name: 'API Call', type: 'n8n-nodes-base.httpRequest', position: [200, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'API Call', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings[0].nodeId).toBe('http-abc-123');
    });

    it('should PASS for chainLlm parent node (not error-prone by type)', () => {
      const workflow = JSON.stringify({
        name: 'Chain LLM',
        nodes: [
          { id: '1', name: 'Webhook', type: 'n8n-nodes-base.webhook', position: [0, 0], parameters: {} },
          { id: '2', name: 'Classify', type: '@n8n/n8n-nodes-langchain.chainLlm', position: [200, 0], parameters: {} },
        ],
        connections: {
          'Webhook': { main: [[{ node: 'Classify', type: 'main', index: 0 }]] },
        },
        settings: { executionOrder: 'v1' },
      });
      const graph = parseN8n(workflow);
      const findings = errorBranchRequired(graph, ctx);

      expect(findings).toHaveLength(0);
    });
  });
});
