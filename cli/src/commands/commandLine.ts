import fsSync from "node:fs";
import path from "node:path";
import { aieStructure } from "../context/aieStructure";
import type { ExecutionOptions, InitExecutionOptions, ParsedOptions, ToolName } from "./types";

const TOOL_NAME: ToolName = "codex";

export const usageText = `AIE OS

Usage:
  aie-os init [options]
  aie-os build --tool codex [options]

Commands:
  init
    Initialize AIE OS for the target project. With no init config arguments, init prompts interactively. If any init config argument is provided, init becomes explicit and requires all mandatory init options.
  build
    Build the effective context and generate tool-specific artifacts. Build is non-interactive.

Init options:
  --project-path                    Target repository. Defaults to the current directory.
  --kb-path                         Shared knowledge-base path.
  --agent-path                      Shared agent path.
  --skills-path                     Shared skills path.
  --agent-persona                   Agent persona.
  --languages                       Comma-separated languages.
  --application-type                Comma-separated application types.
  --frameworks                      Comma-separated frameworks.

Build options:
  --project-path                    Target repository. Defaults to the current directory.
  --tool                            Delivery adapter target. Required. Only codex is supported in v1.

Other options:
  -h, --help                        Show help.

Examples:
  aie-os init
  aie-os init --project-path /repo
  aie-os init --kb-path content/knowledge-base --agent-path content/agent --agent-persona software-developer
  aie-os init --kb-path content/knowledge-base --agent-path content/agent --agent-persona software-developer --languages typescript --application-type cli
  aie-os build --tool codex

Notes:
  - init prompts only when no init configuration arguments are provided.
  - Passing any init configuration argument switches init to explicit mode.
  - In explicit mode, omitted optional values are treated as empty and required values must be provided.
  - build never prompts and fails explicitly when required values are missing.`;

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
    if (!value || value.startsWith("--")) {
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
          defaults: detectInitDefaults(projectPath),
          initialSelections: {},
          mode: "interactive",
          providedPaths: {},
          projectPath,
        }
      : {
          command: "build",
          projectPath,
          tool: TOOL_NAME,
        };
  }

  if (parsed.command === "build") {
    rejectUnsupportedOptions(parsed.options, ["--tool", "--project-path"]);

    const tool = parsed.options["--tool"];
    if (!tool) {
      throw new Error("Missing required option --tool");
    }

    if (tool !== TOOL_NAME) {
      throw new Error(`Unsupported tool: ${tool}`);
    }

    return {
      command: "build",
      projectPath,
      tool: TOOL_NAME,
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

  const detectedDefaults = detectInitDefaults(projectPath);
  const mode = hasExplicitInitConfig(parsed.options) ? "explicit" : "interactive";

  const initOptions: InitExecutionOptions = {
    command: "init",
    defaults: detectedDefaults,
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

function detectInitDefaults(projectPath: string) {
  const localAieOsPath = path.join(projectPath, aieStructure.localTool.directoryName);
  const bundledRoot = path.resolve(__dirname, "..", "..", "..");

  return {
    kbPath: detectSharedDefault(
      projectPath,
      path.join(
        localAieOsPath,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.knowledgeBaseDirectoryName,
      ),
      path.join(
        bundledRoot,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.knowledgeBaseDirectoryName,
      ),
    ),
    agentPath: detectSharedDefault(
      projectPath,
      path.join(
        localAieOsPath,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.agentDirectoryName,
      ),
      path.join(
        bundledRoot,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.agentDirectoryName,
      ),
    ),
    skillsPath: detectOptionalSharedDefault(
      projectPath,
      path.join(
        localAieOsPath,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.skillsDirectoryName,
      ),
      path.join(
        bundledRoot,
        aieStructure.sharedContent.rootDirectoryName,
        aieStructure.sharedContent.skillsDirectoryName,
      ),
    ),
  };
}

function detectSharedDefault(projectPath: string, preferredPath: string, fallbackPath: string): string {
  if (pathExists(preferredPath)) {
    return toProjectRelative(projectPath, preferredPath);
  }

  return toProjectRelative(projectPath, fallbackPath);
}

function detectOptionalSharedDefault(
  projectPath: string,
  preferredPath: string,
  fallbackPath: string,
): string {
  if (pathExists(preferredPath)) {
    return toProjectRelative(projectPath, preferredPath);
  }

  if (pathExists(fallbackPath)) {
    return toProjectRelative(projectPath, fallbackPath);
  }

  return "";
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

function pathExists(targetPath: string): boolean {
  return fsSync.existsSync(targetPath);
}
