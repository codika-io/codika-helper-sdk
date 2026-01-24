/**
 * Tests for WORKFLOW-SANITIZATION validation script
 *
 * This script validates that workflows don't contain n8n-generated properties
 * that should be removed before committing:
 * - id
 * - versionId
 * - meta
 * - active
 * - tags
 * - pinData
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { checkWorkflowSanitization, RULE_ID, metadata, FORBIDDEN_PROPERTIES } from '../../../../src/validation/workflow-scripts/workflow-sanitization.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');

function loadFixture(name: string): string {
  return readFileSync(join(FIXTURES_PATH, name), 'utf-8');
}

describe('WORKFLOW-SANITIZATION Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(RULE_ID).toBe('WORKFLOW-SANITIZATION');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });

    it('should be marked as fixable', () => {
      expect(metadata.fixable).toBe(true);
    });

    it('should have guideRef', () => {
      expect(metadata.guideRef).toBeDefined();
      expect(metadata.guideRef?.path).toBe('use-case-guide.md');
    });

    it('should define all forbidden properties', () => {
      expect(FORBIDDEN_PROPERTIES).toContain('id');
      expect(FORBIDDEN_PROPERTIES).toContain('versionId');
      expect(FORBIDDEN_PROPERTIES).toContain('meta');
      expect(FORBIDDEN_PROPERTIES).toContain('active');
      expect(FORBIDDEN_PROPERTIES).toContain('tags');
      expect(FORBIDDEN_PROPERTIES).toContain('pinData');
    });
  });

  describe('valid workflows', () => {
    it('should PASS when workflow has none of the forbidden properties', () => {
      const content = loadFixture('valid-clean.json');
      const findings = checkWorkflowSanitization(content, 'valid-clean.json');

      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid workflows - individual properties', () => {
    it('should FAIL when workflow has "id" property', () => {
      const content = loadFixture('invalid-has-id.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-id.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const idFinding = findings.find(f => f.message.includes('id'));
      expect(idFinding).toBeDefined();
      expect(idFinding?.severity).toBe('must');
      expect(idFinding?.guideRef).toBeDefined();
    });

    it('should FAIL when workflow has "meta" property', () => {
      const content = loadFixture('invalid-has-meta.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-meta.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const metaFinding = findings.find(f => f.message.includes('meta'));
      expect(metaFinding).toBeDefined();
    });

    it('should FAIL when workflow has "pinData" property', () => {
      const content = loadFixture('invalid-has-pindata.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-pindata.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      const pinDataFinding = findings.find(f => f.message.includes('pinData'));
      expect(pinDataFinding).toBeDefined();
    });
  });

  describe('invalid workflows - multiple properties', () => {
    it('should detect all forbidden properties in a workflow', () => {
      const content = loadFixture('invalid-multiple.json');
      const findings = checkWorkflowSanitization(content, 'invalid-multiple.json');

      // Should find id, versionId, meta, active, tags, pinData (6 properties)
      expect(findings.length).toBe(6);

      const foundProps = findings.map(f => f.message);
      expect(foundProps.some(m => m.includes('id'))).toBe(true);
      expect(foundProps.some(m => m.includes('versionId'))).toBe(true);
      expect(foundProps.some(m => m.includes('meta'))).toBe(true);
      expect(foundProps.some(m => m.includes('active'))).toBe(true);
      expect(foundProps.some(m => m.includes('tags'))).toBe(true);
      expect(foundProps.some(m => m.includes('pinData'))).toBe(true);
    });
  });

  describe('auto-fix functionality', () => {
    it('should provide a fix function for each forbidden property', () => {
      const content = loadFixture('invalid-has-id.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-id.json');

      expect(findings.every(f => f.fixable)).toBe(true);
      expect(findings.every(f => f.fix !== undefined)).toBe(true);
    });

    it('should correctly remove "id" property when fix is applied', () => {
      const content = loadFixture('invalid-has-id.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-id.json');

      const idFinding = findings.find(f => f.message.includes('"id"'));
      expect(idFinding?.fix).toBeDefined();

      if (idFinding?.fix) {
        const fixedContent = idFinding.fix.apply(content);
        const fixedWorkflow = JSON.parse(fixedContent);
        expect(fixedWorkflow.id).toBeUndefined();
        // Should preserve other properties
        expect(fixedWorkflow.name).toBeDefined();
        expect(fixedWorkflow.nodes).toBeDefined();
      }
    });

    it('should correctly remove "meta" property when fix is applied', () => {
      const content = loadFixture('invalid-has-meta.json');
      const findings = checkWorkflowSanitization(content, 'invalid-has-meta.json');

      const metaFinding = findings.find(f => f.message.includes('"meta"'));
      expect(metaFinding?.fix).toBeDefined();

      if (metaFinding?.fix) {
        const fixedContent = metaFinding.fix.apply(content);
        const fixedWorkflow = JSON.parse(fixedContent);
        expect(fixedWorkflow.meta).toBeUndefined();
      }
    });

    it('should correctly remove all forbidden properties when all fixes are applied', () => {
      const content = loadFixture('invalid-multiple.json');
      const findings = checkWorkflowSanitization(content, 'invalid-multiple.json');

      let currentContent = content;
      for (const finding of findings) {
        if (finding.fix) {
          currentContent = finding.fix.apply(currentContent);
        }
      }

      const fixedWorkflow = JSON.parse(currentContent);
      expect(fixedWorkflow.id).toBeUndefined();
      expect(fixedWorkflow.versionId).toBeUndefined();
      expect(fixedWorkflow.meta).toBeUndefined();
      expect(fixedWorkflow.active).toBeUndefined();
      expect(fixedWorkflow.tags).toBeUndefined();
      expect(fixedWorkflow.pinData).toBeUndefined();

      // Should preserve essential properties
      expect(fixedWorkflow.name).toBeDefined();
      expect(fixedWorkflow.nodes).toBeDefined();
      expect(fixedWorkflow.connections).toBeDefined();
      expect(fixedWorkflow.settings).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle invalid JSON gracefully', () => {
      const content = 'not valid json';
      const findings = checkWorkflowSanitization(content, 'invalid.json');

      expect(findings.length).toBeGreaterThanOrEqual(1);
      expect(findings[0].message.includes('parse') || findings[0].message.includes('JSON')).toBe(true);
    });
  });
});
