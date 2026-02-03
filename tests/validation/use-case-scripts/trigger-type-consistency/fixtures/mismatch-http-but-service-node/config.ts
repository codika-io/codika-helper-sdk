/**
 * Invalid: Config declares type 'http' but workflow has a Gmail trigger node
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-mismatch-http-service';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/email-handler.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'email-handler',
        workflowId: 'email-handler',
        workflowName: 'Email Handler',
        triggers: [
          {
            triggerId: 'http-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/email`,
            method: 'POST' as const,
            title: 'Handle Email',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
