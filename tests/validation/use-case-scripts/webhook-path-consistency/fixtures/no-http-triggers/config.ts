/**
 * Valid: Subworkflow only (no HTTP triggers)
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-no-http';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/subworkflow.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'subworkflow',
        workflowId: 'subworkflow',
        workflowName: 'Helper Subworkflow',
        triggers: [
          {
            triggerId: 'sub-trigger',
            type: 'subworkflow' as const,
            title: 'Helper',
            description: 'Called by other workflows',
            inputSchema: [{ name: 'data', type: 'object' as const }],
            calledBy: ['main-workflow'],
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
