import path from "node:path";
import { commandName } from "./commandName";
import type {
  ExecutionOptions,
  InitExecutionOptions,
  ParsedOptions,
  TargetAgentName,
} from "./types";

const DEFAULT_TARGET_AGENT: TargetAgentName = "default";
const SUPPORTED_TARGET_AGENTS: TargetAgentName[] = ["default", "copilot", "chatgpt", "claude"];
const INIT_DEFAULTS = {
  agentPath: "aie-os/content/agent",
  kbPath: "aie-os/content/knowledge-base",
  skillsPath: "aie-os/content/skills",
} as const;

export const usageText = `AIE OS

Usage:
  ${commandName} init [options]
  ${commandName} build [options]

Commands:
  init
    Initialize AIE OS for the target project. With no init config arguments, init prompts interactively. If any init config argument is provided, init becomes explicit and requires all mandatory init options.
  build
    Build the effective context and generate tool-specific artifacts. Build is non-interactive.

Notes:
  - init prompts only when no init configuration arguments are provided.
  - Passing any init configuration argument switches init to explicit mode.
  - In explicit mode, omitted optional values are treated as empty and required values must be provided.
  - build never prompts and fails explicitly when required values are missing.

Init options:
  --project-path                    Target repository. Defaults to the current directory.
  --kb-path                         Knowledge-base path.
  --agent-path                      Agent path.
  --skills-path                     (optional) Skills path.
  --agent-persona                   Persona. Accepted values are markdown file names from [agent-path]/persona without .md.
  --languages                       (optional) Comma-separated language folder names from [kb-path]/coding-rules/language.
  --application-type                (optional) Comma-separated application-type folder names from [kb-path]/coding-rules/application-type.
  --frameworks                      (optional) Comma-separated framework folder names from [kb-path]/coding-rules/framework.

Build options:
  --project-path                    Target repository. Defaults to the current directory.
  --target-agent                    Delivery target agent. Defaults to default. Supported values: default, copilot, chatgpt, claude.

Other options:
  -h, --help                        Show help.

Examples:
  ${commandName} init
  ${commandName} init --project-path /repo
  ${commandName} init --kb-path content/knowledge-base --agent-path content/agent --agent-persona software-developer
  ${commandName} init --kb-path content/knowledge-base --agent-path content/agent --agent-persona software-developer --languages typescript --application-type cli
  ${commandName} build
  ${commandName} build --target-agent claude`;

export function parseCommandInput(argv: string[]): ParsedOptions {
  const [command, ...rest] = argv;

  if (!command) {
    return {
      command: null,
      help: false,
      options: {},
    };
  }

  if (command === "-h" || command === "--help") {
    return {
      command: null,
      help: true,
      options: {},
    };
  }

  if (command.startsWith("--")) {
    return {
      command: null,
      help: false,
      options: {},
    };
  }

  if (command !== "init" && command !== "build") {
    throw new Error(`Unknown command: ${command}`);
  }

  const parsed: ParsedOptions = {
    command,
    help: false,
    options: {},
  };

  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];

    if (argument === "-h" || argument === "--help") {
      parsed.help = true;
      continue;
    }

    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }

    const value = rest[index + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for option ${argument}`);
    }

    parsed.options[argument] = value;
    index += 1;
  }

  return parsed;
}

export function resolveExecutionOptions(
  parsed: ParsedOptions,
  cwd: string,
): ExecutionOptions {
  if (!parsed.command) {
    throw new Error("You must specify a command.");
  }

  const projectPath = resolveProjectPath(cwd, parsed.options["--project-path"]);

  if (parsed.help) {
    return parsed.command === "init"
      ? {
          command: "init",
          defaults: { ...INIT_DEFAULTS },
          initialSelections: {},
          mode: "interactive",
          providedPaths: {},
          projectPath,
        }
      : {
          command: "build",
          projectPath,
          targetAgent: DEFAULT_TARGET_AGENT,
        };
  }

  if (parsed.command === "build") {
    rejectUnsupportedOptions(parsed.options, ["--target-agent", "--project-path"]);

    const targetAgent = parsed.options["--target-agent"] ?? DEFAULT_TARGET_AGENT;

    if (!SUPPORTED_TARGET_AGENTS.includes(targetAgent as TargetAgentName)) {
      throw new Error(`Unsupported target agent: ${targetAgent}`);
    }

    return {
      command: "build",
      projectPath,
      targetAgent: targetAgent as TargetAgentName,
    };
  }

  rejectUnsupportedOptions(parsed.options, [
    "--project-path",
    "--kb-path",
    "--agent-path",
    "--skills-path",
    "--agent-persona",
    "--languages",
    "--application-type",
    "--frameworks",
  ]);

  const defaults = { ...INIT_DEFAULTS };
  const mode = hasExplicitInitConfig(parsed.options) ? "explicit" : "interactive";

  const initOptions: InitExecutionOptions = {
    command: "init",
    defaults,
    initialSelections: {
      applicationTypes: parseCsvSelections(parsed.options["--application-type"]),
      frameworks: parseCsvSelections(parsed.options["--frameworks"]),
      languages: parseCsvSelections(parsed.options["--languages"]),
      persona: normalizeOptionalSelection(parsed.options["--agent-persona"]),
    },
    mode,
    providedPaths: {
      agentPath: normalizeCliPathOption(cwd, projectPath, parsed.options["--agent-path"]),
      kbPath: normalizeCliPathOption(cwd, projectPath, parsed.options["--kb-path"]),
      skillsPath: normalizeCliPathOption(cwd, projectPath, parsed.options["--skills-path"]),
    },
    projectPath,
  };

  return initOptions;
}

function hasExplicitInitConfig(options: Record<string, string>): boolean {
  return [
    "--kb-path",
    "--agent-path",
    "--skills-path",
    "--agent-persona",
    "--languages",
    "--application-type",
    "--frameworks",
  ].some((optionName) => Object.prototype.hasOwnProperty.call(options, optionName));
}

function resolveProjectPath(cwd: string, explicitPath?: string): string {
  if (!explicitPath) {
    return cwd;
  }

  return path.resolve(cwd, explicitPath);
}

function rejectUnsupportedOptions(
  options: Record<string, string>,
  allowedOptions: string[],
): void {
  const unsupported = Object.keys(options).filter((option) => !allowedOptions.includes(option));

  if (unsupported.length > 0) {
    throw new Error(`Unsupported option(s): ${unsupported.join(", ")}`);
  }
}

function parseCsvSelections(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const selections = value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry !== "");

  return selections.length === 0 ? undefined : selections;
}

function normalizeOptionalSelection(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized === "" ? undefined : normalized;
}

function normalizeCliPathOption(
  cwd: string,
  projectPath: string,
  configuredPath: string | undefined,
): string | undefined {
  if (configuredPath === undefined) {
    return undefined;
  }

  if (configuredPath.trim() === "") {
    return "";
  }

  const absolutePath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(cwd, configuredPath);

  return toProjectRelative(projectPath, absolutePath);
}

function toProjectRelative(projectPath: string, absolutePath: string): string {
  const relativePath = path.relative(projectPath, absolutePath);

  if (relativePath === "") {
    return ".";
  }

  if (!relativePath.startsWith("..")) {
    return relativePath;
  }

  return absolutePath;
}
