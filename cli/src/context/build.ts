import path from "node:path";
import {
  fileExists,
  listDirectoryNames,
  listMarkdownFiles,
  readText,
} from "./filesystem";
import type { Manifest } from "./manifest";
import type {
  EffectiveContext,
  ParsedSourceBlocks,
  EffectiveContextSection,
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
  effectiveContextMarkdown: string;
  manifest: Manifest;
  tool: "codex";
};

type ConditionalAppliesTo = {
  applicationTypes: string[];
  frameworks: string[];
  languages: string[];
};

export async function buildAgentContext(input: BuildInput): Promise<BuildOutput> {
  const resolvedContext = await resolveContext(input);
  const effectiveContext: EffectiveContext = {
    manifest: input.manifest,
    sections: resolvedContext.sections,
    skills: resolvedContext.skills,
    version: "0.1",
  };

  return {
    effectiveContext,
    effectiveContextMarkdown: await renderEffectiveContextMarkdown({
      effectiveContext,
      projectPath: input.projectPath,
      title: "# Agent Context",
      tool: input.tool,
    }),
    manifest: input.manifest,
    tool: input.tool,
  };
}

async function resolveContext(input: BuildInput): Promise<{
  sections: EffectiveContextSection[];
  skills: EffectiveContextSkill[];
}> {
  const sections: EffectiveContextSection[] = [];
  const skills: EffectiveContextSkill[] = [];
  const projectPath = input.projectPath;
  const knowledgeBasePath = resolveProjectPath(projectPath, input.manifest.paths.knowledgeBase);
  const agentPath = resolveProjectPath(projectPath, input.manifest.paths.agent);
  const skillsPath = resolveOptionalProjectPath(
    projectPath,
    input.manifest.paths.skills,
  );
  const projectCodingStandardsPath = resolveProjectPath(
    projectPath,
    input.manifest.paths.projectCodingStandards,
  );
  const projectSkillsPath = resolveProjectPath(projectPath, input.manifest.paths.projectSkills);

  sections.push(
    ...(await loadDirectorySections(
      path.join(knowledgeBasePath, "engineering-principles", "universal"),
      projectPath,
      "Engineering Principles",
    )),
  );

  sections.push(
    ...(await loadDirectorySections(
      path.join(knowledgeBasePath, "coding-standards", "universal"),
      projectPath,
      "Shared Coding Standards",
    )),
  );

  for (const language of input.manifest.selection.languages) {
    sections.push(
      ...(await loadDirectorySections(
        path.join(knowledgeBasePath, "coding-standards", "language", language),
        projectPath,
        "Language Standards",
      )),
    );
  }

  for (const applicationType of input.manifest.selection.applicationTypes) {
    sections.push(
      ...(await loadDirectorySections(
        path.join(
          knowledgeBasePath,
          "coding-standards",
          "application-type",
          applicationType,
        ),
        projectPath,
        "Application-Type Standards",
      )),
    );
  }

  for (const framework of input.manifest.selection.frameworks) {
    sections.push(
      ...(await loadDirectorySections(
        path.join(knowledgeBasePath, "coding-standards", "framework", framework),
        projectPath,
        "Framework Standards",
      )),
    );
  }

  sections.push(
    ...(await loadConditionalSections(
      path.join(knowledgeBasePath, "coding-standards", "conditional"),
      projectPath,
      input.manifest.selection,
      "Conditional Coding Standards",
    )),
  );

  if (skillsPath) {
    skills.push(...(await loadSkillDefinitions(skillsPath, projectPath, "shared")));
  }

  sections.push(
    ...(await loadDirectorySections(
      projectCodingStandardsPath,
      projectPath,
      "Project Coding Standards",
    )),
  );

  skills.push(...(await loadSkillDefinitions(projectSkillsPath, projectPath, "project")));

  sections.push(
    ...(await loadOptionalDirectorySections(
      path.join(agentPath, "universal"),
      projectPath,
      "Universal Agent Rules",
    )),
  );

  sections.push(
    await loadSingleFileSection(
      path.join(agentPath, "persona", `${input.manifest.selection.persona}.md`),
      projectPath,
      input.manifest.selection.persona,
      "Persona",
    ),
  );

  return {
    sections,
    skills,
  };
}

async function loadDirectorySections(
  directoryPath: string,
  projectPath: string,
  layer: string,
): Promise<EffectiveContextSection[]> {
  const files = await listMarkdownFiles(directoryPath);

  return Promise.all(
    files.map(async (filePath) => createEffectiveContextSection(filePath, projectPath, layer)),
  );
}

async function loadOptionalDirectorySections(
  directoryPath: string,
  projectPath: string,
  layer: string,
): Promise<EffectiveContextSection[]> {
  if (!(await fileExists(directoryPath))) {
    return [];
  }

  return loadDirectorySections(directoryPath, projectPath, layer);
}

async function loadConditionalSections(
  directoryPath: string,
  projectPath: string,
  selection: Manifest["selection"],
  layer: string,
): Promise<EffectiveContextSection[]> {
  if (!(await fileExists(directoryPath))) {
    return [];
  }

  const files = await listMarkdownFiles(directoryPath);
  const sections: EffectiveContextSection[] = [];

  for (const filePath of files) {
    const contents = await readText(filePath);
    const appliesTo = parseConditionalAppliesTo(contents, filePath);

    if (!appliesTo) {
      continue;
    }

    if (!matchesConditionalAppliesTo(appliesTo, selection)) {
      continue;
    }

    sections.push(createEffectiveContextSectionFromContents(filePath, projectPath, layer, contents));
  }

  return sections;
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
        entrypoint: "SKILL.md",
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
  const skillFilePath = path.join(skillDirectory, "SKILL.md");
  if (!(await fileExists(skillFilePath))) {
    return {
      description: "No usage description provided.",
      warnings: [`Skill missing SKILL.md: ${skillDirectory}`],
    };
  }

  const contents = await readText(skillFilePath);
  const description = readFrontmatterField(contents, "description");

  if (description === "") {
    return {
      description: "No usage description provided.",
      warnings: [`Skill missing description in SKILL.md frontmatter: ${skillDirectory}`],
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

function trimYamlScalar(value: string): string {
  const trimmed = value.trim();
  const quotedMatch = trimmed.match(/^(['"])([\s\S]*)\1$/u);

  if (quotedMatch) {
    return quotedMatch[2].trim();
  }

  return trimmed;
}

async function loadSingleFileSection(
  filePath: string,
  projectPath: string,
  heading: string,
  layer: string,
): Promise<EffectiveContextSection> {
  const contents = await readText(filePath);

  return {
    file: toOutputFileReference(projectPath, filePath),
    heading: readMarkdownTitle(contents) || heading,
    layer,
    parsed: parseSourceBlocks(contents),
    source: path.relative(projectPath, filePath),
  };
}

async function createEffectiveContextSection(
  filePath: string,
  projectPath: string,
  layer: string,
): Promise<EffectiveContextSection> {
  const contents = await readText(filePath);

  return createEffectiveContextSectionFromContents(filePath, projectPath, layer, contents);
}

function createEffectiveContextSectionFromContents(
  filePath: string,
  projectPath: string,
  layer: string,
  contents: string,
): EffectiveContextSection {

  return {
    file: toOutputFileReference(projectPath, filePath),
    heading: readMarkdownTitle(contents) || path.basename(filePath, ".md"),
    layer,
    parsed: parseSourceBlocks(contents),
    source: path.relative(projectPath, filePath),
  };
}

function resolveProjectPath(projectPath: string, configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(projectPath, configuredPath);
}

function parseSourceBlocks(contents: string): ParsedSourceBlocks {
  const parsed: ParsedSourceBlocks = {
    criticalRules: [],
    examples: [],
    forbiddenPatterns: [],
    preferredPatterns: [],
    purpose: [],
    rules: [],
    unclassified: [],
  };

  const normalizedContents = contents.replace(/\r\n/g, "\n");
  const sections = normalizedContents.split(/^##\s+/m);

  if (sections.length === 1) {
    parsed.unclassified.push(...extractContentBlocks(removeTitle(normalizedContents)));
    return parsed;
  }

  const [preamble, ...sectionBodies] = sections;
  parsed.unclassified.push(...extractContentBlocks(removeTitle(preamble)));

  for (const sectionBody of sectionBodies) {
    const newlineIndex = sectionBody.indexOf("\n");
    const rawHeading = newlineIndex === -1 ? sectionBody : sectionBody.slice(0, newlineIndex);
    const rawContent = newlineIndex === -1 ? "" : sectionBody.slice(newlineIndex + 1);
    const sectionKey = normalizeSectionKey(rawHeading);
    const blocks = extractContentBlocks(rawContent);

    switch (sectionKey) {
      case "purpose":
        parsed.purpose.push(...blocks);
        break;
      case "critical-rules":
      case "validation-instruction":
        parsed.criticalRules.push(...blocks);
        break;
      case "rules":
        parsed.rules.push(...blocks);
        break;
      case "preferred-patterns":
        parsed.preferredPatterns.push(...blocks);
        break;
      case "forbidden-patterns":
        parsed.forbiddenPatterns.push(...blocks);
        break;
      case "examples":
        parsed.examples.push(...blocks);
        break;
      default:
        parsed.unclassified.push(...blocks);
        break;
    }
  }

  return parsed;
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

function removeTitle(contents: string): string {
  return contents.replace(/^#\s+.*\n+/u, "");
}

function readMarkdownTitle(contents: string): string {
  const match = contents.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "";
}

function normalizeSectionKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function extractContentBlocks(contents: string): string[] {
  const lines = contents.trim().split("\n");
  const blocks: string[] = [];
  let currentBlock: string[] = [];
  let currentType: "bullet" | "text" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      if (currentType === "text" && currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n").trim());
        currentBlock = [];
        currentType = null;
      } else if (currentType === "bullet" && currentBlock.length > 0) {
        currentBlock.push("");
      }

      continue;
    }

    if (/^[-*+]\s+/u.test(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join("\n").trim());
      }

      currentBlock = [line];
      currentType = "bullet";
      continue;
    }

    currentBlock.push(line);
    currentType = currentType ?? "text";
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join("\n").trim());
  }

  return blocks.filter((block) => block !== "");
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

export async function renderEffectiveContextMarkdown(input: {
  effectiveContext: EffectiveContext;
  note?: string;
  projectPath: string;
  title: string;
  tool: "codex";
}): Promise<string> {
  const buildInputs = [
    `- Tool: ${input.tool}`,
    `- Persona: ${input.effectiveContext.manifest.selection.persona}`,
    `- Languages: ${formatList(input.effectiveContext.manifest.selection.languages)}`,
    `- Application types: ${formatList(input.effectiveContext.manifest.selection.applicationTypes)}`,
    `- Frameworks: ${formatList(input.effectiveContext.manifest.selection.frameworks)}`,
    `- Knowledge base path: ${input.effectiveContext.manifest.paths.knowledgeBase}`,
    `- Agent path: ${input.effectiveContext.manifest.paths.agent}`,
    `- Skills path: ${formatValue(input.effectiveContext.manifest.paths.skills)}`,
    `- Project coding standards path: ${input.effectiveContext.manifest.paths.projectCodingStandards}`,
    `- Project skills path: ${input.effectiveContext.manifest.paths.projectSkills}`,
  ].join("\n");

  const renderedSkills = input.effectiveContext.skills.length === 0
    ? ["## Skills", "", "_None_"].join("\n")
    : [
      "## Skills",
      "",
      ...input.effectiveContext.skills.map((skill, index) => [
        `### ${index + 1}. ${formatSkillScope(skill.scope)}: ${skill.name}`,
        "",
        `- Source: \`${skill.source}\``,
        `- Entry point: \`${skill.entrypoint}\``,
        `- Description: ${skill.description}`,
      ].join("\n")),
    ].join("\n\n");

  const renderedSections = input.effectiveContext.sections
    .map(async (section, index) =>
      [
        `## ${index + 1}. ${section.layer}: ${section.heading}`,
        "",
        `Source: \`${section.source}\``,
        "",
        (await readText(resolveSectionFilePath(input.projectPath, section.file))).trim(),
      ].join("\n"),
    );

  const resolvedSections = await Promise.all(renderedSections);

  return [
    input.title,
    "",
    "This file is generated by AIE OS. Do not edit directly.",
    "Higher-precedence sections appear first. Later sections may refine earlier sections but must not contradict them.",
    "",
    ...(input.note ? [input.note, ""] : []),
    "## Build Inputs",
    "",
    buildInputs,
    "",
    renderedSkills,
    "",
    resolvedSections.join("\n\n"),
    "",
  ].join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "none";
  }

  return items.join(", ");
}

function formatSkillScope(scope: EffectiveContextSkillScope): string {
  return scope === "project" ? "Project Skills" : "Skills";
}

function formatValue(value: string): string {
  return value.trim() === "" ? "none" : value;
}

function toOutputFileReference(projectPath: string, filePath: string): string {
  const relativePath = path.relative(projectPath, filePath);

  if (relativePath === ".aie-os" || relativePath.startsWith(`.aie-os${path.sep}`)) {
    return relativePath;
  }

  return filePath;
}

function resolveSectionFilePath(projectPath: string, fileReference: string): string {
  if (path.isAbsolute(fileReference)) {
    return fileReference;
  }

  return path.resolve(projectPath, fileReference);
}
