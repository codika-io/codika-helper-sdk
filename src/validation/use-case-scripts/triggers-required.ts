/**
 * TRIGGERS-REQUIRED Validation Script
 *
 * Validates that every workflow in config.ts has a non-empty triggers array.
 * An empty or missing triggers array means the workflow cannot be triggered
 * at runtime, which is always a deployment error.
 *
 * @see .guides/specific/third-party-triggers.md - "Config.ts for Third-Party Triggered Workflows"
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Finding, RuleMetadata } from '../types.js';

export const RULE_ID = 'TRIGGERS-REQUIRED';

export const metadata: RuleMetadata & { guideRef: { path: string; section: string } } = {
  id: RULE_ID,
  name: 'triggers_required',
  severity: 'must',
  description: 'Every workflow must have at least one trigger defined',
  details:
    'Each workflow in config.ts must have a non-empty triggers array. ' +
    'For third-party service triggers (Gmail, Google Drive, Slack, etc.), use type: \'service_event\'.',
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
 * Information about a workflow block extracted from config.ts
 */
interface WorkflowTriggersInfo {
  templateId: string;
  hasTriggersField: boolean;
  triggersEmpty: boolean;
}

/**
 * Extracts workflow trigger info from config.ts content using regex.
 * For each workflowTemplateId block, checks whether a triggers array exists
 * and whether it contains any entries.
 */
function extractWorkflowTriggerInfo(configContent: string): WorkflowTriggersInfo[] {
  const results: WorkflowTriggersInfo[] = [];

  const templateIdPattern = /workflowTemplateId:\s*['"]([^'"]+)['"]/g;
  let templateMatch;

  while ((templateMatch = templateIdPattern.exec(configContent)) !== null) {
    const templateId = templateMatch[1];
    const templateIdEndPos = templateMatch.index + templateMatch[0].length;

    // Find the end of this workflow block (next workflowTemplateId or end)
    const nextTemplatePattern = /workflowTemplateId:/g;
    nextTemplatePattern.lastIndex = templateIdEndPos;
    const nextMatch = nextTemplatePattern.exec(configContent);
    const blockEnd = nextMatch ? nextMatch.index : configContent.length;

    const workflowBlock = configContent.slice(templateMatch.index, blockEnd);

    // Look for triggers array in this block
    const triggersMatch = workflowBlock.match(/triggers:\s*\[([\s\S]*?)\]/);

    if (!triggersMatch) {
      // No triggers field at all
      results.push({
        templateId,
        hasTriggersField: false,
        triggersEmpty: true,
      });
      continue;
    }

    // Check if the triggers array content is empty (whitespace only)
    const triggersContent = triggersMatch[1].trim();
    const isEmpty = triggersContent.length === 0;

    results.push({
      templateId,
      hasTriggersField: true,
      triggersEmpty: isEmpty,
    });
  }

  return results;
}

/**
 * Validates that every workflow in config.ts has a non-empty triggers array.
 */
export async function checkTriggersRequired(useCasePath: string): Promise<Finding[]> {
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

  const workflowInfos = extractWorkflowTriggerInfo(configContent);

  for (const info of workflowInfos) {
    if (info.triggersEmpty) {
      findings.push({
        rule: RULE_ID,
        severity: 'must',
        path: configPath,
        message: `Workflow "${info.templateId}" has no triggers defined. Every workflow must have at least one trigger.`,
        raw_details:
          `The triggers array for workflow "${info.templateId}" is ${info.hasTriggersField ? 'empty' : 'missing'}.\n\n` +
          `Every workflow must have at least one trigger. Common trigger types:\n` +
          `- type: 'http' — for webhook-triggered workflows\n` +
          `- type: 'schedule' — for cron/scheduled workflows\n` +
          `- type: 'service_event' — for third-party service triggers (Gmail, Google Drive, Slack, etc.)\n` +
          `- type: 'subworkflow' — for workflows called by other workflows\n\n` +
          `See documentation:\n` +
          `- .guides/${GUIDE_REF.path} > "${GUIDE_REF.section}"`,
        guideRef: GUIDE_REF,
      });
    }
  }

  return findings;
}

export default checkTriggersRequired;
