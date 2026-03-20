import path from "node:path";
import {
  fileExists,
  listDirectoryNames,
  listMarkdownFiles,
  readText,
} from "./filesystem";
import { aieStructure } from "./aieStructure";
import type { Manifest } from "./manifest";
import type {
  EffectiveContext,
  EffectiveContextBlock,
  EffectiveContextInputs,
  EffectiveContextPersona,
  EffectiveContextSkill,
  EffectiveContextSkillScope,
} from "../agentAdapters";

export type BuildInput = {
  manifest: Manifest;
  projectPath: string;
  tool: "codex";
};

export type BuildOutput = {
  effectiveContext: EffectiveContext;
  tool: "codex";
};

type ConditionalAppliesTo = {
  applicationTypes: string[];
  frameworks: string[];
  languages: string[];
};

type LoadedBlocks = {
  criticalRules: EffectiveContextBlock[];
  sections: EffectiveContextBlock[];
};

export async function buildAgentContext(input: BuildInput): Promise<BuildOutput> {
  const resolvedContext = await resolveContext(input);
  const effectiveContext: EffectiveContext = {
    version: "0.1",
    metadata: {
      inputs: toEffectiveContextInputs(input.manifest),
    },
    persona: resolvedContext.persona,
    criticalRules: resolvedContext.criticalRules,
    sections: resolvedContext.sections,
    skills: resolvedContext.skills,
  };

  return {
    effectiveContext,
    tool: input.tool,
  };
}

async function resolveContext(input: BuildInput): Promise<{
  criticalRules: EffectiveContextBlock[];
  persona: EffectiveContextPersona;
  sections: EffectiveContextBlock[];
  skills: EffectiveContextSkill[];
}> {
  const criticalRules: EffectiveContextBlock[] = [];
  const sections: EffectiveContextBlock[] = [];
  const skills: EffectiveContextSkill[] = [];
  const projectPath = input.projectPath;
  const knowledgeBasePath = resolveProjectPath(projectPath, input.manifest.paths.knowledgeBase);
  const agentPath = resolveProjectPath(projectPath, input.manifest.paths.agent);
  const skillsPath = resolveOptionalProjectPath(projectPath, input.manifest.paths.skills);
  const projectCodingStandardsPath = resolveProjectPath(
    projectPath,
    input.manifest.paths.projectCodingStandards,
  );
  const projectSkillsPath = resolveProjectPath(projectPath, input.manifest.paths.projectSkills);

  const persona = await loadPersona(
    path.join(
      agentPath,
      aieStructure.agent.personaDirectoryName,
      `${input.manifest.selection.persona}${aieStructure.files.markdownExtension}`,
    ),
    projectPath,
  );

  pushLoadedBlocks(
    { criticalRules, sections },
    await loadOptionalDirectoryBlocks(
      path.join(agentPath, aieStructure.agent.universalDirectoryName),
      projectPath,
      "Agent Rules",
      "Agent Rules",
    ),
  );

  pushLoadedBlocks(
    { criticalRules, sections },
    await loadDirectoryBlocks(
      path.join(
        knowledgeBasePath,
        aieStructure.knowledgeBase.engineeringPrinciplesDirectoryName,
        aieStructure.knowledgeBase.universalDirectoryName,
      ),
      projectPath,
      "Engineering Principles",
      "Engineering Principles",
    ),
  );

  pushLoadedBlocks(
    { criticalRules, sections },
    await loadDirectoryBlocks(
      path.join(
        knowledgeBasePath,
        aieStructure.knowledgeBase.codingStandardsDirectoryName,
        aieStructure.knowledgeBase.universalDirectoryName,
      ),
      projectPath,
      "Shared Coding Standards",
      "Coding Standards",
    ),
  );

  for (const language of input.manifest.selection.languages) {
    pushLoadedBlocks(
      { criticalRules, sections },
      await loadDirectoryBlocks(
        path.join(
          knowledgeBasePath,
          aieStructure.knowledgeBase.codingStandardsDirectoryName,
          aieStructure.knowledgeBase.languageDirectoryName,
          language,
        ),
        projectPath,
        "Language Standards",
        `Language: ${language}`,
      ),
    );
  }

  for (const applicationType of input.manifest.selection.applicationTypes) {
    pushLoadedBlocks(
      { criticalRules, sections },
      await loadDirectoryBlocks(
        path.join(
          knowledgeBasePath,
          aieStructure.knowledgeBase.codingStandardsDirectoryName,
          aieStructure.knowledgeBase.applicationTypeDirectoryName,
          applicationType,
        ),
        projectPath,
        "Application-Type Standards",
        `Application Type: ${applicationType}`,
      ),
    );
  }

  for (const framework of input.manifest.selection.frameworks) {
    pushLoadedBlocks(
      { criticalRules, sections },
      await loadDirectoryBlocks(
        path.join(
          knowledgeBasePath,
          aieStructure.knowledgeBase.codingStandardsDirectoryName,
          aieStructure.knowledgeBase.frameworkDirectoryName,
          framework,
        ),
        projectPath,
        "Framework Standards",
        `Framework: ${framework}`,
      ),
    );
  }

  pushLoadedBlocks(
    { criticalRules, sections },
    await loadConditionalBlocks(
      path.join(
        knowledgeBasePath,
        aieStructure.knowledgeBase.codingStandardsDirectoryName,
        aieStructure.knowledgeBase.conditionalDirectoryName,
      ),
      projectPath,
      input.manifest.selection,
      "Conditional Coding Standards",
      "Conditional Rules",
    ),
  );

  if (skillsPath) {
    skills.push(...(await loadSkillDefinitions(skillsPath, projectPath, "shared")));
  }

  pushLoadedBlocks(
    { criticalRules, sections },
    await loadDirectoryBlocks(
      projectCodingStandardsPath,
      projectPath,
      "Project Coding Standards",
      "Project Coding Standards",
    ),
  );

  skills.push(...(await loadSkillDefinitions(projectSkillsPath, projectPath, "project")));

  return {
    criticalRules,
    persona,
    sections,
    skills,
  };
}

function pushLoadedBlocks(target: LoadedBlocks, loaded: LoadedBlocks): void {
  target.criticalRules.push(...loaded.criticalRules);
  target.sections.push(...loaded.sections);
}

function toEffectiveContextInputs(manifest: Manifest): EffectiveContextInputs {
  return {
    applicationTypes: [...manifest.selection.applicationTypes],
    frameworks: [...manifest.selection.frameworks],
    languages: [...manifest.selection.languages],
    persona: manifest.selection.persona,
  };
}

async function loadPersona(filePath: string, projectPath: string): Promise<EffectiveContextPersona> {
  const content = normalizeMarkdownContents(await readText(filePath));

  return {
    content,
    source: toOutputFileReference(projectPath, filePath),
  };
}

async function loadDirectoryBlocks(
  directoryPath: string,
  projectPath: string,
  layer: string,
  baseSectionLabel: string,
): Promise<LoadedBlocks> {
  const files = await listMarkdownFiles(directoryPath);

  return loadBlocksFromFiles(files, {
    baseDirectory: directoryPath,
    baseSectionLabel,
    layer,
    projectPath,
  });
}

async function loadOptionalDirectoryBlocks(
  directoryPath: string,
  projectPath: string,
  layer: string,
  baseSectionLabel: string,
): Promise<LoadedBlocks> {
  if (!(await fileExists(directoryPath))) {
    return {
      criticalRules: [],
      sections: [],
    };
  }

  return loadDirectoryBlocks(directoryPath, projectPath, layer, baseSectionLabel);
}

async function loadConditionalBlocks(
  directoryPath: string,
  projectPath: string,
  selection: Manifest["selection"],
  layer: string,
  baseSectionLabel: string,
): Promise<LoadedBlocks> {
  if (!(await fileExists(directoryPath))) {
    return {
      criticalRules: [],
      sections: [],
    };
  }

  const files = await listMarkdownFiles(directoryPath);
  const matchedFiles: string[] = [];

  for (const filePath of files) {
    const contents = await readText(filePath);
    const appliesTo = parseConditionalAppliesTo(contents, filePath);

    if (!appliesTo) {
      continue;
    }

    if (!matchesConditionalAppliesTo(appliesTo, selection)) {
      continue;
    }

    matchedFiles.push(filePath);
  }

  return loadBlocksFromFiles(matchedFiles, {
    baseDirectory: directoryPath,
    baseSectionLabel,
    layer,
    projectPath,
  });
}

async function loadBlocksFromFiles(
  files: string[],
  input: {
    baseDirectory: string;
    baseSectionLabel: string;
    layer: string;
    projectPath: string;
  },
): Promise<LoadedBlocks> {
  const criticalRules: EffectiveContextBlock[] = [];
  const sections: EffectiveContextBlock[] = [];

  for (const filePath of files) {
    const content = normalizeMarkdownContents(await readText(filePath));

    if (content === "") {
      continue;
    }

    const block: EffectiveContextBlock = {
      content,
      layer: input.layer,
      sectionLabel: deriveSectionLabel(
        input.baseDirectory,
        input.baseSectionLabel,
        filePath,
      ),
      source: toOutputFileReference(input.projectPath, filePath),
    };

    if (path.basename(filePath) === aieStructure.files.criticalRulesFileName) {
      criticalRules.push(block);
      continue;
    }

    sections.push(block);
  }

  return {
    criticalRules,
    sections,
  };
}

function deriveSectionLabel(
  baseDirectory: string,
  baseSectionLabel: string,
  filePath: string,
): string {
  const relativeDirectory = path.relative(baseDirectory, path.dirname(filePath));

  if (relativeDirectory === "") {
    return baseSectionLabel;
  }

  return `${baseSectionLabel}: ${relativeDirectory.split(path.sep).join(" / ")}`;
}

async function loadSkillDefinitions(
  directoryPath: string,
  projectPath: string,
  scope: EffectiveContextSkillScope,
): Promise<EffectiveContextSkill[]> {
  const skillNames = await listDirectoryNames(directoryPath);

  return Promise.all(
    skillNames.map(async (skillName) => {
      const skillDirectory = path.join(directoryPath, skillName);
      const skillMetadata = await loadSkillMetadata(skillDirectory);

      return {
        description: skillMetadata.description,
        entrypoint: aieStructure.files.skillFileName,
        name: skillName,
        scope,
        source: toOutputFileReference(projectPath, skillDirectory),
        warnings: skillMetadata.warnings,
      };
    }),
  );
}

async function loadSkillMetadata(skillDirectory: string): Promise<{
  description: string;
  warnings: string[];
}> {
  const skillFilePath = path.join(skillDirectory, aieStructure.files.skillFileName);
  if (!(await fileExists(skillFilePath))) {
    return {
      description: "No usage description provided.",
      warnings: [`Skill missing ${aieStructure.files.skillFileName}: ${skillDirectory}`],
    };
  }

  const contents = await readText(skillFilePath);
  const description = readFrontmatterField(contents, "description");

  if (description === "") {
    return {
      description: "No usage description provided.",
      warnings: [
        `Skill missing description in ${aieStructure.files.skillFileName} frontmatter: ${skillDirectory}`,
      ],
    };
  }

  return {
    description,
    warnings: [],
  };
}

function readFrontmatterField(contents: string, fieldName: string): string {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  if (!match) {
    return "";
  }

  const lines = match[1].split(/\r?\n/u);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fieldMatch = line.match(new RegExp(`^${fieldName}:(?:\\s*(.*))?$`, "u"));

    if (!fieldMatch) {
      continue;
    }

    const rawValue = (fieldMatch[1] ?? "").trim();
    if (rawValue === "|" || rawValue === ">") {
      const blockLines: string[] = [];
      let nextIndex = index + 1;

      while (nextIndex < lines.length) {
        const nextLine = lines[nextIndex];
        if (!nextLine.startsWith("  ")) {
          break;
        }

        blockLines.push(nextLine.slice(2));
        nextIndex += 1;
      }

      return trimYamlScalar(
        rawValue === ">"
          ? blockLines.join(" ")
          : blockLines.join("\n"),
      );
    }

    return trimYamlScalar(rawValue);
  }

  return "";
}

function parseConditionalAppliesTo(
  contents: string,
  filePath: string,
): ConditionalAppliesTo | null {
  const frontmatter = readFrontmatterBlock(contents);

  if (!frontmatter) {
    return null;
  }

  const lines = frontmatter.split(/\r?\n/u);
  const rawAppliesToLine = lines.find((line) => line.trimStart().startsWith("applies_to:"));

  if (rawAppliesToLine && rawAppliesToLine.trim() !== "applies_to:") {
    throw new Error(
      `Expected applies_to to use a nested block in conditional coding standard: ${filePath}`,
    );
  }

  const appliesToIndex = lines.findIndex((line) => line.trim() === "applies_to:");

  if (appliesToIndex === -1) {
    return null;
  }

  const appliesToLines: string[] = [];

  for (let index = appliesToIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.startsWith("  ")) {
      appliesToLines.push(line);
      continue;
    }

    if (line.trim() === "") {
      continue;
    }

    break;
  }

  if (appliesToLines.length === 0) {
    return null;
  }

  const parsed: ConditionalAppliesTo = {
    applicationTypes: [],
    frameworks: [],
    languages: [],
  };

  for (const line of appliesToLines) {
    const match = line.match(
      /^  (languages|application_types|frameworks):\s*(.+?)\s*$/u,
    );

    if (!match) {
      throw new Error(
        `Invalid applies_to entry in conditional coding standard: ${filePath}`,
      );
    }

    const values = parseInlineStringArray(match[2], filePath);

    switch (match[1]) {
      case "languages":
        parsed.languages = values;
        break;
      case "application_types":
        parsed.applicationTypes = values;
        break;
      case "frameworks":
        parsed.frameworks = values;
        break;
      default:
        throw new Error(
          `Unsupported applies_to dimension in conditional coding standard: ${filePath}`,
        );
    }
  }

  if (
    parsed.languages.length === 0 &&
    parsed.applicationTypes.length === 0 &&
    parsed.frameworks.length === 0
  ) {
    return null;
  }

  return parsed;
}

function readFrontmatterBlock(contents: string): string | null {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---/u);
  return match ? match[1] : null;
}

function parseInlineStringArray(value: string, filePath: string): string[] {
  const match = value.trim().match(/^\[(.*)\]$/u);

  if (!match) {
    throw new Error(
      `Expected applies_to values to be inline string arrays in conditional coding standard: ${filePath}`,
    );
  }

  const inner = match[1].trim();

  if (inner === "") {
    return [];
  }

  return inner
    .split(",")
    .map((item) => trimYamlScalar(item))
    .filter((item) => item !== "");
}

function trimYamlScalar(value: string): string {
  const trimmed = value.trim();
  const quotedMatch = trimmed.match(/^(['"])([\s\S]*)\1$/u);

  if (quotedMatch) {
    return quotedMatch[2].trim();
  }

  return trimmed;
}

function matchesConditionalAppliesTo(
  appliesTo: ConditionalAppliesTo,
  selection: Manifest["selection"],
): boolean {
  return (
    matchesConditionalDimension(selection.languages, appliesTo.languages) &&
    matchesConditionalDimension(selection.applicationTypes, appliesTo.applicationTypes) &&
    matchesConditionalDimension(selection.frameworks, appliesTo.frameworks)
  );
}

function matchesConditionalDimension(selected: string[], required: string[]): boolean {
  if (required.length === 0) {
    return true;
  }

  return required.some((value) => selected.includes(value));
}

function normalizeMarkdownContents(contents: string): string {
  let normalized = contents.replace(/^\uFEFF/u, "");
  normalized = normalized.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n*/u, "");
  normalized = normalized.replace(/^\s*#\s+.*(?:\r?\n)+/u, "");

  return normalized.trim();
}

function resolveProjectPath(projectPath: string, configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(projectPath, configuredPath);
}

function resolveOptionalProjectPath(
  projectPath: string,
  configuredPath: string,
): string | null {
  if (configuredPath.trim() === "") {
    return null;
  }

  return resolveProjectPath(projectPath, configuredPath);
}

function toOutputFileReference(projectPath: string, filePath: string): string {
  const relativePath = path.relative(projectPath, filePath);

  if (
    relativePath === aieStructure.project.directoryName ||
    relativePath.startsWith(`${aieStructure.project.directoryName}${path.sep}`)
  ) {
    return relativePath;
  }

  return filePath;
}
