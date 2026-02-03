/**
 * Invalid: Config declares type 'schedule' but workflow has a Google Drive trigger node
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-mismatch-schedule-service';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/watcher.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'watcher',
        workflowId: 'watcher',
        workflowName: 'Watcher Workflow',
        triggers: [
          {
            triggerId: 'schedule-trigger',
            type: 'schedule' as const,
            cronExpression: '0 9 * * 1',
            timezone: 'Europe/London',
            humanReadable: 'Every Monday at 9:00 AM',
            title: 'Weekly Check',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
