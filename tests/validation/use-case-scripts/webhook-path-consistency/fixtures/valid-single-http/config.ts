/**
 * Valid: Single HTTP trigger with matching webhook path
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ID = 'test-valid-single-http';

export const WORKFLOW_FILES = [join(__dirname, 'workflows/main.json')];

export function getConfiguration() {
  return {
    processId: 'test-process',
    workflows: [
      {
        workflowTemplateId: 'main',
        workflowId: 'main',
        workflowName: 'Main Workflow',
        triggers: [
          {
            triggerId: 'http-trigger',
            type: 'http' as const,
            url: `{{ORGSECRET_N8N_BASE_URL_TERCESORG}}/webhook/{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/analyze`,
            method: 'POST' as const,
            title: 'Analyze',
            description: 'Trigger analysis',
          },
        ],
        outputSchema: [],
        n8nWorkflowJsonBase64: '',
        cost: 1,
      },
    ],
  };
}
