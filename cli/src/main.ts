import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getAdapter } from "./core/agentAdapters";
import { buildAgentContext } from "./core/build";
import {
  ensureDirectory,
  fileExists,
  listDirectoryNames,
  listMarkdownBasenames,
  writeText,
} from "./core/files";
import { loadManifest, saveManifest, type Manifest } from "./core/manifest";

type CommandName = "init" | "build";
type ToolName = "codex";

type ParsedOptions = {
  command: CommandName;
  help: boolean;
  options: Record<string, string>;
};

type BuildExecutionOptions = {
  command: "build";
  projectPath: string;
  tool: ToolName;
};

type InitExecutionOptions = {
  command: "init";
  defaults: InitPromptDefaults;
  projectPath: string;
};

export type ExecutionOptions = BuildExecutionOptions | InitExecutionOptions;

type InitPromptDefaults = {
  agentPath: string;
  globalSkillsPath: string;
  kbPath: string;
  projectCodingStandardsPath: string;
  projectContextPath: string;
  projectSkillsPath: string;
};

type InitSelections = {
  applicationType: string;
  frameworks: string[];
  language: string;
  persona: string;
  style: string;
};

const PROJECT_AIE_DIRECTORY = ".aie-os";
const BUILD_DIRECTORY = "build";
const MANIFEST_NAME = "aie-os.json";
const TOOL_NAME = "codex";

export const usageText = `AIE OS

Usage:
  init [--project-path <path>] [--kb-path <path>] [--agent-path <path>] [--global-skills-path <path>] [--project-context-path <path>] [--project-coding-standards-path <path>] [--project-skills-path <path>]
  build --tool codex

Options:
  --project-path                    Target repository. Defaults to the current directory.
  --kb-path                         Shared knowledge-base path. Prompted explicitly during init.
  --agent-path                      Shared agent path. Prompted explicitly during init.
  --global-skills-path              Shared global skills path. Prompted explicitly during init.
  --project-context-path            Local project-context path. Prompted explicitly during init.
  --project-coding-standards-path   Local project coding standards path. Prompted explicitly during init.
  --project-skills-path             Local project skills path. Prompted explicitly during init.
  --tool                            Delivery adapter target. Only codex is supported in v1.
  -h, --help                        Show help.`;

export function parseCommandInput(argv: string[]): ParsedOptions {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help") {
    return {
      command: "build",
      help: true,
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
  const projectPath = resolveProjectPath(cwd, parsed.options["--project-path"]);

  if (parsed.help) {
    return parsed.command === "init"
      ? {
          command: "init",
          defaults: detectInitDefaults(projectPath),
          projectPath,
        }
      : {
          command: "build",
          projectPath,
          tool: TOOL_NAME,
        };
  }

  if (parsed.command === "build") {
    rejectUnsupportedOptions(parsed.options, ["--tool"]);

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
    "--global-skills-path",
    "--project-context-path",
    "--project-coding-standards-path",
    "--project-skills-path",
  ]);

  const detectedDefaults = detectInitDefaults(projectPath);

  return {
    command: "init",
    defaults: {
      ...detectedDefaults,
      agentPath: coalesceOption(parsed.options["--agent-path"], detectedDefaults.agentPath),
      globalSkillsPath: coalesceOption(
        parsed.options["--global-skills-path"],
        detectedDefaults.globalSkillsPath,
      ),
      kbPath: coalesceOption(parsed.options["--kb-path"], detectedDefaults.kbPath),
      projectCodingStandardsPath: coalesceOption(
        parsed.options["--project-coding-standards-path"],
        detectedDefaults.projectCodingStandardsPath,
      ),
      projectContextPath: coalesceOption(
        parsed.options["--project-context-path"],
        detectedDefaults.projectContextPath,
      ),
      projectSkillsPath: coalesceOption(
        parsed.options["--project-skills-path"],
        detectedDefaults.projectSkillsPath,
      ),
    },
    projectPath,
  };
}

export async function initProject(options: InitExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);

  const reader = readline.createInterface({
    input,
    output,
  });

  try {
    const manifest = await collectManifest(options.projectPath, options.defaults, reader);
    await scaffoldProject(options.projectPath, manifest);
  } finally {
    reader.close();
  }
}

export async function buildProject(options: BuildExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);

  const manifestPath = path.join(options.projectPath, PROJECT_AIE_DIRECTORY, MANIFEST_NAME);
  if (!(await fileExists(manifestPath))) {
    throw new Error(
      `Missing manifest: ${manifestPath}. Run "init" from the target project first.`,
    );
  }

  const manifest = await loadManifest(manifestPath);
  const buildOutput = await buildAgentContext({
    manifest,
    projectPath: options.projectPath,
    tool: options.tool,
  });
  const adapter = getAdapter(options.tool);
  const adapterOutput = adapter.build({
    effectiveContext: buildOutput.effectiveContext,
    effectiveContextMarkdown: buildOutput.effectiveContextMarkdown,
    projectPath: options.projectPath,
  });

  await writeText(
    path.join(options.projectPath, PROJECT_AIE_DIRECTORY, BUILD_DIRECTORY, "effective-context.md"),
    buildOutput.effectiveContextMarkdown,
  );
  await writeText(
    path.join(options.projectPath, PROJECT_AIE_DIRECTORY, BUILD_DIRECTORY, "effective-context.json"),
    `${JSON.stringify(buildOutput.effectiveContext, null, 2)}\n`,
  );

  for (const file of adapterOutput.files) {
    await writeText(path.join(options.projectPath, file.path), file.contents);
  }
}

function detectInitDefaults(projectPath: string): InitPromptDefaults {
  const localAieOsPath = path.join(projectPath, "aie-os");
  const bundledRoot = path.resolve(__dirname, "..", "..");

  return {
    kbPath: detectSharedDefault(projectPath, path.join(localAieOsPath, "knowledge-base"), path.join(bundledRoot, "knowledge-base")),
    agentPath: detectSharedDefault(projectPath, path.join(localAieOsPath, "agent"), path.join(bundledRoot, "agent")),
    globalSkillsPath: detectOptionalSharedDefault(
      projectPath,
      path.join(localAieOsPath, "skills", "global"),
      path.join(bundledRoot, "skills", "global"),
    ),
    projectContextPath: `${PROJECT_AIE_DIRECTORY}/project-context`,
    projectCodingStandardsPath: `${PROJECT_AIE_DIRECTORY}/project-coding-standards`,
    projectSkillsPath: `${PROJECT_AIE_DIRECTORY}/project-skills`,
  };
}

function detectSharedDefault(projectPath: string, preferredPath: string, fallbackPath: string): string {
  if (pathExists(preferredPath)) {
    return toProjectRelative(projectPath, preferredPath);
  }

  return fallbackPath;
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
    return fallbackPath;
  }

  return "";
}

function resolveProjectPath(cwd: string, explicitPath?: string): string {
  if (!explicitPath) {
    return cwd;
  }

  return path.resolve(cwd, explicitPath);
}

async function collectManifest(
  projectPath: string,
  defaults: InitPromptDefaults,
  reader: readline.Interface,
): Promise<Manifest> {
  const knowledgeBasePath = await promptPath(reader, {
    defaultValue: defaults.kbPath,
    explanation:
      "Shared engineering knowledge. AIE OS reads engineering principles and coding standards from this folder.",
    label: "Knowledge base path",
    projectPath,
  });
  await ensureDirectoryType(resolveAgainstProject(projectPath, knowledgeBasePath), "Knowledge base path");

  const agentPath = await promptPath(reader, {
    defaultValue: defaults.agentPath,
    explanation:
      "Shared agent configuration. AIE OS reads persona and style definitions from this folder.",
    label: "Agent path",
    projectPath,
  });
  await ensureDirectoryType(resolveAgainstProject(projectPath, agentPath), "Agent path");

  const globalSkillsPath = await promptOptionalPath(reader, {
    defaultValue: defaults.globalSkillsPath,
    explanation:
      "Optional shared workflow guidance. Leave disabled if there are no global skills yet.",
    label: "Global skills path",
    projectPath,
  });
  if (globalSkillsPath.trim() !== "") {
    await ensureDirectoryType(resolveAgainstProject(projectPath, globalSkillsPath), "Global skills path");
  }

  const projectContextPath = await promptPath(reader, {
    defaultValue: defaults.projectContextPath,
    explanation:
      "Local project context files. This is where repository-specific context will live.",
    label: "Project context path",
    projectPath,
  });

  const projectCodingStandardsPath = await promptPath(reader, {
    defaultValue: defaults.projectCodingStandardsPath,
    explanation:
      "Local coding standards. Use this folder for project-specific standards that refine shared ones.",
    label: "Project coding standards path",
    projectPath,
  });

  const projectSkillsPath = await promptPath(reader, {
    defaultValue: defaults.projectSkillsPath,
    explanation:
      "Local project skills. Drop project-specific workflow guidance here later.",
    label: "Project skills path",
    projectPath,
  });

  const selections = await collectSelections(projectPath, {
    agentPath,
    knowledgeBasePath,
  }, reader);

  return {
    version: 2,
    paths: {
      agent: agentPath,
      globalSkills: globalSkillsPath,
      knowledgeBase: knowledgeBasePath,
      projectCodingStandards: projectCodingStandardsPath,
      projectContext: projectContextPath,
      projectSkills: projectSkillsPath,
    },
    selection: selections,
  };
}

async function collectSelections(
  projectPath: string,
  input: {
    agentPath: string;
    knowledgeBasePath: string;
  },
  reader: readline.Interface,
): Promise<InitSelections> {
  const resolvedAgentPath = resolveAgainstProject(projectPath, input.agentPath);
  const resolvedKnowledgeBasePath = resolveAgainstProject(projectPath, input.knowledgeBasePath);

  const personaOptions = await listMarkdownBasenames(path.join(resolvedAgentPath, "persona"));
  const styleOptions = await listMarkdownBasenames(path.join(resolvedAgentPath, "style"));
  const languageOptions = await listDirectoryNames(
    path.join(resolvedKnowledgeBasePath, "coding-standards", "language"),
  );
  const applicationTypeOptions = await listDirectoryNames(
    path.join(resolvedKnowledgeBasePath, "coding-standards", "application-type"),
  );
  const frameworkOptions = await listDirectoryNames(
    path.join(resolvedKnowledgeBasePath, "coding-standards", "framework"),
  );

  const persona = await promptSelect(reader, {
    defaultValue: personaOptions.includes("software-developer")
      ? "software-developer"
      : personaOptions[0] ?? null,
    explanation: "Persona defines the agent role and behavioral mode.",
    label: "Persona",
    options: personaOptions,
  });

  const style = await promptSelect(reader, {
    defaultValue: styleOptions.includes("concise-collaborative")
      ? "concise-collaborative"
      : styleOptions[0] ?? null,
    explanation: "Style defines how the agent communicates.",
    label: "Style",
    options: styleOptions,
  });

  const language = await promptSelect(reader, {
    defaultValue: languageOptions.length === 1 ? languageOptions[0] : null,
    explanation: "Language selects the language-specific coding standards.",
    label: "Language",
    options: languageOptions,
  });

  const applicationType = await promptSelect(reader, {
    defaultValue: applicationTypeOptions.length === 1 ? applicationTypeOptions[0] : null,
    explanation: "Application type selects the standards for the shape of the application, such as api or mobile.",
    label: "Application type",
    options: applicationTypeOptions,
  });

  const frameworks = await promptMultiSelect(reader, {
    defaultValue: [],
    explanation: "Framework overlays add framework-specific coding standards. Choose none when not needed.",
    label: "Frameworks",
    options: frameworkOptions,
  });

  return {
    applicationType,
    frameworks,
    language,
    persona,
    style,
  };
}

async function scaffoldProject(projectPath: string, manifest: Manifest): Promise<void> {
  const aieDirectory = path.join(projectPath, PROJECT_AIE_DIRECTORY);
  await ensureDirectory(aieDirectory);

  const projectContextPath = resolveAgainstProject(projectPath, manifest.paths.projectContext);
  const projectCodingStandardsPath = resolveAgainstProject(
    projectPath,
    manifest.paths.projectCodingStandards,
  );
  const projectSkillsPath = resolveAgainstProject(projectPath, manifest.paths.projectSkills);

  await ensureDirectory(projectContextPath);
  await ensureDirectory(projectCodingStandardsPath);
  await ensureDirectory(projectSkillsPath);

  await writeTemplateIfMissing(
    path.join(projectContextPath, "overview.md"),
    PROJECT_CONTEXT_OVERVIEW,
  );
  await writeTemplateIfMissing(
    path.join(projectContextPath, "architecture.md"),
    PROJECT_CONTEXT_ARCHITECTURE,
  );
  await writeTemplateIfMissing(
    path.join(projectContextPath, "conventions.md"),
    PROJECT_CONTEXT_CONVENTIONS,
  );
  await writeTemplateIfMissing(
    path.join(projectCodingStandardsPath, "README.md"),
    PROJECT_CODING_STANDARDS_README,
  );
  await writeTemplateIfMissing(
    path.join(projectSkillsPath, "README.md"),
    PROJECT_SKILLS_README,
  );

  await saveManifest(manifest, path.join(aieDirectory, MANIFEST_NAME));
}

async function writeTemplateIfMissing(
  targetPath: string,
  contents: string,
): Promise<void> {
  if (await fileExists(targetPath)) {
    return;
  }

  await writeText(targetPath, contents);
}

async function promptPath(
  reader: readline.Interface,
  input: {
    defaultValue: string;
    explanation: string;
    label: string;
    projectPath: string;
  },
): Promise<string> {
  const value = await promptText(reader, {
    defaultValue: input.defaultValue,
    explanation: input.explanation,
    label: input.label,
  });

  return normalizeConfiguredPath(input.projectPath, value);
}

async function promptOptionalPath(
  reader: readline.Interface,
  input: {
    defaultValue: string;
    explanation: string;
    label: string;
    projectPath: string;
  },
): Promise<string> {
  output.write(`\n${input.label}\n${input.explanation}\n`);
  output.write(`Default: ${input.defaultValue || "disabled"}\n`);
  const answer = (await reader.question("Enter a path, press Enter to accept the default, or type none to disable: ")).trim();

  if (answer === "") {
    return normalizeConfiguredPath(input.projectPath, input.defaultValue);
  }

  if (answer.toLowerCase() === "none") {
    return "";
  }

  return normalizeConfiguredPath(input.projectPath, answer);
}

async function promptSelect(
  reader: readline.Interface,
  input: {
    defaultValue: string | null;
    explanation: string;
    label: string;
    options: string[];
  },
): Promise<string> {
  if (input.options.length === 0) {
    throw new Error(`No options available for ${input.label}`);
  }

  output.write(`\n${input.label}\n${input.explanation}\n`);
  input.options.forEach((option, index) => {
    const defaultMarker = option === input.defaultValue ? " (default)" : "";
    output.write(`${index + 1}) ${option}${defaultMarker}\n`);
  });

  while (true) {
    const prompt = input.defaultValue
      ? "Select an option by number or name, or press Enter for the default: "
      : "Select an option by number or name: ";
    const answer = (await reader.question(prompt)).trim();

    if (answer === "" && input.defaultValue) {
      return input.defaultValue;
    }

    const selected = resolveSingleOption(answer, input.options);
    if (selected) {
      return selected;
    }

    output.write("Invalid selection.\n");
  }
}

async function promptMultiSelect(
  reader: readline.Interface,
  input: {
    defaultValue: string[];
    explanation: string;
    label: string;
    options: string[];
  },
): Promise<string[]> {
  if (input.options.length === 0) {
    return [];
  }

  output.write(`\n${input.label}\n${input.explanation}\n`);
  input.options.forEach((option, index) => {
    output.write(`${index + 1}) ${option}\n`);
  });
  output.write("Default: none\n");

  while (true) {
    const answer = (await reader.question(
      "Select comma-separated numbers or names, press Enter for none, or type none: ",
    )).trim();

    if (answer === "" || answer.toLowerCase() === "none") {
      return input.defaultValue;
    }

    const selections = answer
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value !== "")
      .map((value) => resolveSingleOption(value, input.options));

    if (selections.every((value) => value)) {
      return Array.from(new Set(selections as string[]));
    }

    output.write("Invalid selection.\n");
  }
}

async function promptText(
  reader: readline.Interface,
  input: {
    defaultValue: string;
    explanation: string;
    label: string;
  },
): Promise<string> {
  output.write(`\n${input.label}\n${input.explanation}\n`);
  output.write(`Default: ${input.defaultValue}\n`);
  const answer = (await reader.question("Press Enter to accept the default or enter a value: ")).trim();

  return answer === "" ? input.defaultValue : answer;
}

function resolveSingleOption(value: string, options: string[]): string | null {
  const index = Number(value);
  if (!Number.isNaN(index) && Number.isInteger(index) && index >= 1 && index <= options.length) {
    return options[index - 1];
  }

  return options.includes(value) ? value : null;
}

function coalesceOption(value: string | undefined, fallback: string): string {
  return value ? value : fallback;
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

function normalizeConfiguredPath(projectPath: string, configuredPath: string): string {
  if (configuredPath.trim() === "") {
    return "";
  }

  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return toProjectRelative(projectPath, path.resolve(projectPath, configuredPath));
}

function resolveAgainstProject(projectPath: string, configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(projectPath, configuredPath);
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

async function ensureProjectDirectory(projectPath: string): Promise<void> {
  await ensureDirectoryType(projectPath, "Project path");
}

async function ensureDirectoryType(
  directoryPath: string,
  label: string,
): Promise<void> {
  let stats;

  try {
    stats = await fs.stat(directoryPath);
  } catch {
    throw new Error(`${label} does not exist: ${directoryPath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`${label} is not a directory: ${directoryPath}`);
  }
}

const PROJECT_CONTEXT_OVERVIEW = `# Overview

## Purpose

Describe the product and domain context the agent needs for this repository.

## Facts

- Product or domain:
- Primary users:
- Critical workflows:

## Constraints

- Business constraints:
- Compliance or security constraints:
- Operational constraints:
`;

const PROJECT_CONTEXT_ARCHITECTURE = `# Architecture

## Purpose

Describe the current architecture and module boundaries that the agent should
respect.

## Overview

- Primary stack:
- Runtime environments:
- Deployment model:

## Boundaries

- Main modules:
- Ownership boundaries:
- External integrations:
`;

const PROJECT_CONTEXT_CONVENTIONS = `# Conventions

## Purpose

Capture repository-specific conventions that refine shared standards.

## Rules

- Add repository-specific rules here.
`;

const PROJECT_CODING_STANDARDS_README = `# Project Coding Standards

Add project-specific coding standards here to refine shared standards.
`;

const PROJECT_SKILLS_README = `# Project Skills

Add project-specific skills here.
`;
