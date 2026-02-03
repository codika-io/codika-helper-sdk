/**
 * Invalid: Workflow with no triggers field at all
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-missing-triggers';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/main.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'main',
        workflowId: 'main',
        workflowName: 'Main Workflow',
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
