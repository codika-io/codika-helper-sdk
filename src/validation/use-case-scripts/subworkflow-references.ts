/**
 * SUBWKFL-REFERENCES Validation Script
 *
 * Validates that all SUBWKFL_ placeholders in workflow files
 * reference existing workflowTemplateId values defined in config.ts
 *
 * @see .guides/specific/placeholder-patterns.md - "Sub-Workflow References (SUBWKFL)"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'SUBWKFL-REFERENCES';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'subworkflow_references',
  severity: 'must',
  description: 'SUBWKFL placeholders must reference existing workflow template IDs',
  details: 'Each {{SUBWKFL_<TEMPLATE_ID>_LFKWBUS}} placeholder must reference a workflowTemplateId defined in config.ts',
  fixable: false,
  category: 'references',
  guideRef: {
    path: 'specific/placeholder-patterns.md',
    section: 'Sub-Workflow References (SUBWKFL)',
  },
};

// Regex to find SUBWKFL placeholders
const SUBWKFL_PATTERN = /\{\{SUBWKFL_([a-zA-Z0-9_-]+)_LFKWBUS\}\}/g;

// Regex to extract workflowTemplateId from config.ts
const TEMPLATE_ID_PATTERN = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;

/**
 * Extracts all workflowTemplateId values from config.ts content
 */
function extractTemplateIds(configContent: string): string[] {
  const templateIds: string[] = [];
  let match;

  while ((match = TEMPLATE_ID_PATTERN.exec(configContent)) !== null) {
    templateIds.push(match[1]);
  }

  return templateIds;
}

/**
 * Extracts all SUBWKFL_ references from workflow content
 */
function extractSubworkflowReferences(content: string): string[] {
  const references: string[] = [];
  let match;

  // Reset regex state
  SUBWKFL_PATTERN.lastIndex = 0;

  while ((match = SUBWKFL_PATTERN.exec(content)) !== null) {
    references.push(match[1]);
  }

  return references;
}

/**
 * Validates that all SUBWKFL_ placeholders reference existing template IDs
 */
export async function checkSubworkflowReferences(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check if config.ts exists
  const configPath = join(useCasePath, 'config.ts');
  if (!existsSync(configPath)) {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path: useCasePath,
      message: 'Cannot find config.ts in use-case folder',
      raw_details: 'Ensure config.ts exists in the use-case root folder',
      guideRef: metadata.guideRef,
    });
    return findings;
  }

  // Read config.ts and extract template IDs
  let configContent: string;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path: configPath,
      message: 'Cannot read config.ts',
      raw_details: 'Ensure config.ts is readable',
      guideRef: metadata.guideRef,
    });
    return findings;
  }

  const templateIds = extractTemplateIds(configContent);

  // Check workflows folder
  const workflowsPath = join(useCasePath, 'workflows');
  if (!existsSync(workflowsPath)) {
    // No workflows folder - nothing to validate
    return findings;
  }

  // Get all workflow JSON files
  let workflowFiles: string[];
  try {
    workflowFiles = readdirSync(workflowsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => join(workflowsPath, f));
  } catch {
    findings.push({
      rule: RULE_ID,
      severity: 'must',
      path: workflowsPath,
      message: 'Cannot read workflows folder',
      raw_details: 'Ensure workflows folder is readable',
      guideRef: metadata.guideRef,
    });
    return findings;
  }

  // Check each workflow file for SUBWKFL_ references
  for (const workflowFile of workflowFiles) {
    let content: string;
    try {
      content = readFileSync(workflowFile, 'utf-8');
    } catch {
      continue; // Skip unreadable files
    }

    const references = extractSubworkflowReferences(content);

    // Validate each reference
    for (const ref of references) {
      if (!templateIds.includes(ref)) {
        findings.push({
          rule: RULE_ID,
          severity: 'must',
          path: workflowFile,
          message: `SUBWKFL placeholder references unknown template ID: "${ref}"`,
          raw_details: `The placeholder {{SUBWKFL_${ref}_LFKWBUS}} references a template ID that doesn't exist in config.ts. Available template IDs: ${templateIds.join(', ') || '(none)'}`,
          guideRef: metadata.guideRef,
        });
      }
    }
  }

  return findings;
}

export default checkSubworkflowReferences;
