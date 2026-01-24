/**
 * Tests for LLM-OUTPUT-ACCESS Script
 *
 * Script: Detects incorrect LLM chain output access patterns when
 * using structured output parsers. The output must be accessed via
 * .output prefix (e.g., $json.output.field, not $json.field)
 */

import { describe, it, expect } from 'vitest';
import { checkLlmOutputAccess, metadata } from '../../../../src/validation/workflow-scripts/llm-output-access.js';
import { expectFindingWithRule, expectNoFindingWithRule } from '../../../helpers/test-utils.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file for fixtures path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

/**
 * Load a fixture file from the local fixtures folder
 */
function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_PATH, filename), 'utf-8');
}

describe('LLM-OUTPUT-ACCESS Script', () => {
  const testPath = 'test-workflow.json';

  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('LLM-OUTPUT-ACCESS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have ai-nodes category', () => {
      expect(metadata.category).toBe('ai-nodes');
    });
  });

  describe('valid content - direct access with .output', () => {
    it('should PASS when using $json.output.fieldName in IF node', () => {
      const content = loadFixture('valid-direct-access.json');
      const findings = checkLlmOutputAccess(content, 'valid-direct-access.json');

      expect(findings).toHaveLength(0);
    });

    it('should PASS for $json.output.field in template expression', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'output-parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'IF',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [{ leftValue: '={{ $json.output.confidence }}' }],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid content - named reference with .output', () => {
    it('should PASS when using $(NodeName).first().json.output.fieldName', () => {
      const content = loadFixture('valid-named-reference.json');
      const findings = checkLlmOutputAccess(content, 'valid-named-reference.json');

      expect(findings).toHaveLength(0);
    });

    it('should PASS for named reference in Code node jsCode', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'Translate',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'set-001',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: "const result = $('Translate').first().json.output.translated_text;",
            },
          },
        ],
        connections: {
          Translate: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
          Set: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'Translate', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid content - direct access without .output', () => {
    it('should FAIL when using $json.fieldName without .output prefix', () => {
      const content = loadFixture('invalid-direct-access.json');
      const findings = checkLlmOutputAccess(content, 'invalid-direct-access.json');

      expect(findings.length).toBeGreaterThan(0);
      const finding = expectFindingWithRule(findings, 'LLM-OUTPUT-ACCESS');
      expect(finding.severity).toBe('must');
      expect(finding.message).toContain('output');
    });

    it('should FAIL for $json.confidence in IF condition', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'IF',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [{ leftValue: '={{ $json.confidence }}' }],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'LLM-OUTPUT-ACCESS');
    });

    it('should provide nodeId in finding', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'Check Result',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [{ leftValue: '={{ $json.result }}' }],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'Check Result', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].nodeId).toBe('if-001');
    });
  });

  describe('invalid content - named reference without .output', () => {
    it('should FAIL when using $(NodeName).first().json.fieldName without .output', () => {
      const content = loadFixture('invalid-named-reference.json');
      const findings = checkLlmOutputAccess(content, 'invalid-named-reference.json');

      expect(findings.length).toBeGreaterThan(0);
      expectFindingWithRule(findings, 'LLM-OUTPUT-ACCESS');
    });

    it('should FAIL for $("Translate").first().json.translated_text', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'Translate',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'set-001',
            name: 'Set',
            type: 'n8n-nodes-base.set',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: "const result = $('Translate').first().json.translated_text;",
            },
          },
        ],
        connections: {
          Translate: { main: [[{ node: 'Set', type: 'main', index: 0 }]] },
          Set: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'Translate', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);
      const finding = expectFindingWithRule(findings, 'LLM-OUTPUT-ACCESS');
      expect(finding.message).toContain('Translate');
    });

    it('should FAIL for $(NodeName).item.json.fieldName', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'Analyze',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: "const result = $('Analyze').item.json.analysis;",
            },
          },
        ],
        connections: {
          Analyze: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'Analyze', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases - should NOT apply rule', () => {
    it('should NOT apply to agent nodes', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'agent-001',
            name: 'Agent',
            type: '@n8n/n8n-nodes-langchain.agent',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const result = $json.response;',
            },
          },
        ],
        connections: {
          Agent: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should NOT apply to chainLlm without hasOutputParser', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: false },
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const result = $json.text;',
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should NOT flag defensive patterns with fallback', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const answer = $json.output?.answer || $json.answer;',
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      // This defensive pattern is acceptable
      expect(findings).toHaveLength(0);
    });

    it('should NOT apply to nodes not connected to chainLlm', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'webhook-001',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const data = $json.body;', // This is from webhook, not LLM
            },
          },
        ],
        connections: {
          Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          'LLM Chain': { main: [[]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle workflows without any chainLlm nodes', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'webhook-001',
            name: 'Webhook',
            type: 'n8n-nodes-base.webhook',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: 'const data = $json.body;',
            },
          },
        ],
        connections: {
          Webhook: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  describe('auto-fix functionality', () => {
    it('should provide a fix function for direct access', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'IF',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [{ leftValue: '={{ $json.confidence }}' }],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should correctly fix $json.field to $json.output.field', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'IF',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [{ leftValue: '={{ $json.confidence }}' }],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toContain('$json.output.confidence');
      expect(fixed).not.toMatch(/\$json\.confidence[^.]/);
    });

    it('should correctly fix named reference', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'Translate',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'code-001',
            name: 'Code',
            type: 'n8n-nodes-base.code',
            parameters: {
              jsCode: "const result = $('Translate').first().json.translated_text;",
            },
          },
        ],
        connections: {
          Translate: { main: [[{ node: 'Code', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'Translate', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThan(0);

      const fixed = findings[0].fix?.apply(content);
      expect(fixed).toContain(".json.output.translated_text");
    });
  });

  describe('multiple errors in same workflow', () => {
    it('should detect multiple incorrect access patterns', () => {
      const content = JSON.stringify({
        nodes: [
          {
            id: 'chain-001',
            name: 'LLM Chain',
            type: '@n8n/n8n-nodes-langchain.chainLlm',
            parameters: { hasOutputParser: true },
          },
          {
            id: 'parser-001',
            name: 'Parser',
            type: '@n8n/n8n-nodes-langchain.outputParserStructured',
            parameters: {},
          },
          {
            id: 'if-001',
            name: 'IF',
            type: 'n8n-nodes-base.if',
            parameters: {
              conditions: {
                conditions: [
                  { leftValue: '={{ $json.confidence }}' },
                  { rightValue: '={{ $json.category }}' },
                ],
              },
            },
          },
        ],
        connections: {
          'LLM Chain': { main: [[{ node: 'IF', type: 'main', index: 0 }]] },
          Parser: { ai_outputParser: [[{ node: 'LLM Chain', type: 'ai_outputParser', index: 0 }]] },
        },
      });

      const findings = checkLlmOutputAccess(content, testPath);
      expect(findings.length).toBeGreaterThanOrEqual(2);
    });
  });
});
