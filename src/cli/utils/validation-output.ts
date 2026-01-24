/**
 * Validation Output Utilities
 *
 * Formatting functions for validation results in CLI output.
 */

import { basename } from 'path';
import type { ValidationResult, Finding, FixResult } from '../../validation/types.js';

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// Box drawing characters
const box = {
  topLeft: '\u250C',
  topRight: '\u2510',
  bottomLeft: '\u2514',
  bottomRight: '\u2518',
  horizontal: '\u2500',
  vertical: '\u2502',
  teeRight: '\u251C',
  teeLeft: '\u2524',
};

interface FormatOptions {
  showFixTip?: boolean;
  isDryRun?: boolean;
  isUseCase?: boolean;
}

/**
 * Get severity color
 */
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'must':
      return colors.red;
    case 'should':
      return colors.yellow;
    case 'nit':
      return colors.cyan;
    default:
      return colors.reset;
  }
}

/**
 * Get severity label
 */
function getSeverityLabel(severity: string): string {
  return severity.toUpperCase().padEnd(6);
}

/**
 * Format a horizontal line
 */
function horizontalLine(width: number): string {
  return box.horizontal.repeat(width);
}

/**
 * Format the header box
 */
function formatHeader(title: string, path: string, width: number): string {
  const lines: string[] = [];
  const innerWidth = width - 2;

  lines.push(box.topLeft + horizontalLine(innerWidth) + box.topRight);
  lines.push(box.vertical + ` ${title}`.padEnd(innerWidth) + box.vertical);
  lines.push(box.teeRight + horizontalLine(innerWidth) + box.teeLeft);

  return lines.join('\n');
}

/**
 * Format the summary section
 */
function formatSummary(result: ValidationResult, width: number): string {
  const lines: string[] = [];
  const innerWidth = width - 2;
  const { summary } = result;

  const mustLine = `  ${colors.red}MUST${colors.reset}   ${box.vertical} ${summary.must} violation${summary.must !== 1 ? 's' : ''}`;
  const shouldLine = `  ${colors.yellow}SHOULD${colors.reset} ${box.vertical} ${summary.should} warning${summary.should !== 1 ? 's' : ''}`;
  const nitLine = `  ${colors.cyan}NIT${colors.reset}    ${box.vertical} ${summary.nit} suggestion${summary.nit !== 1 ? 's' : ''}`;
  const fixableLine = `  ${colors.magenta}FIXABLE${colors.reset}${box.vertical} ${summary.fixable} auto-fixable`;

  lines.push(box.vertical + mustLine.padEnd(innerWidth + 20) + box.vertical);
  lines.push(box.vertical + shouldLine.padEnd(innerWidth + 20) + box.vertical);
  lines.push(box.vertical + nitLine.padEnd(innerWidth + 20) + box.vertical);

  if (summary.fixable > 0) {
    lines.push(box.vertical + fixableLine.padEnd(innerWidth + 20) + box.vertical);
  }

  lines.push(box.teeRight + horizontalLine(innerWidth) + box.teeLeft);

  return lines.join('\n');
}

/**
 * Format a single finding
 */
function formatFinding(finding: Finding): string {
  const color = getSeverityColor(finding.severity);
  const label = getSeverityLabel(finding.severity);
  const fixableTag = finding.fixable ? ` ${colors.magenta}[FIXABLE]${colors.reset}` : '';
  const lineInfo = finding.line ? ` (line ${finding.line})` : '';

  let output = `  ${color}[${label}]${colors.reset} ${colors.bold}${finding.rule}${colors.reset}${lineInfo}${fixableTag}\n`;
  output += `  ${finding.message}\n`;

  if (finding.raw_details) {
    output += `  ${colors.gray}\u2192 ${finding.raw_details}${colors.reset}\n`;
  }

  return output;
}

/**
 * Format the findings section
 */
function formatFindings(findings: Finding[], width: number): string {
  if (findings.length === 0) {
    return '';
  }

  const lines: string[] = [];
  const innerWidth = width - 2;

  for (const finding of findings) {
    lines.push(box.vertical + ' '.repeat(innerWidth) + box.vertical);
    const formattedFinding = formatFinding(finding);
    for (const line of formattedFinding.split('\n')) {
      if (line.trim()) {
        // Rough width calculation (doesn't account for ANSI codes perfectly)
        lines.push(box.vertical + line.padEnd(innerWidth + 30) + box.vertical);
      }
    }
  }

  lines.push(box.vertical + ' '.repeat(innerWidth) + box.vertical);

  return lines.join('\n');
}

/**
 * Format the footer
 */
function formatFooter(result: ValidationResult, options: FormatOptions, width: number): string {
  const lines: string[] = [];
  const innerWidth = width - 2;

  lines.push(box.bottomLeft + horizontalLine(innerWidth) + box.bottomRight);

  if (result.valid) {
    lines.push(`${colors.green}\u2713 Validation PASSED${colors.reset}`);
  } else {
    const mustCount = result.summary.must;
    const fixableCount = result.summary.fixable;
    lines.push(`${colors.red}\u2717 Validation FAILED${colors.reset} (${mustCount} must-fix violation${mustCount !== 1 ? 's' : ''}${fixableCount > 0 ? `, ${fixableCount} auto-fixable` : ''})`);
  }

  if (options.showFixTip && result.summary.fixable > 0) {
    lines.push('');
    lines.push(`${colors.cyan}Tip:${colors.reset} Run with --fix to automatically repair ${result.summary.fixable} issue${result.summary.fixable !== 1 ? 's' : ''}`);
  }

  return '\n' + lines.join('\n') + '\n';
}

/**
 * Format dry-run output
 */
function formatDryRun(findings: Finding[]): string {
  const fixable = findings.filter(f => f.fixable && f.fix);

  if (fixable.length === 0) {
    return `\n${colors.yellow}No auto-fixable issues found.${colors.reset}\n`;
  }

  const lines: string[] = [];
  lines.push('');
  lines.push(`${colors.cyan}DRY RUN - No changes made${colors.reset}`);
  lines.push('');
  lines.push(`Would fix ${fixable.length} issue${fixable.length !== 1 ? 's' : ''}:`);

  for (const finding of fixable) {
    lines.push(`  ${colors.magenta}\u2022${colors.reset} ${finding.rule}: ${finding.fix?.description || finding.message}`);
    if (finding.line) {
      lines.push(`    ${colors.gray}Line ${finding.line}${colors.reset}`);
    }
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Format complete validation result for CLI output
 */
export function formatValidationResult(
  result: ValidationResult,
  path: string,
  options: FormatOptions = {}
): string {
  const width = 65;
  const title = options.isUseCase
    ? `USE-CASE VALIDATION: ${basename(path)}`
    : `WORKFLOW VALIDATION: ${basename(path)}`;

  if (options.isDryRun) {
    return formatDryRun(result.findings);
  }

  let output = '\n';
  output += formatHeader(title, path, width);
  output += '\n';
  output += formatSummary(result, width);
  output += '\n';

  if (result.findings.length > 0) {
    output += formatFindings(result.findings, width);
    output += '\n';
  }

  output += formatFooter(result, options, width);

  return output;
}

/**
 * Format fix result for CLI output
 */
export function formatFixResult(fixResult: FixResult): string {
  if (fixResult.applied === 0) {
    return `${colors.yellow}No fixes applied to ${basename(fixResult.filePath)}${colors.reset}`;
  }

  return `${colors.green}\u2713 Applied ${fixResult.applied} fix${fixResult.applied !== 1 ? 'es' : ''} to ${basename(fixResult.filePath)}${colors.reset}`;
}
