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
  skillsPath: string;
  kbPath: string;
};

type InitSelections = {
  applicationType: string;
  frameworks: string[];
  languages: string[];
  persona: string;
  style: string;
};

const PROJECT_AIE_DIRECTORY = ".aie-os";
const BUILD_DIRECTORY = "build";
const MANIFEST_NAME = "aie-os.json";
const PROJECT_CODING_STANDARDS_DIRECTORY = "project-coding-standards";
const PROJECT_SKILLS_DIRECTORY = "project-skills";
const TOOL_NAME = "codex";

export const usageText = `AIE OS

Usage:
  init [--project-path <path>] [--kb-path <path>] [--agent-path <path>] [--skills-path <path>]
  build --tool codex [--project-path <path>]

Options:
  --project-path                    Target repository. Defaults to the current directory.
  --kb-path                         Shared knowledge-base path. Prompted explicitly during init if not provided.
  --agent-path                      Shared agent path. Prompted explicitly during init if not provided.
  --skills-path                     Shared skills path. Prompted explicitly during init if not provided.
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
  ]);

  const detectedDefaults = detectInitDefaults(projectPath);

  return {
    command: "init",
    defaults: {
      ...detectedDefaults,
      agentPath: coalesceOption(parsed.options["--agent-path"], detectedDefaults.agentPath),
      skillsPath: coalesceOption(
        parsed.options["--skills-path"],
        detectedDefaults.skillsPath,
      ),
      kbPath: coalesceOption(parsed.options["--kb-path"], detectedDefaults.kbPath),
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

  output.write(
    `\nBuild complete. Generated .aie-os/build/effective-context.json, .aie-os/build/effective-context.md, and ${adapterOutput.primaryArtifact}.\n`,
  );
}

function detectInitDefaults(projectPath: string): InitPromptDefaults {
  const localAieOsPath = path.join(projectPath, "aie-os");
  const bundledRoot = path.resolve(__dirname, "..", "..");

  return {
    kbPath: detectSharedDefault(projectPath, path.join(localAieOsPath, "content", "knowledge-base"), path.join(bundledRoot, "content", "knowledge-base")),
    agentPath: detectSharedDefault(projectPath, path.join(localAieOsPath, "content", "agent"), path.join(bundledRoot, "content", "agent")),
    skillsPath: detectOptionalSharedDefault(
      projectPath,
      path.join(localAieOsPath, "content", "skills"),
      path.join(bundledRoot, "content", "skills"),
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

async function collectManifest(
  projectPath: string,
  defaults: InitPromptDefaults,
  reader: readline.Interface,
): Promise<Manifest> {
  const knowledgeBasePath = await promptPath(reader, {
    defaultValue: defaults.kbPath,
    description:
      "AIE OS reads shared engineering principles and coding standards from this folder.",
    promptLabel: "knowledge base path",
    optionName: "--kb-path",
    projectPath,
  });
  await ensureDirectoryType(resolveAgainstProject(projectPath, knowledgeBasePath), "Knowledge base path");

  const agentPath = await promptPath(reader, {
    defaultValue: defaults.agentPath,
    description:
      "AIE OS reads persona and style definitions from this folder.",
    promptLabel: "agent path",
    optionName: "--agent-path",
    projectPath,
  });
  await ensureDirectoryType(resolveAgainstProject(projectPath, agentPath), "Agent path");

  const skillsPath = await promptOptionalPath(reader, {
    defaultValue: defaults.skillsPath,
    description:
      "AIE OS reads shared skills from this folder. Type none to disable shared skills.",
    promptLabel: "skills path",
    optionName: "--skills-path",
    projectPath,
  });
  if (skillsPath.trim() !== "") {
    await ensureDirectoryType(resolveAgainstProject(projectPath, skillsPath), "Skills path");
  }

  const selections = await collectSelections(projectPath, {
    agentPath,
    knowledgeBasePath,
  }, reader);

  return {
    version: "0.1",
    paths: {
      agent: agentPath,
      skills: skillsPath,
      knowledgeBase: knowledgeBasePath,
      projectCodingStandards: path.join(PROJECT_AIE_DIRECTORY, PROJECT_CODING_STANDARDS_DIRECTORY),
      projectSkills: path.join(PROJECT_AIE_DIRECTORY, PROJECT_SKILLS_DIRECTORY),
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

  const languages = await promptMultiSelect(reader, {
    allowNone: false,
    defaultValue: languageOptions.length === 1 ? [languageOptions[0]] : [],
    explanation:
      "Select one or more languages. Use comma-separated numbers or names. This supports monorepos.",
    label: "Languages",
    options: languageOptions,
  });

  const applicationType = await promptSelect(reader, {
    allowNone: true,
    defaultValue: null,
    explanation: "Application type selects standards for the shape of the application, such as api or mobile.",
    label: "Application type",
    options: applicationTypeOptions,
  });

  const frameworks = await promptMultiSelect(reader, {
    allowNone: true,
    defaultValue: [],
    explanation: "Framework overlays add framework-specific coding standards. Choose none when not needed.",
    label: "Frameworks",
    options: frameworkOptions,
  });

  return {
    applicationType,
    frameworks,
    languages,
    persona,
    style,
  };
}

async function scaffoldProject(projectPath: string, manifest: Manifest): Promise<void> {
  const aieDirectory = path.join(projectPath, PROJECT_AIE_DIRECTORY);
  await ensureDirectory(aieDirectory);

  const projectCodingStandardsPath = resolveAgainstProject(
    projectPath,
    manifest.paths.projectCodingStandards,
  );
  const projectSkillsPath = resolveAgainstProject(projectPath, manifest.paths.projectSkills);

  await ensureDirectory(projectCodingStandardsPath);
  await ensureDirectory(projectSkillsPath);
  await writeTemplateIfMissing(
    path.join(projectCodingStandardsPath, "README.md"),
    PROJECT_CODING_STANDARDS_README,
  );
  await writeTemplateIfMissing(
    path.join(projectSkillsPath, "README.md"),
    PROJECT_SKILLS_README,
  );

  await saveManifest(manifest, path.join(aieDirectory, MANIFEST_NAME));
  output.write(`
              .-"""-.
             / .===. \\
             \\/ 6 6 \\/
             ( \\___/ )
        ___ooo__V__ooo___
       /                 \\
      |   [  AIE-OS  ]   |
       \\_________________/

     AIE-OS PROJECT HAS BEEN INITIALIZED

           *      .      *      .
        .     *     .      *      *
          *      \\  |  /      .
        .      --- * ---       *
          *      /  |  \\     .
        .    *      .      *     .

AIE OS project created at ${path.join(projectPath, PROJECT_AIE_DIRECTORY)}.
`);
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
    description: string;
    promptLabel: string;
    optionName: string;
    projectPath: string;
  },
): Promise<string> {
  const value = await promptText(reader, {
    defaultValue: input.defaultValue,
    description: input.description,
    promptLabel: input.promptLabel,
    optionName: input.optionName,
  });

  return normalizeConfiguredPath(input.projectPath, value);
}

async function promptOptionalPath(
  reader: readline.Interface,
  input: {
    defaultValue: string;
    description: string;
    promptLabel: string;
    optionName: string;
    projectPath: string;
  },
): Promise<string> {
  output.write(`\nProvide ${input.promptLabel}, or press Enter to accept default.\n`);
  output.write(`${input.description}\n`);
  output.write(`option: ${input.optionName}\n`);
  output.write(`default: ${input.defaultValue || "disabled"}\n`);
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
    allowNone?: boolean;
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
  if (input.allowNone && input.defaultValue === null) {
    output.write("Default: none\n");
  }

  while (true) {
    const prompt = input.defaultValue || input.allowNone
      ? "Select an option by number or name, or press Enter for the default: "
      : "Select an option by number or name: ";
    const answer = (await reader.question(prompt)).trim();

    if (answer === "") {
      if (input.defaultValue) {
        return input.defaultValue;
      }

      if (input.allowNone) {
        return "none";
      }
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
    allowNone: boolean;
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
  output.write(`Default: ${input.defaultValue.length === 0 ? "none" : input.defaultValue.join(", ")}\n`);

  while (true) {
    const answer = (await reader.question(
      "Select comma-separated numbers or names, press Enter for none, or type none: ",
    )).trim();

    if (answer === "" || answer.toLowerCase() === "none") {
      if (input.defaultValue.length > 0) {
        return input.defaultValue;
      }

      if (input.allowNone) {
        return [];
      }

      output.write("Select at least one option.\n");
      continue;
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
    description: string;
    promptLabel: string;
    optionName: string;
  },
): Promise<string> {
  output.write(`\nProvide ${input.promptLabel}, or press Enter to accept default.\n`);
  output.write(`${input.description}\n`);
  output.write(`option: ${input.optionName}\n`);
  output.write(`default: ${input.defaultValue}\n`);
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

const PROJECT_CODING_STANDARDS_README = `# Project Coding Standards

Add project-specific coding standard files here, for example:
- api.md
- persistence.md
`;

const PROJECT_SKILLS_README = `# Project Skills

Add project-specific skill files here, for example:
- create-endpoint.md
- release-process.md
`;
