/**
 * Tests for WORKFLOW-FORMAT validator
 *
 * Validates that workflow JSON files use the canonical formatting:
 * JSON.stringify(parsed, null, 2) + '\n'
 */

import { describe, it, expect } from 'vitest';
import { checkWorkflowFormat, metadata } from '../../../../src/validation/workflow-scripts/workflow-format.js';

const testPath = '/test/workflow.json';

/** Canonical format helper */
function canonical(obj: any): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

function makeWorkflow(overrides: Partial<{
  name: string;
  nodes: any[];
  connections: any;
  settings: any;
}> = {}): any {
  return {
    name: overrides.name ?? 'Test Workflow',
    nodes: overrides.nodes ?? [],
    connections: overrides.connections ?? {},
    settings: overrides.settings ?? { executionOrder: 'v1' },
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('WORKFLOW-FORMAT Script', () => {
  // ===========================================================================
  // METADATA
  // ===========================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('WORKFLOW-FORMAT');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should be in "formatting" category', () => {
      expect(metadata.category).toBe('formatting');
    });
  });

  // ===========================================================================
  // VALID — No findings expected
  // ===========================================================================
  describe('valid workflows', () => {
    it('should PASS for already canonically formatted JSON', () => {
      const content = canonical(makeWorkflow());
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for minimal valid JSON', () => {
      const content = canonical({});
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for workflow with nodes and connections', () => {
      const wf = makeWorkflow({
        nodes: [
          { id: 'n1', name: 'Code', type: 'n8n-nodes-base.code', position: [0, 0] },
        ],
        connections: { Code: { main: [[{ node: 'Next', type: 'main', index: 0 }]] } },
      });
      const content = canonical(wf);
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle invalid JSON gracefully — no finding', () => {
      const findings = checkWorkflowFormat('not json {{', testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ===========================================================================
  // INVALID — Findings expected
  // ===========================================================================
  describe('invalid formatting', () => {
    it('should FAIL for JSON with 4-space indent', () => {
      const content = JSON.stringify(makeWorkflow(), null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WORKFLOW-FORMAT');
    });

    it('should FAIL for JSON with tab indent', () => {
      const content = JSON.stringify(makeWorkflow(), null, '\t') + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for minified JSON', () => {
      const content = JSON.stringify(makeWorkflow()) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for JSON missing final newline', () => {
      const content = JSON.stringify(makeWorkflow(), null, 2); // no trailing \n
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for JSON with trailing whitespace', () => {
      const content = JSON.stringify(makeWorkflow(), null, 2) + '  \n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for JSON with CRLF line endings', () => {
      const content = JSON.stringify(makeWorkflow(), null, 2).replace(/\n/g, '\r\n') + '\r\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });

    it('should FAIL for JSON with inline short arrays', () => {
      // Simulate Prettier-style inline array that JSON.stringify would expand
      const wf = makeWorkflow({
        nodes: [{ id: 'n1', name: 'Code', type: 'n8n-nodes-base.code', position: [0, 0] }],
      });
      // Hand-craft content with inline array
      const canonical_content = canonical(wf);
      // Replace the expanded position array with inline
      const inline_content = canonical_content.replace(
        /\[\n\s+0,\n\s+0\n\s+\]/,
        '[0, 0]'
      );
      // Only test if the replacement actually happened
      if (inline_content !== canonical_content) {
        const findings = checkWorkflowFormat(inline_content, testPath);
        expect(findings).toHaveLength(1);
      }
    });

    it('should FAIL for JSON with extra blank lines', () => {
      const content = JSON.stringify(makeWorkflow(), null, 2).replace('{\n', '{\n\n') + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings).toHaveLength(1);
    });
  });

  // ===========================================================================
  // AUTO-FIX
  // ===========================================================================
  describe('auto-fix', () => {
    it('should be fixable', () => {
      const content = JSON.stringify(makeWorkflow(), null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should fix 4-space indent to 2-space', () => {
      const content = JSON.stringify(makeWorkflow(), null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(fixed).toBe(canonical(makeWorkflow()));
    });

    it('should fix missing final newline', () => {
      const wf = makeWorkflow();
      const content = JSON.stringify(wf, null, 2); // no \n
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(fixed).toBe(canonical(wf));
    });

    it('should fix CRLF to LF', () => {
      const wf = makeWorkflow();
      const content = JSON.stringify(wf, null, 2).replace(/\n/g, '\r\n') + '\r\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(fixed).toBe(canonical(wf));
    });

    it('should fix minified JSON', () => {
      const wf = makeWorkflow();
      const content = JSON.stringify(wf) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(fixed).toBe(canonical(wf));
    });

    it('should produce valid JSON after fix', () => {
      const content = JSON.stringify(makeWorkflow(), null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      expect(() => JSON.parse(fixed)).not.toThrow();
    });

    it('should be idempotent — applying fix twice gives same result', () => {
      const content = JSON.stringify(makeWorkflow(), null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed1 = findings[0].fix!.apply(content);
      // Run check again on fixed content — should pass
      const findings2 = checkWorkflowFormat(fixed1, testPath);
      expect(findings2).toHaveLength(0);
    });

    it('should preserve all data through round-trip', () => {
      const wf = makeWorkflow({
        nodes: [
          {
            id: 'n1',
            name: 'Complex Node',
            type: 'n8n-nodes-base.code',
            position: [100, 200],
            parameters: {
              code: 'const x = "hello\\nworld";',
              nested: { deep: { value: true } },
              list: [1, 2, 3],
            },
          },
        ],
        connections: {
          'Complex Node': { main: [[{ node: 'Next', type: 'main', index: 0 }]] },
        },
      });
      // Start with bad formatting
      const content = JSON.stringify(wf, null, 4) + '\n';
      const findings = checkWorkflowFormat(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);
      expect(parsed).toEqual(wf);
    });
  });
});
