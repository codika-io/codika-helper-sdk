/**
 * TRIGGER-TYPE-CONSISTENCY Validation Script
 *
 * Validates that the trigger type declared in config.ts matches the actual
 * trigger node type found in the corresponding workflow JSON file.
 *
 * For example, if config.ts declares type: 'http', the workflow must contain
 * a webhook node, not a scheduleTrigger or a service-specific trigger node.
 *
 * @see .guides/specific/third-party-triggers.md - "Config.ts for Third-Party Triggered Workflows"
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'TRIGGER-TYPE-CONSISTENCY';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'trigger_type_consistency',
  severity: 'must',
  description: 'Config trigger type must match the actual trigger node in the workflow',
  details:
    'The trigger type in config.ts (http, schedule, subworkflow, service_event) must be consistent ' +
    'with the trigger node found in the workflow JSON. A mismatch causes runtime failures.',
  fixable: false,
  category: 'triggers',
  guideRef: {
    path: 'specific/third-party-triggers.md',
    section: 'Config.ts for Third-Party Triggered Workflows',
  },
};

const GUIDE_REF = {
  path: 'specific/third-party-triggers.md',
  section: 'Config.ts for Third-Party Triggered Workflows',
};

/**
 * Known trigger node types and their categories
 */
const WEBHOOK_NODE = 'n8n-nodes-base.webhook';
const SCHEDULE_NODE = 'n8n-nodes-base.scheduleTrigger';
const EXECUTE_WORKFLOW_TRIGGER_NODE = 'n8n-nodes-base.executeWorkflowTrigger';

type DetectedTriggerCategory = 'webhook' | 'schedule' | 'subworkflow' | 'service_trigger' | 'unknown';

/**
 * Information about a trigger type declared in config.ts
 */
interface ConfigTriggerInfo {
  workflowTemplateId: string;
  triggerTypes: string[];
}

/**
 * Information about trigger nodes found in a workflow JSON
 */
interface WorkflowTriggerInfo {
  nodeType: string;
  nodeName: string;
  category: DetectedTriggerCategory;
}

/**
 * Determines the trigger category from an n8n node type string.
 */
function categorizeNodeType(nodeType: string): DetectedTriggerCategory {
  if (nodeType === WEBHOOK_NODE) return 'webhook';
  if (nodeType === SCHEDULE_NODE) return 'schedule';
  if (nodeType.toLowerCase().includes('executeworkflowtrigger')) return 'subworkflow';
  // Any other node whose type contains "Trigger" (case-insensitive) is a service trigger
  if (/trigger/i.test(nodeType)) return 'service_trigger';
  return 'unknown';
}

/**
 * Determines the primary trigger category for a workflow.
 * Non-webhook triggers take precedence over webhook triggers
 * (a workflow might have both a service trigger and a webhook).
 */
function getPrimaryTriggerCategory(triggers: WorkflowTriggerInfo[]): WorkflowTriggerInfo | null {
  if (triggers.length === 0) return null;

  // Prefer non-webhook, non-unknown triggers
  const primary = triggers.find(t => t.category !== 'webhook' && t.category !== 'unknown');
  if (primary) return primary;

  // Fall back to webhook
  const webhook = triggers.find(t => t.category === 'webhook');
  if (webhook) return webhook;

  return triggers[0];
}

/**
 * Extracts trigger type declarations from config.ts per workflow.
 */
function extractConfigTriggerTypes(configContent: string): ConfigTriggerInfo[] {
  const results: ConfigTriggerInfo[] = [];

  const templateIdPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = templateIdPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdEndPos = templateMatch.index + templateMatch[0].length;

    // Find the end of this workflow block
    const nextTemplatePattern = /workflowTemplateId:/g;
    nextTemplatePattern.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplatePattern.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;

    const workflowBlock = configContent.slice(templateMatch.index, blockEnd);

    // Find triggers array in this block
    const triggersMatch = workflowBlock.match(/triggers:\s*\[([\s\S]*?)\]/);
    if (!triggersMatch) continue;

    const triggersContent = triggersMatch[1];
    if (triggersContent.trim().length === 0) continue;

    // Extract trigger type values
    const triggerTypes: string[] = [];
    const typePattern = /type:\s*['"]([^'"]+)['"]/g;
    let typeMatch;
    typePattern.lastIndex = 0;

    while ((typeMatch = typePattern.exec(triggersContent)) !== null) {
      triggerTypes.push(typeMatch[1]);
    }

    if (triggerTypes.length > 0) {
      results.push({ workflowTemplateId: templateId, triggerTypes });
    }
  }

  return results;
}

/**
 * Extracts trigger nodes from a workflow JSON.
 */
function extractWorkflowTriggers(workflowContent: string): WorkflowTriggerInfo[] {
  const triggers: WorkflowTriggerInfo[] = [];

  try {
    const workflow = JSON.parse(workflowContent);
    for (const node of workflow.nodes || []) {
      const category = categorizeNodeType(node.type || '');
      if (category !== 'unknown') {
        triggers.push({
          nodeType: node.type,
          nodeName: node.name || node.type,
          category,
        });
      }
    }
  } catch {
    // Invalid JSON — other validators handle this
  }

  return triggers;
}

/**
 * Checks whether a config trigger type is compatible with the detected workflow trigger.
 * Returns an error message if incompatible, null if compatible.
 */
function checkCompatibility(
  configType: string,
  primaryTrigger: WorkflowTriggerInfo,
): string | null {
  const { category } = primaryTrigger;

  switch (configType) {
    case 'http':
      // http config type requires a webhook node
      if (category !== 'webhook') {
        return `Config declares type 'http' but the workflow's primary trigger is a ${category} node (${primaryTrigger.nodeType}). ` +
          `Use type: '${suggestConfigType(category)}' instead.`;
      }
      return null;

    case 'schedule':
      // schedule config type requires a scheduleTrigger node
      if (category !== 'schedule') {
        return `Config declares type 'schedule' but the workflow's primary trigger is a ${category} node (${primaryTrigger.nodeType}). ` +
          `Use type: '${suggestConfigType(category)}' instead.`;
      }
      return null;

    case 'subworkflow':
      // subworkflow config type requires an executeWorkflowTrigger node
      if (category !== 'subworkflow') {
        return `Config declares type 'subworkflow' but the workflow's primary trigger is a ${category} node (${primaryTrigger.nodeType}). ` +
          `Use type: '${suggestConfigType(category)}' instead.`;
      }
      return null;

    case 'service_event':
      // service_event is flexible — it should NOT be used with webhook, schedule, or subworkflow
      if (category === 'webhook' || category === 'schedule' || category === 'subworkflow') {
        return `Config declares type 'service_event' but the workflow's primary trigger is a ${category} node (${primaryTrigger.nodeType}). ` +
          `Use type: '${suggestConfigType(category)}' instead.`;
      }
      return null;

    default:
      // Unknown config type — don't validate
      return null;
  }
}

/**
 * Suggests the correct config type for a given trigger category.
 */
function suggestConfigType(category: DetectedTriggerCategory): string {
  switch (category) {
    case 'webhook': return 'http';
    case 'schedule': return 'schedule';
    case 'subworkflow': return 'subworkflow';
    case 'service_trigger': return 'service_event';
    default: return 'service_event';
  }
}

/**
 * Validates that trigger types in config.ts match the workflow trigger nodes.
 */
export async function checkTriggerTypeConsistency(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];

  const configPath = join(useCasePath, 'config.ts');
  if (!existsSync(configPath)) {
    return findings;
  }

  let configContent: string;
  try {
    configContent = readFileSync(configPath, 'utf-8');
  } catch {
    return findings;
  }

  const configTriggers = extractConfigTriggerTypes(configContent);
  if (configTriggers.length === 0) {
    return findings;
  }

  // Check workflows folder
  const workflowsPath = join(useCasePath, 'workflows');
  if (!existsSync(workflowsPath)) {
    return findings;
  }

  // Read all workflow files
  let workflowFiles: string[];
  try {
    workflowFiles = readdirSync(workflowsPath)
      .filter(f => f.endsWith('.json'))
      .map(f => join(workflowsPath, f));
  } catch {
    return findings;
  }

  // Build a map of templateId -> workflow triggers
  const workflowTriggerMap = new Map<string, WorkflowTriggerInfo[]>();
  for (const workflowFile of workflowFiles) {
    const templateId = basename(workflowFile, '.json');
    let content: string;
    try {
      content = readFileSync(workflowFile, 'utf-8');
    } catch {
      continue;
    }
    workflowTriggerMap.set(templateId, extractWorkflowTriggers(content));
  }

  // Validate each config workflow's trigger types against workflow nodes
  for (const configInfo of configTriggers) {
    const workflowTriggers = workflowTriggerMap.get(configInfo.workflowTemplateId);
    if (!workflowTriggers || workflowTriggers.length === 0) {
      // No workflow file or no trigger nodes — other rules handle this
      continue;
    }

    const primaryTrigger = getPrimaryTriggerCategory(workflowTriggers);
    if (!primaryTrigger) continue;

    for (const configType of configInfo.triggerTypes) {
      const error = checkCompatibility(configType, primaryTrigger);
      if (error) {
        findings.push({
          rule: RULE_ID,
          severity: 'must',
          path: configPath,
          message: `Trigger type mismatch in workflow "${configInfo.workflowTemplateId}": ${error}`,
          raw_details:
            `The config.ts trigger type '${configType}' does not match the workflow's actual trigger node.\n\n` +
            `Workflow trigger node: ${primaryTrigger.nodeType} (${primaryTrigger.nodeName})\n` +
            `Detected category: ${primaryTrigger.category}\n` +
            `Config trigger type: ${configType}\n\n` +
            `Update the trigger type in config.ts to match the workflow's trigger node.\n\n` +
            `See documentation:\n` +
            `- .guides/${GUIDE_REF.path} > "${GUIDE_REF.section}"`,
          guideRef: GUIDE_REF,
        });
      }
    }
  }

  return findings;
}

export default checkTriggerTypeConsistency;
