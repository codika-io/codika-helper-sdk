/**
 * Tests for SUBWKFL-MIN-PARAMS rule
 *
 * This rule validates that sub-workflows have at least 1 input parameter.
 * n8n enforces minRequiredFields: 1 on ExecuteWorkflowTrigger nodes.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseN8n } from '@replikanti/flowlint-core';
import type { Graph } from '@replikanti/flowlint-core';
import { subworkflowMinParams, metadata, RULE_ID } from '../../../../src/validation/rules/subworkflow-min-params.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): { content: string; graph: Graph } {
  const filepath = join(FIXTURES_PATH, name);
  const content = readFileSync(filepath, 'utf-8');
  const graph = parseN8n(content);
  return { content, graph };
}

function createRuleContext(path: string) {
  return {
    path,
    nodeLines: {},
  };
}

describe('SUBWKFL-MIN-PARAMS Rule', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('SUBWKFL-MIN-PARAMS');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('specific/sub-workflows.md');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when sub-workflow has input parameters', () => {
      const { graph } = loadFixture('valid-has-params.json');
      const ctx = createRuleContext('valid-has-params.json');

      const findings = subworkflowMinParams(graph, ctx);

      expect(findings).toHaveLength(0);
    });

    it('should PASS for parent workflows (rule does not apply)', () => {
      const { graph } = loadFixture('parent-workflow.json');
      const ctx = createRuleContext('parent-workflow.json');

      const findings = subworkflowMinParams(graph, ctx);

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows', () => {
    it('should FAIL when sub-workflow has empty input parameters array', () => {
      const { graph } = loadFixture('invalid-no-params.json');
      const ctx = createRuleContext('invalid-no-params.json');

      const findings = subworkflowMinParams(graph, ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('at least 1');
      expect(findings[0].guideRef).toBeDefined();
    });

    it('should FAIL when sub-workflow has no workflowInputs property', () => {
      const { graph } = loadFixture('invalid-missing-inputs.json');
      const ctx = createRuleContext('invalid-missing-inputs.json');

      const findings = subworkflowMinParams(graph, ctx);

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].message).toContain('at least 1');
    });

    it('should include helpful error message about minRequiredFields', () => {
      const { graph } = loadFixture('invalid-no-params.json');
      const ctx = createRuleContext('invalid-no-params.json');

      const findings = subworkflowMinParams(graph, ctx);

      expect(findings[0].raw_details).toContain('minRequiredFields');
    });
  });
});
