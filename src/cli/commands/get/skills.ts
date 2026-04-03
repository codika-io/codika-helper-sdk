/**
 * Get Skills Command
 *
 * Fetches skill documents from a deployed process instance.
 * Downloads them as Claude-compatible skill directories ({name}/SKILL.md).
 *
 * Usage:
 *   codika get skills [processInstanceId]
 *   codika get skills --path ./my-use-case
 *   codika get skills --json
 *   codika get skills --stdout
 */

import { Command } from 'commander';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { fetchSkills, isFetchSkillsSuccess } from '../../../utils/skills-client.js';
import { resolveApiKey, resolveEndpointUrl, API_KEY_MISSING_MESSAGE } from '../../../utils/config.js';
import { readProjectJson } from '../../../utils/project-json.js';

interface SkillsOptions {
  processInstanceId?: string;
  path?: string;
  projectFile?: string;
  output?: string;
  stdout?: boolean;
  apiUrl?: string;
  apiKey?: string;
  json?: boolean;
  profile?: string;
}

export const skillsCommand = new Command('skills')
  .description('Fetch skill documents from a deployed process instance')
  .argument('[processInstanceId]', 'Process instance ID (resolves from project.json if omitted)')
  .option('--process-instance-id <id>', 'Process instance ID (alternative to positional arg)')
  .option('--path <path>', 'Path to use case folder (to auto-resolve from project.json)')
  .option('--project-file <path>', 'Path to custom project file')
  .option('-o, --output <dir>', 'Output directory for skill files (default: ./skills)')
  .option('--stdout', 'Print skill content to stdout instead of writing files')
  .option('--api-url <url>', 'Override API URL')
  .option('--api-key <key>', 'Override API key')
  .option('--json', 'Output as JSON')
  .option('--profile <name>', 'Use a specific profile')
  .action(async (processInstanceIdArg: string | undefined, options: SkillsOptions) => {
    try {
      await runGetSkills(processInstanceIdArg, options);
    } catch (error) {
      if (options.json) {
        console.log(JSON.stringify({
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error),
          },
        }, null, 2));
      } else {
        console.error(`\x1b[31mError:\x1b[0m ${error instanceof Error ? error.message : error}`);
      }
      process.exit(1);
    }
  });

/**
 * Resolve process instance ID from multiple sources:
 *   1. Positional argument
 *   2. --process-instance-id flag
 *   3. project.json in --path directory
 *   4. project.json in current directory
 */
function resolveProcessInstanceId(arg: string | undefined, options: SkillsOptions): string | undefined {
  if (arg) return arg;
  if (options.processInstanceId) return options.processInstanceId;

  if (options.path) {
    const projectJson = readProjectJson(resolve(options.path), options.projectFile);
    if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;
  }

  const projectJson = readProjectJson(process.cwd(), options.projectFile);
  if (projectJson?.devProcessInstanceId) return projectJson.devProcessInstanceId;

  return undefined;
}

async function runGetSkills(processInstanceIdArg: string | undefined, options: SkillsOptions): Promise<void> {
  const processInstanceId = resolveProcessInstanceId(processInstanceIdArg, options);
  if (!processInstanceId) {
    throw new Error(
      'Process instance ID is required.\n' +
      'Provide it as an argument, via --process-instance-id, or ensure project.json has devProcessInstanceId.'
    );
  }

  const apiKey = resolveApiKey(options.apiKey, options.profile);
  if (!apiKey) {
    throw new Error(API_KEY_MISSING_MESSAGE);
  }

  const apiUrl = resolveEndpointUrl('getProcessSkills', options.apiUrl, options.profile);

  const response = await fetchSkills({
    processInstanceId,
    apiUrl,
    apiKey,
  });

  if (!isFetchSkillsSuccess(response)) {
    throw new Error(`Failed to fetch skills: ${response.error.message}`);
  }

  const { skills } = response.data;

  if (options.json) {
    console.log(JSON.stringify({
      success: true,
      processInstanceId,
      skillCount: skills.length,
      skills,
    }, null, 2));
    return;
  }

  if (skills.length === 0) {
    console.log('No skills found for this process instance.');
    return;
  }

  if (options.stdout) {
    // Print all skills to stdout
    for (const skill of skills) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Skill: ${skill.name} (${skill.workflowTemplateId})`);
      console.log('='.repeat(60));
      console.log(skill.contentMarkdown);
    }
    return;
  }

  // Write as Claude-compatible skill directories
  const outputDir = resolve(options.output || './skills');

  for (const skill of skills) {
    const skillDir = join(outputDir, skill.name);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), skill.contentMarkdown);
  }

  console.log(`\x1b[32m✓\x1b[0m Downloaded ${skills.length} skill(s) to ${outputDir}/`);
  console.log('');
  for (const skill of skills) {
    console.log(`  ${skill.name}/SKILL.md`);
    console.log(`    ${skill.description}`);
    console.log(`    Trigger: codika trigger ${skill.workflowTemplateId}`);
    console.log('');
  }
  console.log('To use with Claude Code:');
  console.log(`  codika get skills --output .claude/skills`);
  console.log('');
  console.log('Claude Code auto-discovers skills in .claude/skills/ at startup.');
}
