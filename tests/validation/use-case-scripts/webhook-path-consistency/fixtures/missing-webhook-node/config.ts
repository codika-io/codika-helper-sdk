/**
 * Invalid: HTTP trigger exists but workflow has no webhook node
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-missing-webhook';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/broken.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'broken',
        workflowId: 'broken',
        workflowName: 'Broken Workflow',
        triggers: [
          {
            triggerId: 'http-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/submit`,
            method: 'POST' as const,
            title: 'Submit',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
