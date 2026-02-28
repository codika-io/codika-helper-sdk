/**
 * Deployment Archiver
 * Archives deployed versions locally and tracks version mappings in project-info.json.
 */

import { mkdir, copyFile, writeFile, readFile } from 'fs/promises';
import { join, basename } from 'path';
import type { ProcessDeploymentConfigurationInput } from '../types/process-types.js';
import type { DeployUseCaseResult } from './use-case-deployer.js';
import { isDeploySuccess } from './deploy-client.js';

/**
 * Deployment info stored in the version archive
 */
export interface DeploymentInfo {
  version: string;
  useCaseVersion: string;
  deployedAt: string;
  templateId: string;
  deploymentInstanceId: string;
  processId: string;
  isNewProcess: boolean;
  processInstanceId?: string;
  workflowsDeployed: Array<{
    workflowTemplateId: string;
    n8nWorkflowId: string;
    status: 'active' | 'inactive' | 'failed';
  }>;
  deploymentStatus: 'deployed' | 'failed' | 'pending';
}

/**
 * Version mapping entry — maps a deployed API version to a local semver
 */
export interface VersionMappingEntry {
  useCaseVersion: string;
  deployedAt: string;
}

/**
 * Project info stored in project-info.json
 */
export interface ProjectInfo {
  projectId: string;
  projectName?: string;
  notes?: string;
  createdAt: string;
  lastDeployedAt: string;
  versionMappings: {
    process: Record<string, VersionMappingEntry>;
    dataIngestion: Record<string, VersionMappingEntry>;
  };
}

/**
 * Archive a successful deployment.
 *
 * Creates:
 *   deployments/{projectId}/process/{apiVersion}/
 *   ├── deployment-info.json
 *   ├── config-snapshot.json  (base64 workflows replaced with reference)
 *   └── workflows/*.json      (copies of deployed workflow files)
 */
export async function archiveDeployment(opts: {
  useCasePath: string;
  projectId: string;
  apiVersion: string;
  useCaseVersion: string;
  result: DeployUseCaseResult;
}): Promise<void> {
  const { useCasePath, projectId, apiVersion, useCaseVersion, result } = opts;

  if (!isDeploySuccess(result)) {
    return;
  }

  const versionDir = join(useCasePath, 'deployments', projectId, 'process', apiVersion);
  const workflowsDir = join(versionDir, 'workflows');

  // Create directory structure
  await mkdir(workflowsDir, { recursive: true });

  // Copy workflow JSON files
  for (const workflowFile of result.workflowFiles) {
    const filename = basename(workflowFile);
    await copyFile(workflowFile, join(workflowsDir, filename));
  }

  // Save config snapshot (strip base64 workflow content)
  const configSnapshot = {
    ...result.configuration,
    workflows: result.configuration.workflows.map((w) => ({
      ...w,
      n8nWorkflowJsonBase64: '[archived in workflows/ folder]',
    })),
  };

  await writeFile(
    join(versionDir, 'config-snapshot.json'),
    JSON.stringify(configSnapshot, null, 2)
  );

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    version: result.data.version,
    useCaseVersion,
    deployedAt: new Date().toISOString(),
    templateId: result.data.templateId,
    deploymentInstanceId: result.data.deploymentInstanceId,
    processId: result.data.processId,
    isNewProcess: result.data.isNewProcess,
    processInstanceId: result.data.processInstanceId,
    workflowsDeployed: result.data.workflowsDeployed,
    deploymentStatus: result.data.deploymentStatus,
  };

  await writeFile(
    join(versionDir, 'deployment-info.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
}

/**
 * Update project-info.json with a new process version mapping.
 */
export async function updateProjectInfo(
  useCasePath: string,
  projectId: string,
  apiVersion: string,
  useCaseVersion: string
): Promise<ProjectInfo> {
  const projectDir = join(useCasePath, 'deployments', projectId);
  const infoPath = join(projectDir, 'project-info.json');

  // Read existing or create new
  let info: ProjectInfo;
  try {
    const content = await readFile(infoPath, 'utf-8');
    info = JSON.parse(content) as ProjectInfo;
  } catch {
    await mkdir(projectDir, { recursive: true });
    const now = new Date().toISOString();
    info = {
      projectId,
      createdAt: now,
      lastDeployedAt: now,
      versionMappings: { process: {}, dataIngestion: {} },
    };
  }

  // Update mapping
  const now = new Date().toISOString();
  info.lastDeployedAt = now;
  info.versionMappings.process[apiVersion] = {
    useCaseVersion,
    deployedAt: now,
  };

  await writeFile(infoPath, JSON.stringify(info, null, 2));
  return info;
}
