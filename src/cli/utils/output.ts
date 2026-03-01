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
export function formatSuccess(result: DeployUseCaseResult, localVersion?: string): string {
  if (!isDeploySuccess(result)) {
    return formatError(result);
  }

  const lines: string[] = [
    '',
    '\x1b[32m✓ Deployment Successful\x1b[0m',
    '',
    `  Template ID:  ${result.data.templateId}`,
    `  API Version:  ${result.data.version}`,
  ];

  if (localVersion) {
    lines.push(`  Local Version: ${localVersion}`);
  }

  lines.push(`  Process ID:   ${result.data.processId}`);
  lines.push(`  Status:       ${result.data.deploymentStatus}`);

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
export function toJson(result: DeployUseCaseResult, localVersion?: string): string {
  if (isDeploySuccess(result)) {
    return JSON.stringify({
      success: true,
      templateId: result.data.templateId,
      version: result.data.version,
      ...(localVersion && { localVersion }),
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

// ── Dry-run output ──────────────────────────────────────

export interface DryRunData {
  useCasePath: string;
  projectId: string;
  projectIdSource: string;
  apiKeySource: string;
  organizationName?: string;
  apiUrl: string;
  version: {
    current: string;
    next: string;
    localStrategy: string;
    apiStrategy: string;
    explicitApiVersion?: string;
  };
  configuration: {
    title: string;
    subtitle: string;
    workflowCount: number;
    tags: string[];
    integrations: string[];
  };
  workflows: Array<{
    templateId: string;
    name: string;
    triggerTypes: string[];
    base64Size: number;
  }>;
  metadataDocuments: number;
  validation: {
    valid: boolean;
    summary: { must: number; should: number; nit: number; fixable: number };
  };
}

/**
 * Format dry-run deployment data for human-readable output
 */
export function formatDryRunDeployment(data: DryRunData): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('\x1b[36m--- DRY RUN --- No changes will be made\x1b[0m');
  lines.push('');

  // Target section
  lines.push('\x1b[1mTarget\x1b[0m');
  lines.push(`  Project ID:    ${data.projectId} (from ${data.projectIdSource})`);
  lines.push(`  API key:       ${data.apiKeySource}`);
  if (data.organizationName) {
    lines.push(`  Organization:  ${data.organizationName}`);
  }
  lines.push(`  API endpoint:  ${data.apiUrl}`);
  lines.push('');

  // Version section
  lines.push('\x1b[1mVersion\x1b[0m');
  lines.push(`  Local:   ${data.version.current} \u2192 ${data.version.next} (${data.version.localStrategy})`);
  lines.push(`  API:     ${data.version.apiStrategy}${data.version.explicitApiVersion ? ` (${data.version.explicitApiVersion})` : ''}`);
  lines.push('');

  // Configuration section
  lines.push('\x1b[1mConfiguration\x1b[0m');
  lines.push(`  Title:          ${data.configuration.title}`);
  if (data.configuration.subtitle) {
    lines.push(`  Subtitle:       ${data.configuration.subtitle}`);
  }
  lines.push(`  Workflows:      ${data.configuration.workflowCount}`);
  lines.push(`  Tags:           ${data.configuration.tags.length > 0 ? data.configuration.tags.join(', ') : '(none)'}`);
  lines.push(`  Integrations:   ${data.configuration.integrations.length > 0 ? data.configuration.integrations.join(', ') : '(none)'}`);
  lines.push('');

  // Workflows section
  lines.push('\x1b[1mWorkflows\x1b[0m');
  for (const wf of data.workflows) {
    const size = formatBytes(Math.round(wf.base64Size * 0.75)); // base64 -> raw estimate
    const triggers = wf.triggerTypes.join(', ') || 'unknown';
    lines.push(`  - ${wf.name} (${wf.templateId})`);
    lines.push(`    Triggers: ${triggers} | Size: ~${size}`);
  }
  lines.push('');

  // Metadata
  lines.push(`\x1b[1mMetadata documents:\x1b[0m ${data.metadataDocuments}`);
  lines.push('');

  // Validation
  const v = data.validation;
  const validIcon = v.valid ? '\x1b[32m\u2713' : '\x1b[31m\u2717';
  lines.push(`\x1b[1mValidation:\x1b[0m ${validIcon} ${v.valid ? 'PASSED' : 'FAILED'}\x1b[0m`);
  if (v.summary.must > 0) {
    lines.push(`  \x1b[31m${v.summary.must} must-fix violation${v.summary.must !== 1 ? 's' : ''}\x1b[0m`);
  }
  if (v.summary.should > 0) {
    lines.push(`  \x1b[33m${v.summary.should} warning${v.summary.should !== 1 ? 's' : ''}\x1b[0m`);
  }

  lines.push('');
  lines.push('To deploy for real, remove --dry-run');
  lines.push('');

  return lines.join('\n');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
