/**
 * Completion Command
 *
 * Generate shell completion scripts for bash, zsh, and fish.
 *
 * Usage:
 *   codika-helper completion bash         # print bash completion script
 *   codika-helper completion zsh          # print zsh completion script
 *   codika-helper completion fish         # print fish completion script
 *   codika-helper completion --install    # auto-detect shell and install
 *   codika-helper completion --uninstall  # remove installed completion
 */

import { Command } from 'commander';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, appendFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';

const BEGIN_MARKER = '# BEGIN codika-helper completion';
const END_MARKER = '# END codika-helper completion';

// ── Shell detection ──────────────────────────────────────

function detectShell(): 'bash' | 'zsh' | 'fish' | null {
  const shell = process.env.SHELL || '';
  if (shell.endsWith('/zsh') || shell.endsWith('/zsh5')) return 'zsh';
  if (shell.endsWith('/bash')) return 'bash';
  if (shell.endsWith('/fish')) return 'fish';
  return null;
}

function getRcFile(shell: 'bash' | 'zsh' | 'fish'): string {
  switch (shell) {
    case 'bash':
      return join(homedir(), '.bashrc');
    case 'zsh':
      return join(homedir(), '.zshrc');
    case 'fish':
      return join(homedir(), '.config', 'fish', 'completions', 'codika-helper.fish');
  }
}

// ── Bash completion ──────────────────────────────────────

function generateBashCompletion(): string {
  return `# codika-helper bash completion
_codika_helper_completions() {
  local cur prev words cword
  _init_completion || return

  # Collect all words before current
  local cmd=""
  local subcmd=""
  for ((i=1; i < cword; i++)); do
    case "\${words[i]}" in
      -*)
        ;;
      *)
        if [[ -z "$cmd" ]]; then
          cmd="\${words[i]}"
        elif [[ -z "$subcmd" ]]; then
          subcmd="\${words[i]}"
        fi
        ;;
    esac
  done

  # Top-level commands
  local commands="deploy get project verify config trigger login init whoami use logout status completion"

  # Subcommand completions
  case "$cmd" in
    deploy)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "use-case process-data-ingestion" -- "$cur") )
        return
      fi
      case "$subcmd" in
        use-case)
          COMPREPLY=( $(compgen -W "--api-url --api-key --project-id --patch --minor --major --version --additional-file --json --dry-run" -- "$cur") )
          return
          ;;
        process-data-ingestion)
          COMPREPLY=( $(compgen -W "--api-url --api-key --project-id --version-strategy --explicit-version --json" -- "$cur") )
          return
          ;;
      esac
      ;;
    get)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "execution use-case" -- "$cur") )
        return
      fi
      case "$subcmd" in
        execution)
          COMPREPLY=( $(compgen -W "--api-key --process-instance-id --deep --slim --json" -- "$cur") )
          return
          ;;
        use-case)
          COMPREPLY=( $(compgen -W "--api-key --project-id --version --include-content --json" -- "$cur") )
          return
          ;;
      esac
      ;;
    project)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "create" -- "$cur") )
        return
      fi
      case "$subcmd" in
        create)
          COMPREPLY=( $(compgen -W "--name --api-url --api-key --organization-id --path --json" -- "$cur") )
          return
          ;;
      esac
      ;;
    verify)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "use-case workflow" -- "$cur") )
        return
      fi
      case "$subcmd" in
        use-case)
          COMPREPLY=( $(compgen -W "--json --strict --fix --dry-run --rules --exclude-rules --skip-workflows" -- "$cur") )
          return
          ;;
        workflow)
          COMPREPLY=( $(compgen -W "--json --strict --fix --dry-run --rules --exclude-rules" -- "$cur") )
          return
          ;;
      esac
      ;;
    config)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "set show clear" -- "$cur") )
        return
      fi
      case "$subcmd" in
        clear)
          COMPREPLY=( $(compgen -W "--profile" -- "$cur") )
          return
          ;;
      esac
      ;;
    trigger)
      COMPREPLY=( $(compgen -W "--api-key --process-instance-id --workflow-id --payload --json --poll --timeout" -- "$cur") )
      return
      ;;
    login)
      COMPREPLY=( $(compgen -W "--api-key --base-url --name --skip-verify" -- "$cur") )
      return
      ;;
    init)
      COMPREPLY=( $(compgen -W "--name --description --icon --no-project --project-id --api-url --api-key --json" -- "$cur") )
      return
      ;;
    whoami)
      COMPREPLY=( $(compgen -W "--json --fresh" -- "$cur") )
      return
      ;;
    status)
      COMPREPLY=( $(compgen -W "--json --verify" -- "$cur") )
      return
      ;;
    use)
      local profiles
      profiles=$(codika-helper use --list-names 2>/dev/null)
      COMPREPLY=( $(compgen -W "$profiles" -- "$cur") )
      return
      ;;
    logout)
      local profiles
      profiles=$(codika-helper use --list-names 2>/dev/null)
      COMPREPLY=( $(compgen -W "$profiles" -- "$cur") )
      return
      ;;
    completion)
      if [[ -z "$subcmd" ]]; then
        COMPREPLY=( $(compgen -W "bash zsh fish --install --uninstall" -- "$cur") )
        return
      fi
      ;;
  esac

  # Default: complete top-level commands
  if [[ -z "$cmd" ]]; then
    COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
  fi
}

complete -o default -F _codika_helper_completions codika-helper`;
}

// ── Zsh completion ───────────────────────────────────────

function generateZshCompletion(): string {
  return `#compdef codika-helper
# codika-helper zsh completion

_codika_helper() {
  local -a commands
  local curcontext="$curcontext" state line

  _arguments -C \\
    '1:command:->command' \\
    '*::arg:->args'

  case $state in
    command)
      commands=(
        'deploy:Deploy use cases or data ingestion configurations'
        'get:Fetch execution details or use case information'
        'project:Manage projects'
        'verify:Validate use cases and workflows'
        'config:Manage CLI configuration'
        'trigger:Trigger a workflow execution'
        'login:Save API key'
        'init:Scaffold a new use case folder'
        'whoami:Show current authenticated identity'
        'use:Switch active profile or list profiles'
        'logout:Remove a profile'
        'status:Show project status'
        'completion:Generate shell completion scripts'
      )
      _describe 'command' commands
      ;;
    args)
      case $line[1] in
        deploy)
          _arguments -C \\
            '1:subcommand:->deploy_sub' \\
            '*::arg:->deploy_args'
          case $state in
            deploy_sub)
              local -a deploy_commands
              deploy_commands=(
                'use-case:Deploy a use case to the Codika platform'
                'process-data-ingestion:Deploy process-level data ingestion'
              )
              _describe 'subcommand' deploy_commands
              ;;
            deploy_args)
              case $line[1] in
                use-case)
                  _arguments \\
                    '--api-url[API base URL]:url:' \\
                    '--api-key[API key]:key:' \\
                    '--project-id[Project ID]:id:' \\
                    '--patch[Bump patch version]' \\
                    '--minor[Bump minor version]' \\
                    '--major[Bump major version]' \\
                    '--version[Explicit version]:version:' \\
                    '--additional-file[Additional file to include]:file:_files' \\
                    '--json[Output as JSON]' \\
                    '--dry-run[Dry run without deploying]' \\
                    '*:path:_files -/'
                  ;;
                process-data-ingestion)
                  _arguments \\
                    '--api-url[API base URL]:url:' \\
                    '--api-key[API key]:key:' \\
                    '--project-id[Project ID]:id:' \\
                    '--version-strategy[Version strategy]:strategy:(patch minor major)' \\
                    '--explicit-version[Explicit version]:version:' \\
                    '--json[Output as JSON]' \\
                    '*:path:_files -/'
                  ;;
              esac
              ;;
          esac
          ;;
        get)
          _arguments -C \\
            '1:subcommand:->get_sub' \\
            '*::arg:->get_args'
          case $state in
            get_sub)
              local -a get_commands
              get_commands=(
                'execution:Fetch execution details'
                'use-case:Fetch use case information'
              )
              _describe 'subcommand' get_commands
              ;;
            get_args)
              case $line[1] in
                execution)
                  _arguments \\
                    '--api-key[API key]:key:' \\
                    '--process-instance-id[Process instance ID]:id:' \\
                    '--deep[Include full details]' \\
                    '--slim[Minimal output]' \\
                    '--json[Output as JSON]'
                  ;;
                use-case)
                  _arguments \\
                    '--api-key[API key]:key:' \\
                    '--project-id[Project ID]:id:' \\
                    '--version[Version]:version:' \\
                    '--include-content[Include workflow content]' \\
                    '--json[Output as JSON]'
                  ;;
              esac
              ;;
          esac
          ;;
        project)
          _arguments -C \\
            '1:subcommand:->project_sub' \\
            '*::arg:->project_args'
          case $state in
            project_sub)
              local -a project_commands
              project_commands=(
                'create:Create a new project'
              )
              _describe 'subcommand' project_commands
              ;;
            project_args)
              case $line[1] in
                create)
                  _arguments \\
                    '--name[Project name]:name:' \\
                    '--api-url[API base URL]:url:' \\
                    '--api-key[API key]:key:' \\
                    '--organization-id[Organization ID]:id:' \\
                    '--path[Path to write project.json]:path:_files -/' \\
                    '--json[Output as JSON]'
                  ;;
              esac
              ;;
          esac
          ;;
        verify)
          _arguments -C \\
            '1:subcommand:->verify_sub' \\
            '*::arg:->verify_args'
          case $state in
            verify_sub)
              local -a verify_commands
              verify_commands=(
                'use-case:Validate an entire use-case folder'
                'workflow:Validate a single workflow file'
              )
              _describe 'subcommand' verify_commands
              ;;
            verify_args)
              case $line[1] in
                use-case)
                  _arguments \\
                    '--json[Output as JSON]' \\
                    '--strict[Strict mode]' \\
                    '--fix[Auto-fix violations]' \\
                    '--dry-run[Show fixes without applying]' \\
                    '--rules[Include only specific rules]:rules:' \\
                    '--exclude-rules[Exclude specific rules]:rules:' \\
                    '--skip-workflows[Skip workflow validation]' \\
                    '*:path:_files -/'
                  ;;
                workflow)
                  _arguments \\
                    '--json[Output as JSON]' \\
                    '--strict[Strict mode]' \\
                    '--fix[Auto-fix violations]' \\
                    '--dry-run[Show fixes without applying]' \\
                    '--rules[Include only specific rules]:rules:' \\
                    '--exclude-rules[Exclude specific rules]:rules:' \\
                    '*:path:_files'
                  ;;
              esac
              ;;
          esac
          ;;
        config)
          _arguments -C \\
            '1:subcommand:->config_sub' \\
            '*::arg:->config_args'
          case $state in
            config_sub)
              local -a config_commands
              config_commands=(
                'set:Save API key and base URL'
                'show:Display current configuration'
                'clear:Remove saved configuration'
              )
              _describe 'subcommand' config_commands
              ;;
            config_args)
              case $line[1] in
                clear)
                  _arguments \\
                    '--profile[Profile to clear]:profile:'
                  ;;
              esac
              ;;
          esac
          ;;
        trigger)
          _arguments \\
            '--api-key[API key]:key:' \\
            '--process-instance-id[Process instance ID]:id:' \\
            '--workflow-id[Workflow ID]:id:' \\
            '--payload[JSON payload]:payload:' \\
            '--json[Output as JSON]' \\
            '--poll[Poll for completion]' \\
            '--timeout[Poll timeout in seconds]:seconds:'
          ;;
        login)
          _arguments \\
            '--api-key[API key]:key:' \\
            '--base-url[Base URL override]:url:' \\
            '--name[Custom profile name]:name:' \\
            '--skip-verify[Save without verifying]'
          ;;
        init)
          _arguments \\
            '--name[Use case name]:name:' \\
            '--description[Use case description]:description:' \\
            '--icon[Use case icon]:icon:' \\
            '--no-project[Skip project creation]' \\
            '--project-id[Project ID]:id:' \\
            '--api-url[API base URL]:url:' \\
            '--api-key[API key]:key:' \\
            '--json[Output as JSON]' \\
            '*:path:_files -/'
          ;;
        whoami)
          _arguments \\
            '--json[Output as JSON]' \\
            '--fresh[Skip cache]'
          ;;
        status)
          _arguments \\
            '--json[Output as JSON]' \\
            '--verify[Run verification]'
          ;;
        use)
          local -a profiles
          profiles=(\${(f)"$(codika-helper use --list-names 2>/dev/null)"})
          _describe 'profile' profiles
          ;;
        logout)
          local -a profiles
          profiles=(\${(f)"$(codika-helper use --list-names 2>/dev/null)"})
          _describe 'profile' profiles
          ;;
        completion)
          _arguments -C \\
            '1:shell:(bash zsh fish)' \\
            '--install[Auto-detect shell and install completion]' \\
            '--uninstall[Remove installed completion]'
          ;;
      esac
      ;;
  esac
}

compdef _codika_helper codika-helper`;
}

// ── Fish completion ──────────────────────────────────────

function generateFishCompletion(): string {
  return `# codika-helper fish completion

# Disable file completions by default
complete -c codika-helper -f

# Top-level commands
complete -c codika-helper -n '__fish_use_subcommand' -a deploy -d 'Deploy use cases or data ingestion configurations'
complete -c codika-helper -n '__fish_use_subcommand' -a get -d 'Fetch execution details or use case information'
complete -c codika-helper -n '__fish_use_subcommand' -a project -d 'Manage projects'
complete -c codika-helper -n '__fish_use_subcommand' -a verify -d 'Validate use cases and workflows'
complete -c codika-helper -n '__fish_use_subcommand' -a config -d 'Manage CLI configuration'
complete -c codika-helper -n '__fish_use_subcommand' -a trigger -d 'Trigger a workflow execution'
complete -c codika-helper -n '__fish_use_subcommand' -a login -d 'Save API key'
complete -c codika-helper -n '__fish_use_subcommand' -a init -d 'Scaffold a new use case folder'
complete -c codika-helper -n '__fish_use_subcommand' -a whoami -d 'Show current authenticated identity'
complete -c codika-helper -n '__fish_use_subcommand' -a use -d 'Switch active profile or list profiles'
complete -c codika-helper -n '__fish_use_subcommand' -a logout -d 'Remove a profile'
complete -c codika-helper -n '__fish_use_subcommand' -a status -d 'Show project status'
complete -c codika-helper -n '__fish_use_subcommand' -a completion -d 'Generate shell completion scripts'

# deploy subcommands
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and not __fish_seen_subcommand_from use-case process-data-ingestion' -a use-case -d 'Deploy a use case'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and not __fish_seen_subcommand_from use-case process-data-ingestion' -a process-data-ingestion -d 'Deploy data ingestion'

# deploy use-case options
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l api-url -d 'API base URL'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l project-id -d 'Project ID'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l patch -d 'Bump patch version'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l minor -d 'Bump minor version'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l major -d 'Bump major version'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l version -d 'Explicit version'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l additional-file -d 'Additional file' -F
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from use-case' -l dry-run -d 'Dry run'

# deploy process-data-ingestion options
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l api-url -d 'API base URL'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l project-id -d 'Project ID'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l version-strategy -d 'Version strategy'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l explicit-version -d 'Explicit version'
complete -c codika-helper -n '__fish_seen_subcommand_from deploy; and __fish_seen_subcommand_from process-data-ingestion' -l json -d 'Output as JSON'

# get subcommands
complete -c codika-helper -n '__fish_seen_subcommand_from get; and not __fish_seen_subcommand_from execution use-case' -a execution -d 'Fetch execution details'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and not __fish_seen_subcommand_from execution use-case' -a use-case -d 'Fetch use case information'

# get execution options
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from execution' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from execution' -l process-instance-id -d 'Process instance ID'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from execution' -l deep -d 'Include full details'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from execution' -l slim -d 'Minimal output'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from execution' -l json -d 'Output as JSON'

# get use-case options
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from use-case' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from use-case' -l project-id -d 'Project ID'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from use-case' -l version -d 'Version'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from use-case' -l include-content -d 'Include workflow content'
complete -c codika-helper -n '__fish_seen_subcommand_from get; and __fish_seen_subcommand_from use-case' -l json -d 'Output as JSON'

# project subcommands
complete -c codika-helper -n '__fish_seen_subcommand_from project; and not __fish_seen_subcommand_from create' -a create -d 'Create a new project'

# project create options
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l name -d 'Project name'
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l api-url -d 'API base URL'
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l organization-id -d 'Organization ID'
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l path -d 'Path to write project.json' -F
complete -c codika-helper -n '__fish_seen_subcommand_from project; and __fish_seen_subcommand_from create' -l json -d 'Output as JSON'

# verify subcommands
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and not __fish_seen_subcommand_from use-case workflow' -a use-case -d 'Validate a use-case folder'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and not __fish_seen_subcommand_from use-case workflow' -a workflow -d 'Validate a single workflow'

# verify use-case options
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l strict -d 'Strict mode'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l fix -d 'Auto-fix violations'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l dry-run -d 'Show fixes without applying'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l rules -d 'Include only specific rules'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l exclude-rules -d 'Exclude specific rules'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from use-case' -l skip-workflows -d 'Skip workflow validation'

# verify workflow options
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l strict -d 'Strict mode'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l fix -d 'Auto-fix violations'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l dry-run -d 'Show fixes without applying'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l rules -d 'Include only specific rules'
complete -c codika-helper -n '__fish_seen_subcommand_from verify; and __fish_seen_subcommand_from workflow' -l exclude-rules -d 'Exclude specific rules'

# config subcommands
complete -c codika-helper -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from set show clear' -a set -d 'Save API key and base URL'
complete -c codika-helper -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from set show clear' -a show -d 'Display current configuration'
complete -c codika-helper -n '__fish_seen_subcommand_from config; and not __fish_seen_subcommand_from set show clear' -a clear -d 'Remove saved configuration'

# config clear options
complete -c codika-helper -n '__fish_seen_subcommand_from config; and __fish_seen_subcommand_from clear' -l profile -d 'Profile to clear'

# trigger options
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l process-instance-id -d 'Process instance ID'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l workflow-id -d 'Workflow ID'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l payload -d 'JSON payload'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l poll -d 'Poll for completion'
complete -c codika-helper -n '__fish_seen_subcommand_from trigger' -l timeout -d 'Poll timeout in seconds'

# login options
complete -c codika-helper -n '__fish_seen_subcommand_from login' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from login' -l base-url -d 'Base URL override'
complete -c codika-helper -n '__fish_seen_subcommand_from login' -l name -d 'Custom profile name'
complete -c codika-helper -n '__fish_seen_subcommand_from login' -l skip-verify -d 'Save without verifying'

# init options
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l name -d 'Use case name'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l description -d 'Use case description'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l icon -d 'Use case icon'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l no-project -d 'Skip project creation'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l project-id -d 'Project ID'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l api-url -d 'API base URL'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l api-key -d 'API key'
complete -c codika-helper -n '__fish_seen_subcommand_from init' -l json -d 'Output as JSON'

# whoami options
complete -c codika-helper -n '__fish_seen_subcommand_from whoami' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from whoami' -l fresh -d 'Skip cache'

# status options
complete -c codika-helper -n '__fish_seen_subcommand_from status' -l json -d 'Output as JSON'
complete -c codika-helper -n '__fish_seen_subcommand_from status' -l verify -d 'Run verification'

# use — dynamic profile names
complete -c codika-helper -n '__fish_seen_subcommand_from use' -a '(codika-helper use --list-names 2>/dev/null)' -d 'Profile'

# logout — dynamic profile names
complete -c codika-helper -n '__fish_seen_subcommand_from logout' -a '(codika-helper use --list-names 2>/dev/null)' -d 'Profile'

# completion subcommands and options
complete -c codika-helper -n '__fish_seen_subcommand_from completion' -a 'bash zsh fish' -d 'Shell type'
complete -c codika-helper -n '__fish_seen_subcommand_from completion' -l install -d 'Auto-detect shell and install'
complete -c codika-helper -n '__fish_seen_subcommand_from completion' -l uninstall -d 'Remove installed completion'`;
}

// ── Install / Uninstall ──────────────────────────────────

function installCompletion(): void {
  const shell = detectShell();
  if (!shell) {
    console.error('Could not detect shell from $SHELL environment variable.');
    console.error('Please run one of:');
    console.error('  codika-helper completion bash');
    console.error('  codika-helper completion zsh');
    console.error('  codika-helper completion fish');
    process.exit(1);
  }

  const rcFile = getRcFile(shell);

  if (shell === 'fish') {
    const dir = join(homedir(), '.config', 'fish', 'completions');
    mkdirSync(dir, { recursive: true });
    writeFileSync(rcFile, generateFishCompletion() + '\n');
    console.log(`Completion installed to ${rcFile}`);
    console.log('Restart your terminal or run: source ' + rcFile);
    return;
  }

  // bash or zsh
  if (existsSync(rcFile)) {
    const content = readFileSync(rcFile, 'utf-8');
    if (content.includes(BEGIN_MARKER)) {
      console.log(`Completion already installed in ${rcFile}`);
      return;
    }
  }

  const block = [
    '',
    BEGIN_MARKER,
    `eval "$(codika-helper completion ${shell})"`,
    END_MARKER,
    '',
  ].join('\n');

  appendFileSync(rcFile, block);
  console.log(`Completion installed in ${rcFile}`);
  console.log('Restart your terminal or run: source ' + rcFile);
}

function uninstallCompletion(): void {
  const shell = detectShell();
  if (!shell) {
    console.error('Could not detect shell from $SHELL environment variable.');
    process.exit(1);
  }

  const rcFile = getRcFile(shell);

  if (shell === 'fish') {
    if (existsSync(rcFile)) {
      unlinkSync(rcFile);
      console.log(`Completion removed from ${rcFile}`);
    } else {
      console.log('No fish completion file found.');
    }
    return;
  }

  // bash or zsh
  if (!existsSync(rcFile)) {
    console.log(`No ${shell} rc file found at ${rcFile}`);
    return;
  }

  const content = readFileSync(rcFile, 'utf-8');
  const beginIdx = content.indexOf(BEGIN_MARKER);
  const endIdx = content.indexOf(END_MARKER);

  if (beginIdx === -1 || endIdx === -1) {
    console.log(`No codika-helper completion block found in ${rcFile}`);
    return;
  }

  // Remove the block including any surrounding blank lines
  const before = content.slice(0, beginIdx).replace(/\n+$/, '\n');
  const after = content.slice(endIdx + END_MARKER.length).replace(/^\n+/, '\n');
  writeFileSync(rcFile, before + after);
  console.log(`Completion removed from ${rcFile}`);
}

// ── Command ──────────────────────────────────────────────

export const completionCommand = new Command('completion')
  .description('Generate shell completion scripts')
  .argument('[shell]', 'Shell type: bash, zsh, or fish')
  .option('--install', 'Auto-detect shell and install completion')
  .option('--uninstall', 'Remove installed completion')
  .action((shell?: string, options?: { install?: boolean; uninstall?: boolean }) => {
    if (options?.install) {
      installCompletion();
      return;
    }

    if (options?.uninstall) {
      uninstallCompletion();
      return;
    }

    if (!shell) {
      console.error('Please specify a shell: bash, zsh, or fish');
      console.error('');
      console.error('Usage:');
      console.error('  codika-helper completion bash       # print bash completion script');
      console.error('  codika-helper completion zsh        # print zsh completion script');
      console.error('  codika-helper completion fish       # print fish completion script');
      console.error('  codika-helper completion --install  # auto-detect and install');
      process.exit(1);
    }

    switch (shell) {
      case 'bash':
        console.log(generateBashCompletion());
        break;
      case 'zsh':
        console.log(generateZshCompletion());
        break;
      case 'fish':
        console.log(generateFishCompletion());
        break;
      default:
        console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
        process.exit(1);
    }
  });
