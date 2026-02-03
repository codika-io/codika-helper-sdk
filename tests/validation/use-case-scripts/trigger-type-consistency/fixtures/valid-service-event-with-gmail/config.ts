/**
 * Valid: Config type 'service_event' with Gmail trigger node in workflow
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-service-event';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/email-watcher.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'email-watcher',
        workflowId: 'email-watcher',
        workflowName: 'Email Watcher',
        triggers: [
          {
            triggerId: 'gmail-trigger',
            type: 'service_event' as const,
            title: 'New Email',
            description: 'Triggers on new Gmail messages',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
