/**
 * Tests for INPUT-SCHEMA-FORMAT Script
 *
 * Validates that inputSchema fields use `key` instead of legacy `name`.
 */

import { describe, it, expect, afterAll } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { checkInputSchemaFormat, metadata } from '../../../../src/validation/use-case-scripts/input-schema-format.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMP_PATH = join(__dirname, 'temp-fixtures');

function createTempUseCase(configContent: string): string {
  const useCasePath = join(TEMP_PATH, `test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(join(useCasePath, 'workflows'), { recursive: true });
  writeFileSync(join(useCasePath, 'config.ts'), configContent);
  writeFileSync(join(useCasePath, 'workflows', 'main.json'), '{}');
  return useCasePath;
}

afterAll(() => {
  try { rmSync(TEMP_PATH, { recursive: true, force: true }); } catch {}
});

describe('INPUT-SCHEMA-FORMAT Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('INPUT-SCHEMA-FORMAT');
    });

    it('should have "should" severity', () => {
      expect(metadata.severity).toBe('should');
    });

    it('should not be fixable', () => {
      expect(metadata.fixable).toBe(false);
    });
  });

  describe('valid configs (using key)', () => {
    it('should PASS when subworkflow inputSchema uses key', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { key: "text", type: "string" },
          { key: "count", type: "number" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when HTTP trigger inputSchema uses key', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "http" as const,
        inputSchema: [
          { key: "message", type: "string", label: "Message" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS when there are no inputSchema blocks', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "schedule" as const }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for inputSchema from a function reference', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [
    { key: "text", type: "text", label: "Text" },
  ];
}

export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "http" as const,
        inputSchema: getInputSchema(),
      }],
    }],
  };
}
      `);
      // No inline inputSchema array to scan
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(0);
    });
  });

  describe('invalid configs (using legacy name)', () => {
    it('should FAIL when subworkflow inputSchema uses name', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { name: "text", type: "string" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('INPUT-SCHEMA-FORMAT');
      expect(findings[0].severity).toBe('should');
      expect(findings[0].message).toContain('name');
      expect(findings[0].message).toContain('text');
    });

    it('should FAIL for multiple legacy name fields', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { name: "text", type: "string" },
          { name: "count", type: "number" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(2);
      expect(findings[0].message).toContain('text');
      expect(findings[1].message).toContain('count');
    });

    it('should report correct line numbers', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { name: "text", type: "string" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].line).toBeDefined();
      expect(findings[0].line).toBeGreaterThan(0);
    });

    it('should include fix instructions in raw_details', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [{ name: "phone", type: "string" }],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].raw_details).toContain('key: "phone"');
      expect(findings[0].raw_details).toContain('name: "phone"');
    });

    it('should not be auto-fixable', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [{ name: "x", type: "string" }],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].fixable).toBeUndefined();
      expect(findings[0].fix).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle missing config.ts gracefully', async () => {
      const findings = await checkInputSchemaFormat('/non/existent/path');
      expect(findings).toHaveLength(0);
    });

    it('should not flag name properties outside inputSchema context', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    title: "Test",
    workflows: [{
      workflowName: "Main",
      triggers: [{
        type: "http" as const,
        title: "Submit",
      }],
    }],
  };
}

// Some unrelated object with name property
const meta = { name: "test", value: 123 };
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(0);
    });

    it('should detect name in HTTP trigger inputSchema', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "http" as const,
        inputSchema: [
          { name: "message", type: "string", label: "Message" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('message');
    });

    it('should handle mixed key and name fields', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{
        type: "subworkflow" as const,
        inputSchema: [
          { key: "good", type: "string" },
          { name: "bad", type: "number" },
        ],
      }],
    }],
  };
}
      `);
      const findings = await checkInputSchemaFormat(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('bad');
    });
  });
});
