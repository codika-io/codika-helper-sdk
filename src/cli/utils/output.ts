/**
 * CLI Output Utilities
 *
 * Shared formatting functions for CLI output.
 */

import type { DeployUseCaseResult } from '../../utils/use-case-deployer.js';
import { isDeploySuccess, isDeployError } from '../../utils/use-case-deployer.js';

/**
 * Format a successful deployment result for human-readable output
 */
export function formatSuccess(result: DeployUseCaseResult): string {
  if (!isDeploySuccess(result)) {
    return formatError(result);
  }

  const lines: string[] = [
    '',
    '\x1b[32m✓ Deployment Successful\x1b[0m',
    '',
    `  Template ID:  ${result.data.templateId}`,
    `  API Version:  ${result.data.version}`,
    `  Process ID:   ${result.data.processId}`,
    `  Status:       ${result.data.deploymentStatus}`,
  ];

  if (result.data.isNewProcess) {
    lines.push(`  New Process:  yes`);
  }

  if (result.data.processInstanceId) {
    lines.push(`  Instance ID:  ${result.data.processInstanceId}`);
  }

  if (result.data.workflowsDeployed && result.data.workflowsDeployed.length > 0) {
    lines.push('');
    lines.push('  Workflows:');
    for (const wf of result.data.workflowsDeployed) {
      lines.push(`    - ${wf.workflowTemplateId}: ${wf.status} (n8n: ${wf.n8nWorkflowId})`);
    }
  }

  // Check for workflow-level errors
  if (result.data.deploymentStatus === 'failed' && result.data.error) {
    lines.push('');
    lines.push(`  \x1b[33mWarning: ${result.data.error}\x1b[0m`);
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format an error result for human-readable output
 */
export function formatError(result: DeployUseCaseResult): string {
  const lines: string[] = [
    '',
    '\x1b[31m✗ Deployment Failed\x1b[0m',
    '',
  ];

  if (isDeployError(result)) {
    lines.push(`  Error Code: ${result.error.code}`);
    lines.push(`  Message:    ${result.error.message}`);

    if (result.error.details) {
      lines.push('');
      lines.push('  Details:');
      if (result.error.details.field) {
        lines.push(`    Field:  ${result.error.details.field}`);
      }
      if (result.error.details.reason) {
        lines.push(`    Reason: ${result.error.details.reason}`);
      }
      if (result.error.details.index !== undefined) {
        lines.push(`    Index:  ${result.error.details.index}`);
      }
    }

    lines.push('');
    lines.push(`  Request ID: ${result.requestId}`);
  } else {
    lines.push('  Unknown error occurred');
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Convert result to JSON for --json output mode
 */
export function toJson(result: DeployUseCaseResult): string {
  if (isDeploySuccess(result)) {
    return JSON.stringify({
      success: true,
      templateId: result.data.templateId,
      version: result.data.version,
      processId: result.data.processId,
      deploymentStatus: result.data.deploymentStatus,
      isNewProcess: result.data.isNewProcess,
      deploymentInstanceId: result.data.deploymentInstanceId,
      processInstanceId: result.data.processInstanceId,
      workflows: result.data.workflowsDeployed,
      requestId: result.requestId,
      error: result.data.error,
    }, null, 2);
  } else if (isDeployError(result)) {
    return JSON.stringify({
      success: false,
      error: result.error,
      requestId: result.requestId,
    }, null, 2);
  } else {
    return JSON.stringify({
      success: false,
      error: { code: 'UNKNOWN', message: 'Unknown error' },
    }, null, 2);
  }
}

/**
 * Print a validation error and exit
 */
export function exitWithError(message: string, code: number = 2): never {
  console.error(`\x1b[31mError:\x1b[0m ${message}`);
  process.exit(code);
}
