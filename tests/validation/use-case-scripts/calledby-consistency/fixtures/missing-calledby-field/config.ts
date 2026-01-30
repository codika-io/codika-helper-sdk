/**
 * Invalid use case - calledBy field is missing entirely
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main.json'),
  join(__dirname, 'workflows/sub-helper.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'main',
        workflowId: 'main',
        workflowName: 'Main Workflow',
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'sub-helper',
        workflowId: 'sub-helper',
        workflowName: 'Sub Helper',
        triggers: [
          {
            type: 'subworkflow' as const,
            triggerId: 'sub-helper-trigger',
            title: 'Helper',
            description: 'Helper workflow',
            inputSchema: [],
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
