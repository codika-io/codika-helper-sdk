/**
 * Invalid use case - standalone workflow missing its own integrations
 * No subworkflows involved, just direct credential usage
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-project';

export const WORKFLOW_FILES = [
  join(__dirname, 'workflows/standalone.json'),
];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'standalone',
        workflowId: 'standalone',
        workflowName: 'Standalone Workflow',
        triggers: [],
        integrationUids: [],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
