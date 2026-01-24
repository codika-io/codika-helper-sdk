/**
 * Script: CONFIG-WORKFLOWS
 *
 * Validates that:
 * - All files listed in WORKFLOW_FILES exist
 * - All JSON files in workflows/ are listed in WORKFLOW_FILES
 * - Workflow JSON files are valid JSON
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';

export const metadata: RuleMetadata = {
  id: 'CONFIG-WORKFLOWS',
  name: 'workflow_imports',
  severity: 'must',
  description: 'All workflows must be listed in WORKFLOW_FILES and exist on disk',
  details: 'Ensure WORKFLOW_FILES array matches the actual workflow files in the workflows/ folder',
  category: 'config',
};

/**
 * Extract WORKFLOW_FILES array from config content (simplified parser)
 */
function extractWorkflowFiles(content: string): string[] | null {
  // Look for WORKFLOW_FILES = [...] pattern
  const match = content.match(/WORKFLOW_FILES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    return null;
  }

  const arrayContent = match[1];

  // Extract string literals (simplified - works for common patterns)
  const files: string[] = [];

  // Match join(..., 'path') patterns
  const joinMatches = arrayContent.matchAll(/join\s*\([^,]+,\s*['"]([^'"]+)['"]\)/g);
  for (const m of joinMatches) {
    files.push(m[1]);
  }

  // Match direct string patterns
  const stringMatches = arrayContent.matchAll(/['"]([^'"]+\.json)['"]/g);
  for (const m of stringMatches) {
    files.push(m[1]);
  }

  return files;
}

/**
 * Check workflow imports consistency
 */
export async function checkWorkflowImports(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const workflowsPath = join(useCasePath, 'workflows');

  // Check workflows folder exists
  if (!existsSync(workflowsPath)) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: useCasePath,
      message: 'Missing workflows/ folder',
      raw_details: 'Create a workflows/ folder and add your workflow JSON files',
    });
    return findings;
  }

  // Get actual workflow files
  const actualFiles = new Set<string>();
  try {
    const entries = readdirSync(workflowsPath);
    for (const entry of entries) {
      if (entry.endsWith('.json')) {
        const fullPath = join(workflowsPath, entry);
        if (statSync(fullPath).isFile()) {
          actualFiles.add(entry);

          // Validate JSON
          try {
            const content = readFileSync(fullPath, 'utf-8');
            JSON.parse(content);
          } catch (error) {
            findings.push({
              rule: 'JSON-VALID',
              severity: 'must',
              path: fullPath,
              message: `Invalid JSON in ${entry}: ${(error as Error).message}`,
              raw_details: 'Fix the JSON syntax errors in this file',
            });
          }
        }
      }
    }
  } catch (error) {
    findings.push({
      rule: metadata.id,
      severity: 'must',
      path: workflowsPath,
      message: `Cannot read workflows folder: ${(error as Error).message}`,
    });
    return findings;
  }

  // Try to read config.ts to check WORKFLOW_FILES
  const configPath = join(useCasePath, 'config.ts');
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, 'utf-8');
      const declaredFiles = extractWorkflowFiles(configContent);

      if (declaredFiles !== null) {
        const declaredNames = new Set(declaredFiles.map(f => basename(f)));

        // Check for files in WORKFLOW_FILES that don't exist
        for (const declaredFile of declaredFiles) {
          const fileName = basename(declaredFile);
          const fullPath = join(workflowsPath, fileName);

          if (!existsSync(fullPath)) {
            findings.push({
              rule: metadata.id,
              severity: 'must',
              path: configPath,
              message: `WORKFLOW_FILES references non-existent file: ${declaredFile}`,
              raw_details: `Either create ${fileName} in workflows/ or remove it from WORKFLOW_FILES`,
            });
          }
        }

        // Check for files in workflows/ not listed in WORKFLOW_FILES
        for (const actualFile of actualFiles) {
          if (!declaredNames.has(actualFile)) {
            findings.push({
              rule: metadata.id,
              severity: 'should',
              path: join(workflowsPath, actualFile),
              message: `Workflow file not listed in WORKFLOW_FILES: ${actualFile}`,
              raw_details: `Add this file to WORKFLOW_FILES array or remove it from workflows/`,
            });
          }
        }
      }
    } catch (error) {
      // Config reading failed - covered by other checks
    }
  }

  return findings;
}
