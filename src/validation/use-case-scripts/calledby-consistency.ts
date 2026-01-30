/**
 * CALLEDBY-CONSISTENCY Validation Script
 *
 * Validates that subworkflows have their callers correctly listed in calledBy.
 * When workflow A calls subworkflow B via SUBWKFL placeholder,
 * B's trigger config must include A in its calledBy array.
 *
 * @see .guides/specific/sub-workflows.md - "calledBy Array"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'CALLEDBY-CONSISTENCY';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'calledby_consistency',
  severity: 'should',
  description: 'Subworkflow calledBy arrays must include all actual callers',
  details: "When workflow A calls subworkflow B, B's trigger config must list A in calledBy",
  fixable: true,
  category: 'references',
  guideRef: {
    path: 'specific/sub-workflows.md',
    section: 'calledBy Array',
  },
};

// Regex to find SUBWKFL placeholders
const SUBWKFL_PATTERN = /\{\{SUBWKFL_([a-zA-Z0-9_-]+)_LFKWBUS\}\}/g;

// Regex to extract workflowTemplateId from config.ts
const TEMPLATE_ID_PATTERN = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;

/**
 * Information about a subworkflow's calledBy configuration
 */
interface SubworkflowCalledByInfo {
  templateId: string;
  calledBy: string[];
  hasCalledByField: boolean;
}

/**
 * Extracts all SUBWKFL_ references from workflow content
 */
function extractSubworkflowCalls(content: string): string[] {
  const references: string[] = [];
  let match;

  // Reset regex state
  SUBWKFL_PATTERN.lastIndex = 0;

  while ((match = SUBWKFL_PATTERN.exec(content)) !== null) {
    if (!references.includes(match[1])) {
      references.push(match[1]);
    }
  }

  return references;
}

/**
 * Extracts calledBy mappings from config.ts content
 *
 * Returns a map of templateId -> { calledBy: [...], hasCalledByField: boolean }
 */
function extractCalledByMappings(configContent: string): Map<string, SubworkflowCalledByInfo> {
  const mappings = new Map<string, SubworkflowCalledByInfo>();

  // Find each workflowTemplateId
  const templateIdPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = templateIdPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdEndPos = templateMatch.index + templateMatch[0].length;

    // Look for the next workflow block or end of content
    const nextTemplateMatch = /workflowTemplateId:/g;
    nextTemplateMatch.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplateMatch.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;

    // Extract the block for this workflow
    const workflowBlock = configContent.slice(templateMatch.index, blockEnd);

    // Check if this block has a subworkflow trigger with type: 'subworkflow'
    if (!workflowBlock.includes("type: 'subworkflow'") && !workflowBlock.includes('type: "subworkflow"')) {
      continue;
    }

    // Check if this trigger block has calledBy
    const calledByMatch = workflowBlock.match(/calledBy:\s*\[([^\]]*)\]/);

    if (calledByMatch) {
      // Extract the callers from the calledBy array
      const calledByContent = calledByMatch[1];
      const callers: string[] = [];

      // Match quoted strings in the array
      const callerPattern = /['"]([^'"]+)['"]/g;
      let callerMatch;
      while ((callerMatch = callerPattern.exec(calledByContent)) !== null) {
        callers.push(callerMatch[1]);
      }

      mappings.set(templateId, {
        templateId,
        calledBy: callers,
        hasCalledByField: true,
      });
    } else {
      // Subworkflow trigger without calledBy field
      mappings.set(templateId, {
        templateId,
        calledBy: [],
        hasCalledByField: false,
      });
    }
  }

  return mappings;
}

/**
 * Gets the workflow template ID from a workflow JSON filename
 *
 * By convention, the filename (without .json) matches the workflowTemplateId
 */
function getTemplateIdFromFilename(workflowFile: string): string {
  return basename(workflowFile, '.json');
}

/**
 * Creates a fix function that adds a missing caller to a subworkflow's calledBy array
 */
function createFixFunction(
  subworkflowId: string,
  missingCaller: string,
  hasCalledByField: boolean,
): (content: string) => string {
  return (content: string): string => {
    // Find the workflow block for this subworkflow
    const workflowBlockPattern = new RegExp(
      `(workflowTemplateId:\\s*['"]${subworkflowId}['"][\\s\\S]*?triggers:\\s*\\[[\\s\\S]*?)` +
        (hasCalledByField
          ? `(calledBy:\\s*\\[)([^\\]]*)\\]`
          : `(inputSchema:\\s*\\[[^\\]]*\\],?)`),
      'g',
    );

    if (hasCalledByField) {
      // Add to existing calledBy array
      return content.replace(workflowBlockPattern, (match, prefix, calledByStart, calledByContent) => {
        const trimmedContent = calledByContent.trim();
        if (trimmedContent === '') {
          // Empty array
          return `${prefix}${calledByStart}'${missingCaller}']`;
        } else {
          // Non-empty array - add with comma
          return `${prefix}${calledByStart}${calledByContent}, '${missingCaller}']`;
        }
      });
    } else {
      // Add calledBy field after inputSchema
      return content.replace(workflowBlockPattern, (match, prefix, inputSchema) => {
        const needsComma = !inputSchema.trim().endsWith(',');
        return `${prefix}${inputSchema}${needsComma ? ',' : ''}\n            calledBy: ['${missingCaller}'],`;
      });
    }
  };
}

/**
 * Validates that all workflow callers are listed in subworkflow calledBy arrays
 */
export async function checkCalledByConsistency(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Check if config.ts exists
  const configPath = join(useCasePath, 'config.ts');
  if (!existsSync(configPath)) {
    // Cannot validate without config.ts - this is handled by other rules
    return findings;
  }

  // Read config.ts
  let configContent: string;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    // Cannot read config.ts - this is handled by other rules
    return findings;
  }

  // Extract calledBy mappings from config.ts
  const calledByMappings = extractCalledByMappings(configContent);

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
    // Cannot read workflows folder - this is handled by other rules
    return findings;
  }

  // Build a map of which workflows call which subworkflows
  // Map: subworkflowId -> [callerIds]
  const actualCallers = new Map<string, string[]>();

  for (const workflowFile of workflowFiles) {
    let content: string;
    try {
      content = readFileSync(workflowFile, 'utf-8');
    } catch {
      continue; // Skip unreadable files
    }

    const callerTemplateId = getTemplateIdFromFilename(workflowFile);
    const subworkflowCalls = extractSubworkflowCalls(content);

    for (const subworkflowId of subworkflowCalls) {
      const existingCallers = actualCallers.get(subworkflowId) || [];
      if (!existingCallers.includes(callerTemplateId)) {
        existingCallers.push(callerTemplateId);
      }
      actualCallers.set(subworkflowId, existingCallers);
    }
  }

  // Check each subworkflow that is being called
  for (const [subworkflowId, callers] of actualCallers) {
    const calledByInfo = calledByMappings.get(subworkflowId);

    // Skip if this subworkflow doesn't have a trigger configuration
    // (might not be a subworkflow-triggered workflow)
    if (!calledByInfo) {
      continue;
    }

    // Check each caller
    for (const callerId of callers) {
      if (!calledByInfo.calledBy.includes(callerId)) {
        const hasCalledByField = calledByInfo.hasCalledByField;

        findings.push({
          rule: RULE_ID,
          severity: 'should',
          path: configPath,
          message: hasCalledByField
            ? `Subworkflow "${subworkflowId}" is called by "${callerId}" but "${callerId}" is not listed in its calledBy array`
            : `Subworkflow "${subworkflowId}" is called by "${callerId}" but has no calledBy field`,
          raw_details: hasCalledByField
            ? `Add '${callerId}' to the calledBy array for subworkflow '${subworkflowId}' in config.ts. Current calledBy: [${calledByInfo.calledBy.map(c => `'${c}'`).join(', ')}]`
            : `Add calledBy: ['${callerId}'] to the trigger configuration for subworkflow '${subworkflowId}' in config.ts`,
          guideRef: metadata.guideRef,
          fixable: true,
          fix: {
            description: hasCalledByField
              ? `Add '${callerId}' to calledBy array for '${subworkflowId}'`
              : `Add calledBy field with '${callerId}' for '${subworkflowId}'`,
            apply: createFixFunction(subworkflowId, callerId, hasCalledByField),
          },
        });
      }
    }
  }

  return findings;
}

export default checkCalledByConsistency;
