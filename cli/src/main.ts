import fs from "node:fs/promises";
import path from "node:path";
import { buildAgentContext, buildCodexAdapter } from "./core/build";
import {
  ensureDirectory,
  fileExists,
  readText,
  writeText,
} from "./core/files";
import { loadManifest } from "./core/manifest";

type CommandName = "init" | "build";
type ToolName = "codex";

type ParsedOptions = {
  agentPath?: string;
  command: CommandName;
  help: boolean;
  kbPath?: string;
  projectPath?: string;
  skillsPath?: string;
  tool?: string;
};

export type ExecutionOptions = {
  agentPath: string;
  command: CommandName;
  kbPath: string;
  projectPath: string;
  skillsPath: string;
  templatePath: string;
  tool: ToolName;
};

const TOOL_NAME = "codex";
const INIT_TEMPLATE_FILES = [
  "manifest.yaml",
  "project-context.md",
  "architecture.md",
  "conventions.md",
  path.join("skills", "README.md"),
] as const;

export const usageText = `AIE OS

Usage:
  aie-os init --tool codex --project-path <path> [--kb-path <path>] [--agent-path <path>] [--skills-path <path>]
  aie-os build --tool codex --project-path <path> [--kb-path <path>] [--agent-path <path>] [--skills-path <path>]

Options:
  --tool          Delivery adapter target. Only codex is supported in v1.
  --project-path  Target repository to scaffold or build.
  --kb-path       Knowledge base root. Defaults to AIE_OS_KB_PATH or ../knowledge-base when available.
  --agent-path    Agent configuration root. Defaults to AIE_OS_AGENT_PATH or ../agent next to the KB.
  --skills-path   Global skills root. Defaults to AIE_OS_SKILLS_PATH or ../skills next to the KB.
  -h, --help      Show help.`;

export function parseCommandInput(argv: string[]): ParsedOptions {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help") {
    return {
      command: "build",
      help: true,
    };
  }

  if (command !== "init" && command !== "build") {
    throw new Error(`Unknown command: ${command}`);
  }

  const parsed: ParsedOptions = {
    command,
    help: false,
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

    switch (argument) {
      case "--tool":
        parsed.tool = value;
        break;
      case "--project-path":
        parsed.projectPath = value;
        break;
      case "--kb-path":
        parsed.kbPath = value;
        break;
      case "--agent-path":
        parsed.agentPath = value;
        break;
      case "--skills-path":
        parsed.skillsPath = value;
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }

    index += 1;
  }

  return parsed;
}

export function resolveExecutionOptions(
  parsed: ParsedOptions,
  cwd: string,
): ExecutionOptions {
  if (parsed.help) {
    return {
      agentPath: "",
      command: parsed.command,
      kbPath: "",
      projectPath: "",
      skillsPath: "",
      templatePath: "",
      tool: TOOL_NAME,
    };
  }

  if (!parsed.tool) {
    throw new Error("Missing required option --tool");
  }

  if (parsed.tool !== TOOL_NAME) {
    throw new Error(`Unsupported tool: ${parsed.tool}`);
  }

  if (!parsed.projectPath) {
    throw new Error("Missing required option --project-path");
  }

  const projectPath = path.resolve(cwd, parsed.projectPath);
  const kbPath = resolveKbPath(cwd, parsed.kbPath);
  const agentPath = resolveAgentPath(cwd, parsed.agentPath, kbPath);
  const skillsPath = resolveSkillsPath(cwd, parsed.skillsPath, kbPath);
  const templatePath = resolveTemplatePath();

  return {
    agentPath,
    command: parsed.command,
    kbPath,
    projectPath,
    skillsPath,
    templatePath,
    tool: TOOL_NAME,
  };
}

export async function initProject(options: ExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);
  await ensureKbDirectory(options.kbPath);
  await ensureAgentDirectory(options.agentPath);
  await ensureSkillsDirectory(options.skillsPath);
  await ensureTemplateDirectory(options.templatePath);

  const aiDirectory = path.join(options.projectPath, ".ai");
  await ensureDirectory(aiDirectory);

  for (const templateFile of INIT_TEMPLATE_FILES) {
    const sourcePath = path.join(options.templatePath, templateFile);
    const targetPath = path.join(aiDirectory, templateFile);
    await copyTemplateIfMissing(sourcePath, targetPath);
  }

  await buildProject(options);
}

export async function buildProject(options: ExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);
  await ensureKbDirectory(options.kbPath);
  await ensureAgentDirectory(options.agentPath);
  await ensureSkillsDirectory(options.skillsPath);

  const manifestPath = path.join(options.projectPath, ".ai", "manifest.yaml");
  if (!(await fileExists(manifestPath))) {
    throw new Error(
      `Missing manifest: ${manifestPath}. Run "aie-os init --tool ${options.tool} --project-path ${options.projectPath}" first.`,
    );
  }

  const manifest = await loadManifest(manifestPath);
  const buildOutput = await buildAgentContext({
    agentPath: options.agentPath,
    kbPath: options.kbPath,
    manifest,
    projectPath: options.projectPath,
    skillsPath: options.skillsPath,
    tool: options.tool,
  });

  await writeText(
    path.join(options.projectPath, ".ai", "agent-context.md"),
    buildOutput.agentContext,
  );
  await writeText(
    path.join(options.projectPath, "AGENTS.md"),
    buildCodexAdapter(buildOutput),
  );
}

function resolveKbPath(cwd: string, explicitKbPath?: string): string {
  if (explicitKbPath) {
    return path.resolve(cwd, explicitKbPath);
  }

  const environmentKbPath = process.env.AIE_OS_KB_PATH;
  if (environmentKbPath) {
    return path.resolve(cwd, environmentKbPath);
  }

  return path.resolve(__dirname, "..", "..", "knowledge-base");
}

function resolveAgentPath(
  cwd: string,
  explicitAgentPath: string | undefined,
  kbPath: string,
): string {
  if (explicitAgentPath) {
    return path.resolve(cwd, explicitAgentPath);
  }

  const environmentAgentPath = process.env.AIE_OS_AGENT_PATH;
  if (environmentAgentPath) {
    return path.resolve(cwd, environmentAgentPath);
  }

  return path.resolve(kbPath, "..", "agent");
}

function resolveTemplatePath(): string {
  return path.resolve(__dirname, "..", "templates", "project");
}

function resolveSkillsPath(
  cwd: string,
  explicitSkillsPath: string | undefined,
  kbPath: string,
): string {
  if (explicitSkillsPath) {
    return path.resolve(cwd, explicitSkillsPath);
  }

  const environmentSkillsPath = process.env.AIE_OS_SKILLS_PATH;
  if (environmentSkillsPath) {
    return path.resolve(cwd, environmentSkillsPath);
  }

  return path.resolve(kbPath, "..", "skills");
}

async function copyTemplateIfMissing(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  if (await fileExists(targetPath)) {
    return;
  }

  const templateContents = await readText(sourcePath);
  await writeText(targetPath, templateContents);
}

async function ensureProjectDirectory(projectPath: string): Promise<void> {
  await ensureDirectoryType(projectPath, "Project path");
}

async function ensureKbDirectory(kbPath: string): Promise<void> {
  await ensureDirectoryType(kbPath, "Knowledge base path");
}

async function ensureAgentDirectory(agentPath: string): Promise<void> {
  await ensureDirectoryType(agentPath, "Agent configuration path");
}

async function ensureSkillsDirectory(skillsPath: string): Promise<void> {
  await ensureDirectoryType(skillsPath, "Skills path");
}

async function ensureTemplateDirectory(templatePath: string): Promise<void> {
  await ensureDirectoryType(templatePath, "Template path");
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
