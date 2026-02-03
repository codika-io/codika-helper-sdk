/**
 * Valid: Service event trigger (Google Drive) with non-empty triggers array
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-service-event';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/gdrive-watcher.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'gdrive-watcher',
        workflowId: 'gdrive-watcher',
        workflowName: 'Google Drive Watcher',
        triggers: [
          {
            triggerId: 'gdrive-trigger',
            type: 'service_event' as const,
            title: 'New File in Drive',
            description: 'Triggers when a new file is added to Google Drive',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
