/**
 * Valid: Config type 'subworkflow' with executeWorkflowTrigger node in workflow
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-subworkflow';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/helper.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'helper',
        workflowId: 'helper',
        workflowName: 'Helper Subworkflow',
        triggers: [
          {
            triggerId: 'sub-trigger',
            type: 'subworkflow' as const,
            title: 'Helper',
            calledBy: ['main'],
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 0,
      },
    ],
  };
}
