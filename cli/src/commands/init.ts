import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { stdout as output } from "node:process";
import {
  ensureDirectory,
  fileExists,
  listDirectoryNames,
  listMarkdownBasenames,
  writeText,
} from "../context/filesystem";
import { aieRelativePaths, aieStructure } from "../context/aieStructure";
import { saveManifest, type Manifest } from "../context/manifest";
import {
  projectCodingStandardsReadmeTemplate,
  projectSkillsReadmeTemplate,
} from "./scaffoldTemplates";
import {
  canPromptInteractively,
  promptMultiSelect,
  promptSingleSelect,
  promptTextInput,
} from "./terminalPrompts";
import type { InitExecutionOptions, InitPromptDefaults, InitSelections } from "./types";

export async function initProject(options: InitExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);
  const manifest = await collectManifest(
    options.projectPath,
    options.defaults,
    options.initialSelections,
    options.providedPaths,
    canPromptInteractively(),
  );
  await scaffoldProject(options.projectPath, manifest);
}

async function collectManifest(
  projectPath: string,
  defaults: InitPromptDefaults,
  initialSelections: Partial<InitSelections>,
  providedPaths: Partial<InitPromptDefaults>,
  interactive: boolean,
): Promise<Manifest> {
  const knowledgeBasePath = providedPaths.kbPath
    ? providedPaths.kbPath
    : interactive
      ? await promptPath({
          defaultValue: defaults.kbPath,
          description: "AIE OS reads shared engineering principles and coding standards from this folder.",
          promptLabel: "knowledge base path",
          optionName: "--kb-path",
          projectPath,
        })
      : defaults.kbPath;
  await ensureDirectoryType(resolveAgainstProject(projectPath, knowledgeBasePath), "Knowledge base path");

  const agentPath = providedPaths.agentPath
    ? providedPaths.agentPath
    : interactive
      ? await promptPath({
          defaultValue: defaults.agentPath,
          description: "AIE OS reads persona definitions from this folder.",
          promptLabel: "agent path",
          optionName: "--agent-path",
          projectPath,
        })
      : defaults.agentPath;
  await ensureDirectoryType(resolveAgainstProject(projectPath, agentPath), "Agent path");

  const skillsPath = providedPaths.skillsPath !== undefined
    ? normalizeOptionalProvidedPath(projectPath, providedPaths.skillsPath)
    : interactive
      ? await promptOptionalPath({
          defaultValue: defaults.skillsPath,
          description: "AIE OS reads shared skills from this folder. Leave it empty to disable shared skills.",
          promptLabel: "skills path",
          optionName: "--skills-path",
          projectPath,
        })
      : defaults.skillsPath;
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
    interactive,
  );

  return {
    version: "0.1",
    paths: {
      agent: agentPath,
      skills: skillsPath,
      knowledgeBase: knowledgeBasePath,
      projectCodingStandards: aieRelativePaths.projectCodingStandardsDirectory,
      projectSkills: aieRelativePaths.projectSkillsDirectory,
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
  interactive: boolean,
): Promise<InitSelections> {
  const resolvedAgentPath = resolveAgainstProject(projectPath, input.agentPath);
  const resolvedKnowledgeBasePath = resolveAgainstProject(projectPath, input.knowledgeBasePath);

  const personaOptions = await listMarkdownBasenames(
    path.join(resolvedAgentPath, aieStructure.agent.personaDirectoryName),
  );
  const languageOptions = await listDirectoryNames(
    path.join(
      resolvedKnowledgeBasePath,
      aieStructure.knowledgeBase.codingStandardsDirectoryName,
      aieStructure.knowledgeBase.languageDirectoryName,
    ),
  );
  const applicationTypeOptions = await listDirectoryNames(
    path.join(
      resolvedKnowledgeBasePath,
      aieStructure.knowledgeBase.codingStandardsDirectoryName,
      aieStructure.knowledgeBase.applicationTypeDirectoryName,
    ),
  );
  const frameworkOptions = await listDirectoryNames(
    path.join(
      resolvedKnowledgeBasePath,
      aieStructure.knowledgeBase.codingStandardsDirectoryName,
      aieStructure.knowledgeBase.frameworkDirectoryName,
    ),
  );
  const initial = input.initialSelections;

  const persona =
    validateSingleSelection(initial.persona, personaOptions, "agent persona") ??
    (interactive
      ? await promptSingleSelect({
          command: "init",
          defaultValue: personaOptions.includes("software-developer")
            ? "software-developer"
            : (personaOptions[0] ?? null),
          explanation: "Persona defines the agent role and behavioral mode.",
          label: "Select persona",
          options: personaOptions,
        })
      : missingRequiredInitOption("--agent-persona"));

  const languages =
    validateMultiSelection(initial.languages, languageOptions, "languages", false) ??
    (interactive
      ? await promptMultiSelect({
          allowEmpty: false,
          command: "init",
          defaultValue: languageOptions.length === 1 ? [languageOptions[0]] : [],
          explanation: "Select one or more languages. This supports monorepos.",
          label: "Select languages",
          options: languageOptions,
        })
      : missingRequiredInitOption("--languages"));

  const applicationTypes =
    validateMultiSelection(initial.applicationTypes, applicationTypeOptions, "application types", true) ??
    (interactive
      ? await promptMultiSelect({
          allowEmpty: true,
          command: "init",
          defaultValue: [],
          explanation: "Application type selects standards for the shape of the application, such as api or cli.",
          label: "Select application types",
          options: applicationTypeOptions,
        })
      : []);

  const frameworks =
    validateMultiSelection(initial.frameworks, frameworkOptions, "frameworks", true) ??
    (interactive
      ? await promptMultiSelect({
          allowEmpty: true,
          command: "init",
          defaultValue: [],
          explanation: "Framework overlays add framework-specific coding standards.",
          label: "Select frameworks",
          options: frameworkOptions,
        })
      : []);

  return {
    applicationTypes,
    frameworks,
    languages,
    persona,
  };
}

async function scaffoldProject(projectPath: string, manifest: Manifest): Promise<void> {
  const aieDirectory = path.join(projectPath, aieStructure.project.directoryName);
  await ensureDirectory(aieDirectory);

  const projectCodingStandardsPath = resolveAgainstProject(projectPath, manifest.paths.projectCodingStandards);
  const projectSkillsPath = resolveAgainstProject(projectPath, manifest.paths.projectSkills);

  await ensureDirectory(projectCodingStandardsPath);
  await ensureDirectory(projectSkillsPath);
  await writeTemplateIfMissing(
    path.join(projectCodingStandardsPath, aieStructure.files.readmeFileName),
    projectCodingStandardsReadmeTemplate,
  );
  await writeTemplateIfMissing(
    path.join(projectSkillsPath, aieStructure.files.readmeFileName),
    projectSkillsReadmeTemplate,
  );

  await saveManifest(manifest, path.join(aieDirectory, aieStructure.project.manifestFileName));
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

AIE OS project created at ${path.join(projectPath, aieStructure.project.directoryName)}.
`);
}

async function writeTemplateIfMissing(targetPath: string, content: string): Promise<void> {
  if (await fileExists(targetPath)) {
    return;
  }

  await writeText(targetPath, content);
}

async function promptPath(inputOptions: {
  defaultValue: string;
  description: string;
  promptLabel: string;
  optionName: string;
  projectPath: string;
}): Promise<string> {
  let errorMessage: string | undefined;
  let currentValue = inputOptions.defaultValue;

  while (true) {
    const rawValue = await promptTextInput({
      command: "init",
      defaultValue: currentValue,
      description: inputOptions.description,
      errorMessage,
      optionName: inputOptions.optionName,
      promptLabel: inputOptions.promptLabel,
      submitHint: "Press Enter to accept the default, type a new value, or press Esc to cancel.",
    });

    const normalizedValue = normalizeConfiguredPath(
      inputOptions.projectPath,
      rawValue.trim() === "" ? inputOptions.defaultValue : rawValue.trim(),
    );

    try {
      await ensureDirectoryType(
        resolveAgainstProject(inputOptions.projectPath, normalizedValue),
        capitalizeLabel(inputOptions.promptLabel),
      );
      return normalizedValue;
    } catch (error) {
      currentValue = rawValue.trim() === "" ? currentValue : rawValue.trim();
      errorMessage = error instanceof Error ? error.message : "Invalid path.";
    }
  }
}

async function promptOptionalPath(inputOptions: {
  defaultValue: string;
  description: string;
  promptLabel: string;
  optionName: string;
  projectPath: string;
}): Promise<string> {
  let errorMessage: string | undefined;
  let currentValue = inputOptions.defaultValue;

  while (true) {
    const rawValue = await promptTextInput({
      command: "init",
      defaultValue: currentValue,
      description: inputOptions.description,
      errorMessage,
      optionName: inputOptions.optionName,
      promptLabel: inputOptions.promptLabel,
      submitHint: "Enter to accept, delete to empty and disable, type to replace, or press Esc to cancel.",
    });

    const normalizedValue = rawValue.trim() === ""
      ? ""
      : normalizeConfiguredPath(inputOptions.projectPath, rawValue.trim());

    if (normalizedValue === "") {
      return "";
    }

    try {
      await ensureDirectoryType(
        resolveAgainstProject(inputOptions.projectPath, normalizedValue),
        capitalizeLabel(inputOptions.promptLabel),
      );
      return normalizedValue;
    } catch (error) {
      currentValue = rawValue.trim() === "" ? currentValue : rawValue.trim();
      errorMessage = error instanceof Error ? error.message : "Invalid path.";
    }
  }
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

function missingRequiredInitOption(optionName: string): never {
  throw new Error(
    `Missing required option ${optionName}. Run "aie-os init" in a terminal to be prompted interactively.`,
  );
}

function capitalizeLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
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
  if (configuredPath.trim() === "") {
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
