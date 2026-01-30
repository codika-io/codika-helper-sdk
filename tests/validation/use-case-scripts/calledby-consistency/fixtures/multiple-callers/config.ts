/**
 * Invalid use case - multiple workflows call the same subworkflow
 * but only one is listed in calledBy
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/workflow-a.json'),
  join(__dirname, 'workflows/workflow-b.json'),
  join(__dirname, 'workflows/shared-tool.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'workflow-a',
        workflowId: 'workflow-a',
        workflowName: 'Workflow A',
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'workflow-b',
        workflowId: 'workflow-b',
        workflowName: 'Workflow B',
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      {
        workflowTemplateId: 'shared-tool',
        workflowId: 'shared-tool',
        workflowName: 'Shared Tool',
        triggers: [
          {
            type: 'subworkflow' as const,
            triggerId: 'shared-tool-trigger',
            title: 'Shared Tool',
            description: 'Shared tool workflow',
            inputSchema: [],
            calledBy: ['workflow-a'],
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
