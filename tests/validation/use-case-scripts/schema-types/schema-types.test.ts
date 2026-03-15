/**
 * Tests for SCHEMA-TYPES Script
 *
 * Validates schema field types inside input/output schema definitions.
 * Only checks type: values within schema contexts — not triggers, not TypeScript assertions.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { checkSchemaTypes, metadata } from '../../../../src/validation/use-case-scripts/schema-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FIXTURES_PATH = join(__dirname, 'fixtures');
const TEMP_PATH = join(__dirname, 'temp-fixtures');

function createTempUseCase(configContent: string): string {
  const useCasePath = join(TEMP_PATH, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(useCasePath, 'workflows'), { recursive: true });
  writeFileSync(join(useCasePath, 'config.ts'), configContent);
  writeFileSync(join(useCasePath, 'workflows', 'main.json'), '{}');
  return useCasePath;
}

// Clean up temp fixtures after all tests
import { afterAll } from 'vitest';
afterAll(() => {
  try { rmSync(TEMP_PATH, { recursive: true, force: true }); } catch {}
});

describe('SCHEMA-TYPES Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('SCHEMA-TYPES');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid schemas', () => {
    it('should PASS for all valid field types in a schema function', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [
    { key: "name", type: "string", label: "Name" },
    { key: "bio", type: "text", label: "Bio" },
    { key: "age", type: "number", label: "Age" },
    { key: "active", type: "boolean", label: "Active" },
    { key: "dob", type: "date", label: "DOB" },
    { key: "role", type: "select", label: "Role" },
    { key: "tags", type: "multiselect", label: "Tags" },
    { key: "pref", type: "radio", label: "Preference" },
    { key: "doc", type: "file", label: "Document" },
    { key: "items", type: "array", label: "Items" },
    { key: "addr", type: "object", label: "Address" },
    { key: "rows", type: "objectArray", label: "Rows" },
    { type: "section", title: "Group" },
  ];
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when config has no schemas', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return { title: 'Test', workflows: [] };
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should NOT flag trigger types (they are outside schema context)', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [
        { type: "http" as const },
        { type: "schedule" as const },
        { type: "service_event" as const },
        { type: "subworkflow" as const },
        { type: "data_ingestion" as const },
      ],
    }],
  };
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for inline inputSchema with valid types', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { name: "phone", type: "string" },
          { name: "count", type: "number" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid schemas', () => {
    it('should FAIL for unknown type in schema function', async () => {
      const path = createTempUseCase(`
function getOutputSchema(): FormOutputSchema {
  return [
    { key: "status", type: "strig", label: "Status" },
  ];
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('SCHEMA-TYPES');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('strig');
    });

    it('should include valid types in error details', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [{ key: "x", type: "unknown_type", label: "X" }];
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings[0].raw_details).toContain('string');
      expect(findings[0].raw_details).toContain('text');
      expect(findings[0].raw_details).toContain('number');
    });

    it('should report line number', async () => {
      const path = createTempUseCase(`
function getDeploymentInputSchema() {
  return [
    { key: "ok", type: "string" },
    { key: "bad", type: "invalid_type" },
  ];
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBeDefined();
      expect(findings[0].line).toBeGreaterThan(0);
    });

    it('should catch multiple invalid types', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [
    { key: "a", type: "foo" },
    { key: "b", type: "bar" },
    { key: "c", type: "string" },
  ];
}
      `);
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(2);
      expect(findings[0].message).toContain('foo');
      expect(findings[1].message).toContain('bar');
    });
  });

  describe('edge cases', () => {
    it('should handle missing config.ts gracefully', async () => {
      const useCasePath = join(FIXTURES_PATH, 'missing-config');
      const findings = await checkSchemaTypes(useCasePath);
      expect(findings).toHaveLength(0);
    });

    it('should handle non-existent path gracefully', async () => {
      const findings = await checkSchemaTypes('/non/existent/path');
      expect(findings).toHaveLength(0);
    });

    it('should not flag type: "const" (TypeScript assertion)', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [{ key: "x", type: "string" as const }];
}
      `);
      // "as const" would cause a second match of type: "const" — should be skipped
      const findings = await checkSchemaTypes(path);
      expect(findings).toHaveLength(0);
    });
  });
});
