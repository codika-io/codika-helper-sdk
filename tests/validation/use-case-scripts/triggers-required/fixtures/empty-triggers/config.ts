/**
 * Invalid: Workflow with empty triggers array
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-empty-triggers';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/gdrive-watcher.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'gdrive-watcher',
        workflowId: 'gdrive-watcher',
        workflowName: 'Google Drive Watcher',
        triggers: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
