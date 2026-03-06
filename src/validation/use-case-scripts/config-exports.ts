/**
 * Script: CONFIG-EXPORTS
 *
 * Validates that config.ts exports the required members:
 * - WORKFLOW_FILES (array)
 * - getConfiguration (function)
 *
 * Also checks that project.json exists in the use case folder.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CONFIG-EXPORTS',
  name: 'config_exports',
  severity: 'must',
  description: 'config.ts must export WORKFLOW_FILES and getConfiguration, and project.json must exist',
  details: 'Ensure your config.ts file exports all required members and project.json contains the target project ID',
  category: 'config',
};

/**
 * Check that config.ts exports required members
 */
export async function checkConfigExports(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const configTsPath = join(useCasePath, 'config.ts');
  const configJsPath = join(useCasePath, 'config.js');

  // Check if config file exists
  let configPath: string | null = null;
  if (existsSync(configTsPath)) {
    configPath = configTsPath;
  } else if (existsSync(configJsPath)) {
    configPath = configJsPath;
  }

  if (!configPath) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: useCasePath,
      message: 'Missing config.ts file',
      raw_details: 'Create a config.ts file that exports WORKFLOW_FILES and getConfiguration()',
    });
    return findings;
  }

  // Read and analyze config file
  let content: string;
  try {
    content = readFileSync(configPath, 'utf-8');
  } catch (error) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: configPath,
      message: `Cannot read config file: ${(error as Error).message}`,
    });
    return findings;
  }

  // Check for required exports using simple regex patterns
  // (A full AST parser would be more robust but this covers common cases)

  // Check for project.json
  if (!existsSync(join(useCasePath, 'project.json'))) {
    findings.push({
      rule: metadata.id,
      severity: 'should',
      path: useCasePath,
      message: 'Missing project.json — required before deployment',
      raw_details: 'Create project.json with {"projectId": "..."} in the use case folder, or run: codika-helper project create --name "..." --path .',
    });
  }

  // Check for WORKFLOW_FILES export
  if (!/export\s+(const|let|var)\s+WORKFLOW_FILES\s*=/s.test(content)) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: configPath,
      message: 'Missing export: WORKFLOW_FILES',
      raw_details: 'Add: export const WORKFLOW_FILES = [join(__dirname, \'workflows/workflow.json\')];',
    });
  }

  // Check for getConfiguration export
  if (!/export\s+(function|const)\s+getConfiguration/s.test(content)) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: configPath,
      message: 'Missing export: getConfiguration',
      raw_details: 'Add: export function getConfiguration(): ProcessDeploymentConfigurationInput { ... }',
    });
  }

  return findings;
}
