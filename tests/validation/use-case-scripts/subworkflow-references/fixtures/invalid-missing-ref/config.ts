/**
 * Invalid use case - workflow references non-existent template ID
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/main-workflow.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'main-workflow',
        workflowId: 'main-workflow',
        workflowName: 'Main Workflow',
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
      // Note: 'non-existent-helper' is NOT defined here
    ],
  };
}
