/**
 * Tests for WORKFLOW-SANITIZATION validator
 *
 * Validates that workflows don't contain n8n-generated properties:
 * - id (workflow ID from n8n)
 * - versionId (version tracking)
 * - meta (n8n metadata)
 * - active (n8n active status)
 * - tags (n8n tags)
 * - pinData (n8n pinned data)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { checkWorkflowSanitization, metadata } from '../../../../src/validation/workflow-scripts/workflow-sanitization.js';

const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_PATH, name), 'utf-8');
}

const testPath = '/test/workflow.json';

describe('WORKFLOW-SANITIZATION Script', () => {
  // ============================================================================
  // METADATA
  // ============================================================================
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('WORKFLOW-SANITIZATION');
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
  // VALID WORKFLOWS (clean)
  // ============================================================================
  describe('valid workflows', () => {
    it('should PASS when workflow has no forbidden properties', () => {
      const content = JSON.stringify({
        name: 'Clean Workflow',
        nodes: [],
        connections: {},
        settings: {
          errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
          executionOrder: 'v1',
        },
      });
      const findings = checkWorkflowSanitization(content, testPath);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for valid-sanitized.json fixture', () => {
      const content = loadFixture('valid-sanitized.json');
      const findings = checkWorkflowSanitization(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // INVALID: Contains forbidden properties
  // ============================================================================
  describe('invalid - contains id property', () => {
    it('should FAIL when workflow has "id" property', () => {
      const content = JSON.stringify({
        id: '12345-abcde-67890',
        name: 'Workflow with ID',
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('WORKFLOW-SANITIZATION');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('id');
    });
  });

  describe('invalid - contains versionId property', () => {
    it('should FAIL when workflow has "versionId" property', () => {
      const content = JSON.stringify({
        name: 'Workflow with versionId',
        versionId: 'v1-abc123',
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('versionId');
    });
  });

  describe('invalid - contains meta property', () => {
    it('should FAIL when workflow has "meta" property', () => {
      const content = JSON.stringify({
        name: 'Workflow with meta',
        meta: {
          instanceId: 'abc123',
          templateId: 'template-456',
        },
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('meta');
    });

    it('should FAIL for invalid-has-meta.json fixture', () => {
      const content = loadFixture('invalid-has-meta.json');
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('meta');
    });
  });

  describe('invalid - contains active property', () => {
    it('should FAIL when workflow has "active" property', () => {
      const content = JSON.stringify({
        name: 'Workflow with active',
        active: true,
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('active');
    });

    it('should FAIL when active is false (still forbidden)', () => {
      const content = JSON.stringify({
        name: 'Workflow with active false',
        active: false,
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('active');
    });
  });

  describe('invalid - contains tags property', () => {
    it('should FAIL when workflow has "tags" property', () => {
      const content = JSON.stringify({
        name: 'Workflow with tags',
        tags: [{ id: '1', name: 'production' }],
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('tags');
    });

    it('should FAIL when tags is empty array (still forbidden)', () => {
      const content = JSON.stringify({
        name: 'Workflow with empty tags',
        tags: [],
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('tags');
    });
  });

  describe('invalid - contains pinData property', () => {
    it('should FAIL when workflow has "pinData" property', () => {
      const content = JSON.stringify({
        name: 'Workflow with pinData',
        pinData: {
          'Node Name': [{ json: { data: 'test' } }],
        },
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('pinData');
    });

    it('should FAIL for invalid-has-pindata.json fixture', () => {
      const content = loadFixture('invalid-has-pindata.json');
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].message).toContain('pinData');
    });
  });

  describe('invalid - contains multiple forbidden properties', () => {
    it('should report all forbidden properties found', () => {
      const content = JSON.stringify({
        id: '12345',
        versionId: 'v1',
        name: 'Workflow with multiple forbidden',
        meta: {},
        active: true,
        tags: [],
        pinData: {},
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      // Should report all 6 forbidden properties
      expect(findings).toHaveLength(6);
    });

    it('should FAIL for invalid-multiple-forbidden.json fixture', () => {
      const content = loadFixture('invalid-multiple-forbidden.json');
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings.length).toBeGreaterThan(1);
    });
  });

  // ============================================================================
  // AUTO-FIX FUNCTIONALITY
  // ============================================================================
  describe('auto-fix functionality', () => {
    it('should provide fix function for each forbidden property', () => {
      const content = JSON.stringify({
        id: '12345',
        name: 'Workflow',
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings[0].fixable).toBe(true);
      expect(findings[0].fix).toBeDefined();
    });

    it('should correctly remove id property', () => {
      const content = JSON.stringify({
        id: '12345',
        name: 'Workflow',
        nodes: [],
      }, null, 2);
      const findings = checkWorkflowSanitization(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.id).toBeUndefined();
      expect(parsed.name).toBe('Workflow'); // Preserved
    });

    it('should correctly remove meta property', () => {
      const content = JSON.stringify({
        name: 'Workflow',
        meta: { instanceId: 'abc' },
        nodes: [],
      }, null, 2);
      const findings = checkWorkflowSanitization(content, testPath);
      const fixed = findings[0].fix!.apply(content);
      const parsed = JSON.parse(fixed);

      expect(parsed.meta).toBeUndefined();
      expect(parsed.name).toBe('Workflow'); // Preserved
    });

    it('should correctly remove all forbidden properties at once', () => {
      const content = JSON.stringify({
        id: '12345',
        versionId: 'v1',
        name: 'Workflow',
        meta: {},
        active: true,
        tags: [],
        pinData: {},
        nodes: [],
        settings: {},
      }, null, 2);
      
      // Apply all fixes
      let fixed = content;
      const findings = checkWorkflowSanitization(content, testPath);
      for (const finding of findings) {
        fixed = finding.fix!.apply(fixed);
      }
      const parsed = JSON.parse(fixed);

      expect(parsed.id).toBeUndefined();
      expect(parsed.versionId).toBeUndefined();
      expect(parsed.meta).toBeUndefined();
      expect(parsed.active).toBeUndefined();
      expect(parsed.tags).toBeUndefined();
      expect(parsed.pinData).toBeUndefined();
      expect(parsed.name).toBe('Workflow'); // Preserved
      expect(parsed.nodes).toBeDefined(); // Preserved
      expect(parsed.settings).toBeDefined(); // Preserved
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================
  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json {{{';
      const findings = checkWorkflowSanitization(content, testPath);
      expect(findings).toHaveLength(0); // Skip invalid JSON
    });

    it('should handle empty content', () => {
      const findings = checkWorkflowSanitization('', testPath);
      expect(findings).toHaveLength(0);
    });

    it('should handle empty object', () => {
      const content = JSON.stringify({});
      const findings = checkWorkflowSanitization(content, testPath);
      expect(findings).toHaveLength(0);
    });
  });

  // ============================================================================
  // ERROR MESSAGE QUALITY
  // ============================================================================
  describe('error message quality', () => {
    it('should include property name in error message', () => {
      const content = JSON.stringify({
        id: '12345',
        name: 'Workflow',
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings[0].message).toContain('id');
    });

    it('should explain why property should be removed', () => {
      const content = JSON.stringify({
        meta: {},
        name: 'Workflow',
        nodes: [],
      });
      const findings = checkWorkflowSanitization(content, testPath);

      expect(findings[0].raw_details).toContain('n8n');
    });
  });
});
