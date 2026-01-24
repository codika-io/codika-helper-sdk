/**
 * Auto-Fix Orchestrator
 *
 * Applies automatic fixes to files based on findings.
 * Follows ESLint-style fixing pattern where each finding
 * can optionally include a fix function.
 */

import { readFileSync, writeFileSync } from 'fs';
import type { Finding, FixResult } from './types.js';

/**
 * Options for applying fixes
 */
export interface FixerOptions {
  /** If true, don't actually write changes to disk */
  dryRun?: boolean;
}

/**
 * Apply all available fixes to a file
 *
 * @param filePath - Path to the file to fix
 * @param findings - Array of findings, some of which may have fix functions
 * @param options - Fixer options (dryRun, etc.)
 * @returns Result with number of fixes applied and new content
 */
export function applyFixes(
  filePath: string,
  findings: Finding[],
  options: FixerOptions = {}
): FixResult {
  // Get fixable findings
  const fixableFindings = findings.filter(f => f.fixable && f.fix);

  if (fixableFindings.length === 0) {
    return {
      filePath,
      applied: 0,
      content: '',
      wouldFix: [],
    };
  }

  // In dry-run mode, just return what would be fixed
  if (options.dryRun) {
    return {
      filePath,
      applied: 0,
      content: '',
      wouldFix: fixableFindings,
    };
  }

  // Read current file content
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (error) {
    // If we can't read the file, we can't fix it
    return {
      filePath,
      applied: 0,
      content: '',
      wouldFix: fixableFindings,
    };
  }

  // Apply fixes in order
  let applied = 0;
  const originalContent = content;

  for (const finding of fixableFindings) {
    if (!finding.fix) continue;

    try {
      const newContent = finding.fix.apply(content);

      // Only count as applied if content actually changed
      if (newContent !== content) {
        content = newContent;
        applied++;
      }
    } catch (error) {
      // Skip fixes that throw errors
      console.error(`Fix for ${finding.rule} failed: ${(error as Error).message}`);
    }
  }

  // Write back to file if changes were made
  if (applied > 0 && content !== originalContent) {
    try {
      writeFileSync(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Failed to write fixes to ${filePath}: ${(error as Error).message}`);
      return {
        filePath,
        applied: 0,
        content: originalContent,
      };
    }
  }

  return {
    filePath,
    applied,
    content,
  };
}

/**
 * Apply fixes to multiple files
 *
 * @param fileFindings - Map of file path to findings
 * @param options - Fixer options
 * @returns Array of fix results for each file
 */
export function applyFixesToMultipleFiles(
  fileFindings: Map<string, Finding[]>,
  options: FixerOptions = {}
): FixResult[] {
  const results: FixResult[] = [];

  for (const [filePath, findings] of fileFindings) {
    const result = applyFixes(filePath, findings, options);
    results.push(result);
  }

  return results;
}

/**
 * Group findings by file path
 *
 * @param findings - Array of findings from multiple files
 * @returns Map of file path to findings for that file
 */
export function groupFindingsByFile(findings: Finding[]): Map<string, Finding[]> {
  const grouped = new Map<string, Finding[]>();

  for (const finding of findings) {
    const existing = grouped.get(finding.path) || [];
    existing.push(finding);
    grouped.set(finding.path, existing);
  }

  return grouped;
}

/**
 * Preview what fixes would be applied to a file
 *
 * @param filePath - Path to the file
 * @param findings - Findings with potential fixes
 * @returns Preview of changes that would be made
 */
export function previewFixes(
  filePath: string,
  findings: Finding[]
): {
  file: string;
  fixes: Array<{
    rule: string;
    description: string;
    before?: string;
    after?: string;
  }>;
} {
  const fixableFindings = findings.filter(f => f.fixable && f.fix);

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return {
      file: filePath,
      fixes: fixableFindings.map(f => ({
        rule: f.rule,
        description: f.fix?.description || 'Unknown fix',
      })),
    };
  }

  const fixes: Array<{
    rule: string;
    description: string;
    before?: string;
    after?: string;
  }> = [];

  for (const finding of fixableFindings) {
    if (!finding.fix) continue;

    try {
      const newContent = finding.fix.apply(content);

      if (newContent !== content) {
        // Extract relevant lines for before/after preview
        // This is a simplified version - could be enhanced
        fixes.push({
          rule: finding.rule,
          description: finding.fix.description,
          // For line-specific changes, we could extract just those lines
          // For now, we just note that a change would be made
        });
      }
    } catch {
      // Skip preview for fixes that would fail
    }
  }

  return {
    file: filePath,
    fixes,
  };
}
