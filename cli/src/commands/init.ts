import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  ensureDirectory,
  fileExists,
  listDirectoryNames,
  listMarkdownBasenames,
  writeText,
} from "../context/filesystem";
import { saveManifest, type Manifest } from "../context/manifest";
import type { InitExecutionOptions, InitPromptDefaults, InitSelections } from "./types";

const PROJECT_AIE_DIRECTORY = ".aie-os";
const MANIFEST_NAME = "aie-os.json";
const PROJECT_CODING_STANDARDS_DIRECTORY = "project-coding-standards";
const PROJECT_SKILLS_DIRECTORY = "project-skills";

const PROJECT_CODING_STANDARDS_README = `# Project Coding Standards

Add project-specific coding standard files here, for example:
- api.md
- persistence.md
`;

const PROJECT_SKILLS_README = `# Project Skills

Project skills are discovered by folder.
Skills should follow the Agent Skills packaging specification:
https://agentskills.io/specification

Add project-specific skills here, for example:
- create-endpoint/
- release-process/
`;

export async function initProject(options: InitExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);

  const reader = readline.createInterface({
    input,
    output,
  });

  try {
    const manifest = await collectManifest(
      options.projectPath,
      options.defaults,
      options.initialSelections,
      options.providedPaths,
      reader,
    );
    await scaffoldProject(options.projectPath, manifest);
  } finally {
    reader.close();
  }
}

async function collectManifest(
  projectPath: string,
  defaults: InitPromptDefaults,
  initialSelections: Partial<InitSelections>,
  providedPaths: Partial<InitPromptDefaults>,
  reader: readline.Interface,
): Promise<Manifest> {
  const knowledgeBasePath = providedPaths.kbPath
    ? providedPaths.kbPath
    : await promptPath(reader, {
        defaultValue: defaults.kbPath,
        description: "AIE OS reads shared engineering principles and coding standards from this folder.",
        promptLabel: "knowledge base path",
        optionName: "--kb-path",
        projectPath,
      });
  await ensureDirectoryType(resolveAgainstProject(projectPath, knowledgeBasePath), "Knowledge base path");

  const agentPath = providedPaths.agentPath
    ? providedPaths.agentPath
    : await promptPath(reader, {
        defaultValue: defaults.agentPath,
        description: "AIE OS reads persona definitions from this folder.",
        promptLabel: "agent path",
        optionName: "--agent-path",
        projectPath,
      });
  await ensureDirectoryType(resolveAgainstProject(projectPath, agentPath), "Agent path");

  const skillsPath = providedPaths.skillsPath !== undefined
    ? normalizeOptionalProvidedPath(projectPath, providedPaths.skillsPath)
    : await promptOptionalPath(reader, {
        defaultValue: defaults.skillsPath,
        description: "AIE OS reads shared skills from this folder. Type none to disable shared skills.",
        promptLabel: "skills path",
        optionName: "--skills-path",
        projectPath,
      });
  if (skillsPath.trim() !== "") {
    await ensureDirectoryType(resolveAgainstProject(projectPath, skillsPath), "Skills path");
  }

  const selections = await collectSelections(
    projectPath,
    {
      agentPath,
      initialSelections,
      knowledgeBasePath,
    },
    reader,
  );

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
    initialSelections: Partial<InitSelections>;
    knowledgeBasePath: string;
  },
  reader: readline.Interface,
): Promise<InitSelections> {
  const resolvedAgentPath = resolveAgainstProject(projectPath, input.agentPath);
  const resolvedKnowledgeBasePath = resolveAgainstProject(projectPath, input.knowledgeBasePath);

  const personaOptions = await listMarkdownBasenames(path.join(resolvedAgentPath, "persona"));
  const languageOptions = await listDirectoryNames(path.join(resolvedKnowledgeBasePath, "coding-standards", "language"));
  const applicationTypeOptions = await listDirectoryNames(path.join(resolvedKnowledgeBasePath, "coding-standards", "application-type"));
  const frameworkOptions = await listDirectoryNames(path.join(resolvedKnowledgeBasePath, "coding-standards", "framework"));
  const initial = input.initialSelections;

  const persona =
    validateSingleSelection(initial.persona, personaOptions, "agent persona") ??
    (await promptSelect(reader, {
      defaultValue: personaOptions.includes("software-developer") ? "software-developer" : (personaOptions[0] ?? null),
      explanation: "Persona defines the agent role and behavioral mode.",
      label: "Persona",
      options: personaOptions,
    }));

  const languages =
    validateMultiSelection(initial.languages, languageOptions, "languages", false) ??
    (await promptMultiSelect(reader, {
      allowNone: false,
      defaultValue: languageOptions.length === 1 ? [languageOptions[0]] : [],
      explanation: "Select one or more languages. Use comma-separated numbers or names. This supports monorepos.",
      label: "Languages",
      options: languageOptions,
    }));

  const applicationTypes =
    validateMultiSelection(initial.applicationTypes, applicationTypeOptions, "application types", true) ??
    (await promptMultiSelect(reader, {
      allowNone: true,
      defaultValue: [],
      explanation: "Application type selects standards for the shape of the application, such as api or cli. Choose one or more, or none when not needed.",
      label: "Application types",
      options: applicationTypeOptions,
    }));

  const frameworks =
    validateMultiSelection(initial.frameworks, frameworkOptions, "frameworks", true) ??
    (await promptMultiSelect(reader, {
      allowNone: true,
      defaultValue: [],
      explanation: "Framework overlays add framework-specific coding standards. Choose none when not needed.",
      label: "Frameworks",
      options: frameworkOptions,
    }));

  return {
    applicationTypes,
    frameworks,
    languages,
    persona,
  };
}

async function scaffoldProject(projectPath: string, manifest: Manifest): Promise<void> {
  const aieDirectory = path.join(projectPath, PROJECT_AIE_DIRECTORY);
  await ensureDirectory(aieDirectory);

  const projectCodingStandardsPath = resolveAgainstProject(projectPath, manifest.paths.projectCodingStandards);
  const projectSkillsPath = resolveAgainstProject(projectPath, manifest.paths.projectSkills);

  await ensureDirectory(projectCodingStandardsPath);
  await ensureDirectory(projectSkillsPath);
  await writeTemplateIfMissing(path.join(projectCodingStandardsPath, "README.md"), PROJECT_CODING_STANDARDS_README);
  await writeTemplateIfMissing(path.join(projectSkillsPath, "README.md"), PROJECT_SKILLS_README);

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

async function writeTemplateIfMissing(targetPath: string, contents: string): Promise<void> {
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

function validateSingleSelection(
  selectedValue: string | undefined,
  options: string[],
  label: string,
  allowNone = false,
): string | undefined {
  if (!selectedValue) {
    return undefined;
  }

  if (allowNone && selectedValue === "none") {
    return "none";
  }

  if (!options.includes(selectedValue)) {
    throw new Error(`Unsupported ${label}: ${selectedValue}`);
  }

  return selectedValue;
}

function validateMultiSelection(
  selectedValues: string[] | undefined,
  options: string[],
  label: string,
  allowNone: boolean,
): string[] | undefined {
  if (!selectedValues) {
    return undefined;
  }

  if (selectedValues.length === 1 && selectedValues[0] === "none") {
    if (allowNone) {
      return [];
    }

    throw new Error(`Unsupported ${label}: none`);
  }

  const invalidSelections = selectedValues.filter((value) => !options.includes(value));
  if (invalidSelections.length > 0) {
    throw new Error(`Unsupported ${label}: ${invalidSelections.join(", ")}`);
  }

  return Array.from(new Set(selectedValues));
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

function normalizeOptionalProvidedPath(projectPath: string, configuredPath: string): string {
  if (configuredPath.trim().toLowerCase() === "none") {
    return "";
  }

  return normalizeConfiguredPath(projectPath, configuredPath);
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

async function ensureProjectDirectory(projectPath: string): Promise<void> {
  await ensureDirectoryType(projectPath, "Project path");
}

async function ensureDirectoryType(directoryPath: string, label: string): Promise<void> {
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

function pathExists(targetPath: string): boolean {
  return fsSync.existsSync(targetPath);
}
