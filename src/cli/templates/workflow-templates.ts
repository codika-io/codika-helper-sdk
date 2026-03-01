/**
 * Workflow Template Generators
 *
 * Generate n8n workflow JSON objects for the init command.
 * Each generator returns a JSON-serializable object following Codika mandatory patterns.
 */

const SETTINGS = {
  executionOrder: 'v1',
  errorWorkflow: '{{ORGSECRET_ERROR_WORKFLOW_ID_TERCESORG}}',
};

/**
 * Generate an HTTP-triggered main workflow that calls a sub-workflow.
 *
 * Flow: Webhook → Codika Init → Parse Input → IF Valid → Call Sub-Workflow → Format Result → Submit Result
 *                                                     → Report Error
 *                                              Call Sub-Workflow (error) → Report Error
 */
export function generateMainWorkflow(slug: string) {
  return {
    name: 'Main Workflow',
    nodes: [
      {
        id: 'webhook-trigger-001',
        name: 'Webhook Trigger',
        type: 'n8n-nodes-base.webhook',
        position: [0, 0],
        parameters: {
          httpMethod: 'POST',
          path: `{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/${slug}`,
          responseMode: 'lastNode',
          options: {},
        },
        typeVersion: 2,
        webhookId: `${slug}-webhook`,
      },
      {
        id: 'codika-init-001',
        name: 'Codika Init',
        type: 'n8n-nodes-codika.codika',
        position: [220, 0],
        parameters: {
          resource: 'initializeExecution',
          operation: 'initWorkflow',
          memberSecret: '{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}',
          organizationId: '={{$json.body.executionMetadata.organizationId}}',
          userId: '={{$json.body.executionMetadata.userId}}',
          processInstanceId: '={{$json.body.executionMetadata.processInstanceId}}',
          workflowId: 'main-workflow',
          triggerType: 'http',
        },
        typeVersion: 1,
      },
      {
        id: 'parse-input-001',
        name: 'Parse Input',
        type: 'n8n-nodes-base.code',
        position: [440, 0],
        parameters: {
          jsCode: [
            '// Parse and validate input from webhook',
            "const body = $('Webhook Trigger').first().json.body || {};",
            "const text = body.text || '';",
            '',
            '// Validate required fields',
            "if (!text || text.trim() === '') {",
            '  return [{',
            '    json: {',
            '      validationError: true,',
            "      error: 'Text input is required',",
            "      code: 'MISSING_INPUT'",
            '    }',
            '  }];',
            '}',
            '',
            'return [{',
            '  json: {',
            '    validationError: false,',
            '    text: text.trim()',
            '  }',
            '}];',
          ].join('\n'),
        },
        typeVersion: 2,
      },
      {
        id: 'check-validation-001',
        name: 'Valid Input?',
        type: 'n8n-nodes-base.if',
        position: [660, 0],
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
            },
            conditions: [
              {
                id: 'check-validation-error',
                leftValue: '={{ $json.validationError }}',
                rightValue: false,
                operator: {
                  type: 'boolean',
                  operation: 'equals',
                },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },
        typeVersion: 2.2,
      },
      {
        id: 'call-subworkflow-001',
        name: 'Call Text Processor',
        type: 'n8n-nodes-base.executeWorkflow',
        position: [880, -100],
        onError: 'continueErrorOutput',
        parameters: {
          workflowId: {
            __rl: true,
            mode: 'id',
            value: '{{SUBWKFL_text-processor_LFKWBUS}}',
          },
          workflowInputs: {
            mappingMode: 'defineBelow',
            value: {
              text: '={{ $json.text }}',
            },
          },
          options: {
            waitForSubWorkflow: true,
          },
        },
        typeVersion: 1.3,
      },
      {
        id: 'format-result-001',
        name: 'Format Result',
        type: 'n8n-nodes-base.code',
        position: [1100, -100],
        parameters: {
          jsCode: [
            '// Format the result from the sub-workflow',
            'const subResult = $json;',
            '',
            'return [{',
            '  json: {',
            '    result: subResult.processedText,',
            '    processedAt: subResult.processedAt',
            '  }',
            '}];',
          ].join('\n'),
        },
        typeVersion: 2,
      },
      {
        id: 'codika-submit-001',
        name: 'Codika Submit Result',
        type: 'n8n-nodes-codika.codika',
        position: [1320, -100],
        parameters: {
          resource: 'workflowOutputs',
          operation: 'submitResult',
          resultData: '={{ $json }}',
        },
        typeVersion: 1,
      },
      {
        id: 'codika-error-001',
        name: 'Codika Report Error',
        type: 'n8n-nodes-codika.codika',
        position: [880, 200],
        parameters: {
          resource: 'errorHandling',
          operation: 'reportError',
          errorMessage: '={{ $json.error || "An error occurred" }}',
          errorType: 'node_failure',
        },
        typeVersion: 1,
      },
    ],
    connections: {
      'Webhook Trigger': {
        main: [[{ node: 'Codika Init', type: 'main', index: 0 }]],
      },
      'Codika Init': {
        main: [[{ node: 'Parse Input', type: 'main', index: 0 }]],
      },
      'Parse Input': {
        main: [[{ node: 'Valid Input?', type: 'main', index: 0 }]],
      },
      'Valid Input?': {
        main: [
          [{ node: 'Call Text Processor', type: 'main', index: 0 }],
          [{ node: 'Codika Report Error', type: 'main', index: 0 }],
        ],
      },
      'Call Text Processor': {
        main: [
          [{ node: 'Format Result', type: 'main', index: 0 }],
          [{ node: 'Codika Report Error', type: 'main', index: 0 }],
        ],
      },
      'Format Result': {
        main: [[{ node: 'Codika Submit Result', type: 'main', index: 0 }]],
      },
    },
    settings: SETTINGS,
  };
}

/**
 * Generate a schedule-triggered workflow with manual webhook convergence.
 *
 * Flow: Schedule Trigger ──→ Codika Init → Generate Report → IF Success → Submit Result
 *       Manual Webhook   ──↗                                            → Report Error
 */
export function generateScheduledWorkflow(slug: string) {
  return {
    name: 'Scheduled Report',
    nodes: [
      {
        id: 'schedule-trigger-001',
        name: 'Schedule Trigger',
        type: 'n8n-nodes-base.scheduleTrigger',
        position: [0, -80],
        parameters: {
          rule: {
            interval: [
              {
                field: 'cronExpression',
                expression: '0 9 * * 1',
              },
            ],
          },
        },
        typeVersion: 1.2,
      },
      {
        id: 'manual-trigger-001',
        name: 'Manual Trigger Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [0, 80],
        parameters: {
          httpMethod: 'POST',
          path: `{{PROCDATA_PROCESS_ID_ATADCORP}}/{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}/${slug}-report`,
          responseMode: 'onReceived',
          options: {},
        },
        typeVersion: 2,
        webhookId: `${slug}-report-webhook`,
      },
      {
        id: 'codika-init-001',
        name: 'Codika Init',
        type: 'n8n-nodes-codika.codika',
        position: [220, 0],
        parameters: {
          resource: 'initializeExecution',
          operation: 'initWorkflow',
          memberSecret: '{{MEMSECRT_EXECUTION_AUTH_TRCESMEM}}',
          organizationId: '{{USERDATA_ORGANIZATION_ID_ATADRESU}}',
          userId: '{{USERDATA_USER_ID_ATADRESU}}',
          processInstanceId: '{{USERDATA_PROCESS_INSTANCE_UID_ATADRESU}}',
          workflowId: 'scheduled-report',
          triggerType: 'schedule',
        },
        typeVersion: 1,
      },
      {
        id: 'generate-report-001',
        name: 'Generate Report',
        type: 'n8n-nodes-base.code',
        position: [440, 0],
        parameters: {
          jsCode: [
            '// Generate a simple report',
            '// Replace this with your actual report logic',
            'const now = new Date();',
            '',
            'const report = {',
            "  title: 'Weekly Report',",
            '  generatedAt: now.toISOString(),',
            "  summary: `Report generated on ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,",
            '  status: true',
            '};',
            '',
            'return [{',
            '  json: report',
            '}];',
          ].join('\n'),
        },
        typeVersion: 2,
      },
      {
        id: 'if-success-001',
        name: 'IF Success',
        type: 'n8n-nodes-base.if',
        position: [660, 0],
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: '',
              typeValidation: 'strict',
            },
            conditions: [
              {
                id: 'check-status',
                leftValue: '={{ $json.status }}',
                rightValue: true,
                operator: {
                  type: 'boolean',
                  operation: 'equals',
                },
              },
            ],
            combinator: 'and',
          },
          options: {},
        },
        typeVersion: 2.2,
      },
      {
        id: 'codika-submit-001',
        name: 'Codika Submit Result',
        type: 'n8n-nodes-codika.codika',
        position: [880, -100],
        parameters: {
          resource: 'workflowOutputs',
          operation: 'submitResult',
          resultData: '={{ $json }}',
        },
        typeVersion: 1,
      },
      {
        id: 'codika-error-001',
        name: 'Codika Report Error',
        type: 'n8n-nodes-codika.codika',
        position: [880, 100],
        parameters: {
          resource: 'errorHandling',
          operation: 'reportError',
          errorMessage: 'Report generation failed',
          errorType: 'node_failure',
        },
        typeVersion: 1,
      },
    ],
    connections: {
      'Schedule Trigger': {
        main: [[{ node: 'Codika Init', type: 'main', index: 0 }]],
      },
      'Manual Trigger Webhook': {
        main: [[{ node: 'Codika Init', type: 'main', index: 0 }]],
      },
      'Codika Init': {
        main: [[{ node: 'Generate Report', type: 'main', index: 0 }]],
      },
      'Generate Report': {
        main: [[{ node: 'IF Success', type: 'main', index: 0 }]],
      },
      'IF Success': {
        main: [
          [{ node: 'Codika Submit Result', type: 'main', index: 0 }],
          [{ node: 'Codika Report Error', type: 'main', index: 0 }],
        ],
      },
    },
    settings: SETTINGS,
  };
}

/**
 * Generate a sub-workflow (called by the main workflow).
 *
 * Flow: Execute Workflow Trigger → Process Text → return
 * No Codika Init/Submit/Report nodes (handled by parent).
 */
export function generateSubWorkflow() {
  return {
    name: 'Text Processor',
    nodes: [
      {
        id: 'subworkflow-trigger-001',
        name: 'When Executed by Another Workflow',
        type: 'n8n-nodes-base.executeWorkflowTrigger',
        position: [0, 0],
        onError: 'continueErrorOutput',
        parameters: {
          workflowInputs: {
            values: [{ name: 'text', type: 'string' }],
          },
        },
        typeVersion: 1.1,
      },
      {
        id: 'process-text-001',
        name: 'Process Text',
        type: 'n8n-nodes-base.code',
        position: [220, -60],
        parameters: {
          jsCode: [
            '// Process the text from the parent workflow',
            '// Replace this with your actual processing logic',
            'const input = $input.item.json;',
            "const text = input.text || 'No text provided';",
            '',
            '// Example: uppercase transform + timestamp',
            'const processedText = text.toUpperCase();',
            'const processedAt = new Date().toISOString();',
            '',
            '// Return data back to parent workflow',
            'return [{',
            '  json: {',
            '    originalText: text,',
            '    processedText: processedText,',
            '    processedAt: processedAt',
            '  }',
            '}];',
          ].join('\n'),
        },
        typeVersion: 2,
      },
      {
        id: 'stop-error-001',
        name: 'Stop And Error',
        type: 'n8n-nodes-base.stopAndError',
        position: [220, 100],
        parameters: {
          errorMessage: '=Sub-workflow input error: {{ $json.error }}',
        },
        typeVersion: 1,
      },
    ],
    connections: {
      'When Executed by Another Workflow': {
        main: [
          [{ node: 'Process Text', type: 'main', index: 0 }],
          [{ node: 'Stop And Error', type: 'main', index: 0 }],
        ],
      },
    },
    settings: SETTINGS,
  };
}
