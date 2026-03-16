/**
 * Script: SKILL-CONSISTENCY
 *
 * Validates skill files in the skills/ directory follow the Claude Agent Skills format:
 * - Each subdirectory must contain a SKILL.md file
 * - SKILL.md must have valid YAML frontmatter (name, description, workflowTemplateId)
 * - name must follow Claude spec: max 64 chars, lowercase+numbers+hyphens, no reserved words
 * - description must be non-empty, max 1024 chars
 * - workflowTemplateId must reference an existing workflow
 * - No duplicate names or workflowTemplateIds
 *
 * Skills folder is optional — no error if missing.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, basename } from 'path';
import type { Finding } from '../types.js';
import type { RuleMetadata } from '../types.js';
import { parseSkillFrontmatter } from '../../utils/skill-parser.js';

export const metadata: RuleMetadata = {
  id: 'SKILL-CONSISTENCY',
  name: 'skill_consistency',
  severity: 'must',
  description: 'Skill files must follow Claude Agent Skills format with valid frontmatter and workflow references',
  details: 'Each skill directory must contain a SKILL.md with name, description, and workflowTemplateId in YAML frontmatter',
  category: 'skills',
};

const MAX_NAME_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 1024;
const NAME_PATTERN = /^[a-z0-9-]+$/;
const RESERVED_WORDS = ['anthropic', 'claude'];

/**
 * Check skill consistency across the use case
 */
export async function checkSkillConsistency(useCasePath: string): Promise<Finding[]> {
  const findings: Finding[] = [];
  const skillsPath = join(useCasePath, 'skills');

  // Skills folder is optional
  if (!existsSync(skillsPath)) {
    return findings;
  }

  // Collect known workflow template IDs from workflows/ folder
  const workflowsPath = join(useCasePath, 'workflows');
  const knownTemplateIds = existsSync(workflowsPath)
    ? readdirSync(workflowsPath)
        .filter(f => f.endsWith('.json'))
        .map(f => basename(f, '.json'))
    : [];

  const entries = readdirSync(skillsPath);
  const seenNames = new Set<string>();
  const seenWorkflowIds = new Set<string>();

  for (const entry of entries) {
    const entryPath = join(skillsPath, entry);

    // Only check directories
    if (!statSync(entryPath).isDirectory()) {
      continue;
    }

    const skillMdPath = join(entryPath, 'SKILL.md');
    const relativePath = `skills/${entry}/SKILL.md`;

    // SKILL-STRUCTURE: Directory must contain SKILL.md
    if (!existsSync(skillMdPath)) {
      findings.push({
        rule: 'SKILL-STRUCTURE',
        severity: 'must',
        path: entryPath,
        message: `${relativePath}: skill directory '${entry}' is missing a SKILL.md file`,
      });
      continue;
    }

    const content = readFileSync(skillMdPath, 'utf-8');
    const { frontmatter } = parseSkillFrontmatter(content);

    // SKILL-FRONTMATTER: Must have valid frontmatter
    if (!frontmatter.name && !frontmatter.description && !frontmatter.workflowTemplateId) {
      findings.push({
        rule: 'SKILL-FRONTMATTER',
        severity: 'must',
        path: skillMdPath,
        message: `${relativePath}: missing or empty YAML frontmatter`,
      });
      continue;
    }

    // SKILL-NAME-FORMAT: name validation (Claude spec)
    if (!frontmatter.name) {
      findings.push({
        rule: 'SKILL-NAME-FORMAT',
        severity: 'must',
        path: skillMdPath,
        message: `${relativePath}: missing required 'name' in frontmatter`,
      });
    } else {
      if (frontmatter.name.length > MAX_NAME_LENGTH) {
        findings.push({
          rule: 'SKILL-NAME-FORMAT',
          severity: 'must',
          path: skillMdPath,
          message: `${relativePath}: name '${frontmatter.name}' exceeds ${MAX_NAME_LENGTH} characters`,
        });
      }
      if (!NAME_PATTERN.test(frontmatter.name)) {
        findings.push({
          rule: 'SKILL-NAME-FORMAT',
          severity: 'must',
          path: skillMdPath,
          message: `${relativePath}: name '${frontmatter.name}' must contain only lowercase letters, numbers, and hyphens`,
        });
      }
      for (const reserved of RESERVED_WORDS) {
        if (frontmatter.name.includes(reserved)) {
          findings.push({
            rule: 'SKILL-NAME-FORMAT',
            severity: 'must',
            path: skillMdPath,
            message: `${relativePath}: name '${frontmatter.name}' contains reserved word '${reserved}'`,
          });
        }
      }
      // SKILL-DUPLICATE: Check for duplicate names
      if (seenNames.has(frontmatter.name)) {
        findings.push({
          rule: 'SKILL-DUPLICATE',
          severity: 'must',
          path: skillMdPath,
          message: `${relativePath}: duplicate skill name '${frontmatter.name}'`,
        });
      } else {
        seenNames.add(frontmatter.name);
      }
    }

    // SKILL-DESCRIPTION: description validation
    if (!frontmatter.description) {
      findings.push({
        rule: 'SKILL-DESCRIPTION',
        severity: 'should',
        path: skillMdPath,
        message: `${relativePath}: missing 'description' in frontmatter`,
      });
    } else if (frontmatter.description.length > MAX_DESCRIPTION_LENGTH) {
      findings.push({
        rule: 'SKILL-DESCRIPTION',
        severity: 'must',
        path: skillMdPath,
        message: `${relativePath}: description exceeds ${MAX_DESCRIPTION_LENGTH} characters`,
      });
    }

    // SKILL-WORKFLOW-REF: workflowTemplateId validation
    if (!frontmatter.workflowTemplateId) {
      findings.push({
        rule: 'SKILL-WORKFLOW-REF',
        severity: 'must',
        path: skillMdPath,
        message: `${relativePath}: missing required 'workflowTemplateId' in frontmatter`,
      });
    } else {
      if (knownTemplateIds.length > 0 && !knownTemplateIds.includes(frontmatter.workflowTemplateId)) {
        findings.push({
          rule: 'SKILL-WORKFLOW-REF',
          severity: 'must',
          path: skillMdPath,
          message: `${relativePath}: workflowTemplateId '${frontmatter.workflowTemplateId}' does not match any workflow file`,
          raw_details: `Known workflows: ${knownTemplateIds.join(', ')}`,
        });
      }
      // SKILL-DUPLICATE: Check for duplicate workflowTemplateIds
      if (seenWorkflowIds.has(frontmatter.workflowTemplateId)) {
        findings.push({
          rule: 'SKILL-DUPLICATE',
          severity: 'must',
          path: skillMdPath,
          message: `${relativePath}: duplicate workflowTemplateId '${frontmatter.workflowTemplateId}'`,
        });
      } else {
        seenWorkflowIds.add(frontmatter.workflowTemplateId);
      }
    }
  }

  return findings;
}
