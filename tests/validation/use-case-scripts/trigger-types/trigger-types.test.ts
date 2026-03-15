/**
 * Tests for TRIGGER-TYPES Script
 *
 * Validates that trigger type and service values in config.ts are valid platform types.
 * Only checks values within triggers: [...] contexts.
 */

import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { checkTriggerTypes, metadata } from '../../../../src/validation/use-case-scripts/trigger-types.js';

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

import { afterAll } from 'vitest';
afterAll(() => {
  try { rmSync(TEMP_PATH, { recursive: true, force: true }); } catch {}
});

describe('TRIGGER-TYPES Script', () => {
  describe('metadata', () => {
    it('should have correct rule ID', () => {
      expect(metadata.id).toBe('TRIGGER-TYPES');
    });

    it('should have "must" severity', () => {
      expect(metadata.severity).toBe('must');
    });
  });

  describe('valid trigger types', () => {
    it('should PASS for http trigger', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "http" as const, url: "/test", method: "POST" }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for schedule trigger', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "schedule" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for service_event trigger', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "service_event" as const, service: "other" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for subworkflow trigger', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "subworkflow" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for data_ingestion trigger', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "data_ingestion" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });

    it('should PASS for all trigger types in one config', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [
      { triggers: [{ type: "http" as const }] },
      { triggers: [{ type: "schedule" as const }] },
      { triggers: [{ type: "service_event" as const, service: "slack" as const }] },
      { triggers: [{ type: "subworkflow" as const }] },
      { triggers: [{ type: "data_ingestion" as const }] },
    ],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });
  });

  describe('valid service types', () => {
    const validServices = ['telegram', 'email', 'slack', 'discord', 'pipedrive', 'other'];

    for (const service of validServices) {
      it(`should PASS for service: "${service}"`, async () => {
        const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "service_event" as const, service: "${service}" as const }],
    }],
  };
}
        `);
        const findings = await checkTriggerTypes(path);
        expect(findings).toHaveLength(0);
      });
    }
  });

  describe('invalid trigger types', () => {
    it('should FAIL for unknown trigger type', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "webhook" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].rule).toBe('TRIGGER-TYPES');
      expect(findings[0].severity).toBe('must');
      expect(findings[0].message).toContain('webhook');
    });

    it('should FAIL for typo in trigger type', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "servce_event" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('servce_event');
    });

    it('should include valid types in error details', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "invalid" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings[0].raw_details).toContain('http');
      expect(findings[0].raw_details).toContain('schedule');
      expect(findings[0].raw_details).toContain('service_event');
      expect(findings[0].raw_details).toContain('subworkflow');
      expect(findings[0].raw_details).toContain('data_ingestion');
    });

    it('should report line number', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "bad_type" }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings[0].line).toBeDefined();
      expect(findings[0].line).toBeGreaterThan(0);
    });
  });

  describe('invalid service types', () => {
    it('should FAIL for unknown service type', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "service_event" as const, service: "whatsapp" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain('whatsapp');
    });

    it('should include valid service types in error details', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "service_event" as const, service: "invalid" as const }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings[0].raw_details).toContain('telegram');
      expect(findings[0].raw_details).toContain('slack');
      expect(findings[0].raw_details).toContain('other');
    });
  });

  describe('context isolation', () => {
    it('should NOT flag type values outside trigger blocks', async () => {
      const path = createTempUseCase(`
function getInputSchema() {
  return [{ key: "x", type: "string" }];
}

export function getConfiguration() {
  return {
    workflows: [{
      triggers: [{ type: "http" as const }],
      outputSchema: [{ key: "y", type: "text" }],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      // "string" and "text" are schema types, not trigger types — should not be flagged
      expect(findings).toHaveLength(0);
    });

    it('should NOT flag when config has no triggers', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return { title: 'Test', workflows: [] };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle missing config.ts gracefully', async () => {
      const findings = await checkTriggerTypes('/non/existent/path');
      expect(findings).toHaveLength(0);
    });

    it('should handle config with empty triggers array', async () => {
      const path = createTempUseCase(`
export function getConfiguration() {
  return {
    workflows: [{
      triggers: [],
    }],
  };
}
      `);
      const findings = await checkTriggerTypes(path);
      expect(findings).toHaveLength(0);
    });
  });
});
