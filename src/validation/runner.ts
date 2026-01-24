/**
 * Validation Runner
 *
 * Central orchestrator that runs all validation:
 * - Flowlint core rules (static analysis)
 * - Custom Codika rules (graph-based)
 * - Workflow scripts (content-based checks)
 * - Use-case scripts (folder-based checks)
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve, basename } from 'path';
import {
  parseN8n,
  runAllRules as runFlowlintRules,
  defaultConfig,
} from '@replikanti/flowlint-core';
import type {
  Finding,
  ValidationResult,
  FindingSummary,
  WorkflowValidationOptions,
  UseCaseValidationOptions,
  Graph,
} from './types.js';
import { customRules } from './rules/index.js';
import { workflowScripts } from './workflow-scripts/index.js';
import { useCaseScripts } from './use-case-scripts/index.js';
import { applyFixes } from './fixer.js';

/**
 * Calculate summary from findings
 */
function calculateSummary(findings: Finding[]): FindingSummary {
  return {
    must: findings.filter(f => f.severity === 'must').length,
    should: findings.filter(f => f.severity === 'should').length,
    nit: findings.filter(f => f.severity === 'nit').length,
    fixable: findings.filter(f => f.fixable).length,
  };
}

/**
 * Filter findings by rule IDs if specified
 */
function filterByRules(findings: Finding[], rules?: string[]): Finding[] {
  if (!rules || rules.length === 0) {
    return findings;
  }
  const ruleSet = new Set(rules.map(r => r.toUpperCase()));
  return findings.filter(f => ruleSet.has(f.rule.toUpperCase()));
}

/**
 * Validate a single workflow JSON file
 */
export async function validateWorkflow(
  options: WorkflowValidationOptions
): Promise<ValidationResult> {
  const absolutePath = resolve(options.path);
  const findings: Finding[] = [];
  const filesValidated: string[] = [absolutePath];

  // Check file exists
  if (!existsSync(absolutePath)) {
    findings.push({
      rule: 'FILE-001',
      severity: 'must',
      path: absolutePath,
      message: `Workflow file does not exist: ${absolutePath}`,
      raw_details: 'Check the file path is correct.',
    });
    return {
      valid: false,
      findings,
      summary: calculateSummary(findings),
      filesValidated,
    };
  }

  // Read file content
  let content: string;
  try {
    content = readFileSync(absolutePath, 'utf-8');
  } catch (error) {
    findings.push({
      rule: 'FILE-002',
      severity: 'must',
      path: absolutePath,
      message: `Failed to read workflow file: ${(error as Error).message}`,
      raw_details: 'Check file permissions and encoding.',
    });
    return {
      valid: false,
      findings,
      summary: calculateSummary(findings),
      filesValidated,
    };
  }

  // Parse and validate JSON
  let graph: Graph;
  try {
    graph = parseN8n(content);
  } catch (error) {
    findings.push({
      rule: 'JSON-001',
      severity: 'must',
      path: absolutePath,
      message: `Invalid workflow JSON: ${(error as Error).message}`,
      raw_details: 'Ensure the file contains valid JSON with proper n8n workflow structure.',
    });
    return {
      valid: false,
      findings,
      summary: calculateSummary(findings),
      filesValidated,
    };
  }

  // Run Flowlint core rules
  const coreFindings = runFlowlintRules(
    graph,
    { cfg: defaultConfig, path: absolutePath }
  );
  findings.push(...coreFindings);

  // Run custom Codika rules
  for (const rule of customRules) {
    try {
      const ruleFindings = rule(graph, { cfg: defaultConfig, path: absolutePath });
      findings.push(...ruleFindings);
    } catch (error) {
      findings.push({
        rule: 'RULE-ERR',
        severity: 'nit',
        path: absolutePath,
        message: `Custom rule error: ${(error as Error).message}`,
      });
    }
  }

  // Run workflow scripts (content-based checks)
  for (const script of workflowScripts) {
    try {
      const scriptFindings = script(content, absolutePath);
      findings.push(...scriptFindings);
    } catch (error) {
      findings.push({
        rule: 'SCRIPT-ERR',
        severity: 'nit',
        path: absolutePath,
        message: `Workflow script error: ${(error as Error).message}`,
      });
    }
  }

  // Filter by rules if specified
  let filteredFindings = filterByRules(findings, options.rules);

  // Apply strict mode
  if (options.strict) {
    filteredFindings = filteredFindings.map(f =>
      f.severity === 'should' ? { ...f, severity: 'must' as const } : f
    );
  }

  // Handle auto-fix
  if (options.fix || options.dryRun) {
    const fixResult = applyFixes(absolutePath, filteredFindings, {
      dryRun: options.dryRun,
    });

    if (fixResult.applied > 0 && !options.dryRun) {
      // Remove fixed findings from the list
      const fixedRules = new Set(
        filteredFindings.filter(f => f.fixable && f.fix).map(f => f.rule)
      );
      filteredFindings = filteredFindings.filter(
        f => !f.fixable || !fixedRules.has(f.rule)
      );
    }
  }

  const summary = calculateSummary(filteredFindings);
  const valid = summary.must === 0;

  return {
    valid,
    findings: filteredFindings,
    summary,
    filesValidated,
  };
}

/**
 * Validate an entire use-case folder
 */
export async function validateUseCase(
  options: UseCaseValidationOptions
): Promise<ValidationResult> {
  const absolutePath = resolve(options.path);
  const findings: Finding[] = [];
  const filesValidated: string[] = [];

  // Check folder exists
  if (!existsSync(absolutePath)) {
    findings.push({
      rule: 'FOLDER-001',
      severity: 'must',
      path: absolutePath,
      message: `Use-case folder does not exist: ${absolutePath}`,
      raw_details: 'Check the folder path is correct.',
    });
    return {
      valid: false,
      findings,
      summary: calculateSummary(findings),
      filesValidated,
    };
  }

  // Run use-case scripts
  for (const script of useCaseScripts) {
    try {
      const scriptFindings = await script(absolutePath);
      findings.push(...scriptFindings);
    } catch (error) {
      findings.push({
        rule: 'SCRIPT-ERR',
        severity: 'nit',
        path: absolutePath,
        message: `Use-case script error: ${(error as Error).message}`,
      });
    }
  }

  // Validate individual workflows unless skipped
  if (!options.skipWorkflows) {
    const workflowsPath = join(absolutePath, 'workflows');

    if (existsSync(workflowsPath)) {
      const workflowFiles = readdirSync(workflowsPath)
        .filter(f => f.endsWith('.json'));

      for (const workflowFile of workflowFiles) {
        const workflowPath = join(workflowsPath, workflowFile);
        filesValidated.push(workflowPath);

        const workflowResult = await validateWorkflow({
          path: workflowPath,
          strict: options.strict,
          fix: options.fix,
          dryRun: options.dryRun,
          rules: options.rules,
        });

        // Add workflow findings with context
        for (const finding of workflowResult.findings) {
          findings.push({
            ...finding,
            message: `[${basename(workflowFile)}] ${finding.message}`,
          });
        }
      }
    }
  }

  // Filter by rules if specified
  let filteredFindings = filterByRules(findings, options.rules);

  // Apply strict mode
  if (options.strict) {
    filteredFindings = filteredFindings.map(f =>
      f.severity === 'should' ? { ...f, severity: 'must' as const } : f
    );
  }

  const summary = calculateSummary(filteredFindings);
  const valid = summary.must === 0;

  return {
    valid,
    findings: filteredFindings,
    summary,
    filesValidated: [absolutePath, ...filesValidated],
  };
}

/**
 * Get list of all available rules (for --rules flag help)
 */
export function getAvailableRules(): { id: string; description: string }[] {
  // This could be expanded to include metadata from all rules
  return [
    { id: 'CODIKA-INIT', description: 'Parent workflows must have Codika Init node' },
    { id: 'CODIKA-SUBMIT', description: 'Workflows must end with Submit Result or Report Error' },
    { id: 'R1', description: 'API nodes require retry configuration' },
    { id: 'R2', description: 'Error handling - avoid continueOnFail' },
    { id: 'R4', description: 'No hardcoded secrets' },
    // Add more as rules are implemented
  ];
}
