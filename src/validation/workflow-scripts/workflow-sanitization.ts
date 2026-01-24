/**
 * Script: WORKFLOW-SANITIZATION
 *
 * Validates that workflows don't contain n8n-generated properties that should be removed:
 * - id: Workflow ID from n8n (assigned when saved)
 * - versionId: Version tracking (changes on each save)
 * - meta: n8n metadata (instanceId, templateId, etc.)
 * - active: n8n activation status
 * - tags: n8n tags array
 * - pinData: n8n pinned execution data
 *
 * These properties are environment-specific and should not be version controlled.
 */

import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'WORKFLOW-SANITIZATION',
  name: 'workflow_sanitization',
  severity: 'must',
  description: 'Workflows must not contain n8n-generated properties (id, versionId, meta, active, tags, pinData)',
  details: 'Remove n8n-generated properties before committing. These are environment-specific.',
  fixable: true,
  category: 'sanitization',
};

// Properties that should NOT be in workflow JSON files
const FORBIDDEN_PROPERTIES = [
  'id',
  'versionId',
  'meta',
  'active',
  'tags',
  'pinData',
] as const;

type ForbiddenProperty = (typeof FORBIDDEN_PROPERTIES)[number];

// Human-readable explanations for each property
const PROPERTY_EXPLANATIONS: Record<ForbiddenProperty, string> = {
  id: 'n8n assigns this when the workflow is saved - it varies per environment',
  versionId: 'n8n updates this on every save - it varies per environment',
  meta: 'n8n metadata including instanceId - it varies per environment',
  active: 'n8n activation status - workflows should be activated through deployment',
  tags: 'n8n tags are environment-specific - use config.ts for categorization',
  pinData: 'n8n pinned execution data - this is development/debug data only',
};

/**
 * Check that workflow doesn't contain forbidden n8n properties
 */
export function checkWorkflowSanitization(content: string, path: string): Finding[] {
  const findings: Finding[] = [];

  // Parse as JSON
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    // If not valid JSON, skip this check
    return [];
  }

  // Check for each forbidden property
  for (const prop of FORBIDDEN_PROPERTIES) {
    if (prop in parsed) {
      findings.push({
        rule: metadata.id,
        severity: metadata.severity,
        path,
        message: `Workflow contains forbidden n8n property: "${prop}"`,
        raw_details: `Remove the "${prop}" property. ${PROPERTY_EXPLANATIONS[prop]}`,
        fixable: true,
        fix: {
          description: `Remove "${prop}" property`,
          apply: (fileContent: string) => {
            const data = JSON.parse(fileContent);
            delete data[prop];
            return JSON.stringify(data, null, 2);
          },
        },
      });
    }
  }

  return findings;
}
