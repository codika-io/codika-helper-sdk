/**
 * Tests for LLM-MODEL-ID validator
 *
 * Validates that LLM model nodes use current, non-deprecated model IDs.
 * Uses an allowlist approach — any model not in the allowlist is flagged.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkLlmModelId, metadata } from '../../../../src/validation/workflow-scripts/llm-model-id.js';

const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_PATH, name), 'utf-8');
}

const testPath = '/test/workflow.json';

describe('LLM-MODEL-ID Script', () => {
  // ============================================================================
  // METADATA
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('LLM-MODEL-ID');
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
    it('should PASS when model is in the allowlist (claude-sonnet-4)', () => {
      const content = loadFixture('valid-current-model.json');
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when workflow has no LLM nodes', () => {
      const content = loadFixture('valid-no-llm-nodes.json');
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for claude-opus-4', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-opus-4-20250514', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for claude-haiku-4-5', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-haiku-4-5-20251001', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for non-Anthropic node types', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'OpenAI',
          type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
          typeVersion: 1,
          position: [0, 0],
          parameters: { model: 'gpt-3.5-turbo' },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // INVALID: Deprecated models
  // ============================================================================
  describe('invalid - deprecated Anthropic models', () => {
    it('should FAIL for claude-3-5-sonnet-20241022', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('LLM-MODEL-ID');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('claude-3-5-sonnet-20241022');
    });

    it('should FAIL for claude-3-5-sonnet-20240620', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-5-sonnet-20240620', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('claude-3-5-sonnet-20240620');
    });

    it('should FAIL for claude-3-opus-20240229', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-opus-20240229', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
    });

    it('should FAIL for claude-3-haiku-20240307', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-haiku-20240307', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
    });

    it('should FAIL for claude-3-7-sonnet-20250219', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-7-sonnet-20250219', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
    });

    it('should FAIL for completely unknown model IDs', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'some-made-up-model', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('some-made-up-model');
    });

    it('should report one finding per deprecated model node', () => {
      const content = loadFixture('invalid-multiple-deprecated.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings).toHaveLength(2);
      expect(findings[0].nodeId).toBe('claude-001');
      expect(findings[1].nodeId).toBe('claude-002');
    });
  });

  // ============================================================================
  // TIER-AWARE REPLACEMENT
  // ============================================================================
  describe('tier-aware replacement', () => {
    it('should suggest sonnet replacement for deprecated sonnet models', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-5-sonnet-20241022', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-sonnet-4-20250514');
    });

    it('should suggest haiku replacement for deprecated haiku models', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-haiku-20240307', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-haiku-4-5-20251001');
    });

    it('should suggest opus replacement for deprecated opus models', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'claude-3-opus-20240229', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-opus-4-20250514');
    });

    it('should suggest default (sonnet) for unknown model names', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: { __rl: true, value: 'some-unknown-model', mode: 'list' } },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-sonnet-4-20250514');
    });
  });

  // ============================================================================
  // AUTO-FIX FUNCTIONALITY
  // ============================================================================
  describe('auto-fix functionality', () => {
    it('should provide a fix function', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should replace deprecated model with correct replacement (rl pattern)', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const modelNode = parsed.nodes.find((n: any) => n.id === 'claude-001');

      expect(modelNode.parameters.model.value).toBe('claude-sonnet-4-20250514');
    });

    it('should update cachedResultName when present', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      const modelNode = parsed.nodes.find((n: any) => n.id === 'claude-001');

      expect(modelNode.parameters.model.cachedResultName).toBe('Anthropic Sonnet');
    });

    it('should fix plain string model parameter', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: 'claude-3-5-sonnet-20241022' },
        }],
        connections: {},
      }, null, 2);
      const findings = checkLlmModelId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.nodes[0].parameters.model).toBe('claude-sonnet-4-20250514');
    });

    it('should fix all deprecated models independently', () => {
      const content = loadFixture('invalid-multiple-deprecated.json');
      const findings = checkLlmModelId(content, testPath);

      let fixed = content;
      for (const finding of findings) {
        fixed = finding.fix!.apply(fixed);
      }
      const parsed = JSON.parse(fixed);

      const translationModel = parsed.nodes.find((n: any) => n.id === 'claude-001');
      const classificationModel = parsed.nodes.find((n: any) => n.id === 'claude-002');

      expect(translationModel.parameters.model.value).toBe('claude-sonnet-4-20250514');
      expect(classificationModel.parameters.model.value).toBe('claude-haiku-4-5-20251001');
    });

    it('should produce valid JSON after fix', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);
      const fixed = findings[0].fix!.apply(content);

      expect(() => JSON.parse(fixed)).not.toThrow();
    });

    it('should pass validation after fix', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const recheck = checkLlmModelId(fixed, testPath);

      expect(recheck).toHaveLength(0);
    });
  });

  // ============================================================================
  // MODEL PARAMETER FORMATS
  // ============================================================================
  describe('model parameter formats', () => {
    it('should detect deprecated model in __rl pattern', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: {
            model: { __rl: true, value: 'claude-3-5-sonnet-20241022', mode: 'list' },
          },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should detect deprecated model in plain string format', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: 'claude-3-5-sonnet-20241022' },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should skip nodes with no model parameter', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { options: {} },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const findings = checkLlmModelId('not valid json {{{', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const findings = checkLlmModelId('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty object', () => {
      const findings = checkLlmModelId(JSON.stringify({}), testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with empty nodes array', () => {
      const content = JSON.stringify({ name: 'Test', nodes: [], connections: {} });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle workflow with null nodes', () => {
      const content = JSON.stringify({ name: 'Test', nodes: null });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle node with model as empty object', () => {
      const content = JSON.stringify({
        name: 'Test',
        nodes: [{
          id: 'n1',
          name: 'Claude',
          type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
          typeVersion: 1.3,
          position: [0, 0],
          parameters: { model: {} },
        }],
        connections: {},
      });
      const findings = checkLlmModelId(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    it('should include the deprecated model ID in the message', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-3-5-sonnet-20241022');
    });

    it('should include the recommended replacement in the message', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('claude-sonnet-4-20250514');
    });

    it('should include the node name in the message', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('Claude Model');
    });

    it('should include the provider name in the message', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].message).toContain('Anthropic');
    });

    it('should list all allowed models in raw_details', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].raw_details).toContain('claude-sonnet-4-20250514');
      expect(findings[0].raw_details).toContain('claude-opus-4-20250514');
      expect(findings[0].raw_details).toContain('claude-haiku-4-5-20251001');
    });

    it('should include nodeId for the affected node', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].nodeId).toBe('claude-001');
    });

    it('should include a guideRef', () => {
      const content = loadFixture('invalid-deprecated-sonnet.json');
      const findings = checkLlmModelId(content, testPath);

      expect(findings[0].guideRef).toBeDefined();
      expect(findings[0].guideRef!.path).toContain('anthropic');
    });
  });
});
