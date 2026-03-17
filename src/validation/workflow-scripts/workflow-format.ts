/**
 * Script: WORKFLOW-FORMAT
 *
 * Validates that workflow JSON files use canonical formatting:
 * JSON.stringify(parsed, null, 2) + '\n'
 *
 * This must be the LAST script in the workflowScripts array so that
 * its fix normalizes formatting after all other fixes have run.
 */

import type { Finding, RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'WORKFLOW-FORMAT',
  name: 'workflow_format',
  severity: 'should',
  description: 'Workflow JSON files should use canonical formatting (2-space indent, LF, trailing newline)',
  details:
    'Workflow JSON files should be formatted with JSON.stringify(parsed, null, 2) + newline. ' +
    'This ensures consistent diffs and prevents editor formatting conflicts.',
  fixable: true,
  category: 'formatting',
};

/**
 * Check that workflow JSON uses canonical formatting
 */
export function checkWorkflowFormat(content: string, path: string): Finding[] {
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }

  const expected = JSON.stringify(parsed, null, 2) + '\n';

  if (content === expected) {
    return [];
  }

  return [{
    rule: metadata.id,
    severity: metadata.severity,
    path,
    message: `Workflow JSON is not canonically formatted`,
    raw_details:
      'Run codika verify --fix to normalize formatting to 2-space indent with LF line endings.',
    fixable: true,
    fix: {
      description: 'Reformat to canonical JSON formatting',
      apply: (fileContent: string) => {
        const p = JSON.parse(fileContent);
        return JSON.stringify(p, null, 2) + '\n';
      },
    },
  }];
}
