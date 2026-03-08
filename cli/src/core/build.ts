import path from "node:path";
import { readText } from "./files";
import type { Manifest } from "./manifest";

export type BuildInput = {
  agentPath: string;
  kbPath: string;
  manifest: Manifest;
  projectPath: string;
  skillsPath: string;
  tool: "codex";
};

type BuildSection = {
  body: string;
  heading: string;
  layer: string;
  source: string;
};

export type BuildOutput = {
  agentContext: string;
  manifest: Manifest;
  sections: BuildSection[];
  tool: "codex";
};

export async function buildAgentContext(input: BuildInput): Promise<BuildOutput> {
  const sections = await resolveSections(input);

  return {
    agentContext: renderContextDocument({
      manifest: input.manifest,
      sections,
      title: "# Agent Context",
      tool: input.tool,
    }),
    manifest: input.manifest,
    sections,
    tool: input.tool,
  };
}

export function buildCodexAdapter(output: BuildOutput): string {
  return renderContextDocument({
    manifest: output.manifest,
    note: "Canonical source: `.ai/agent-context.md`.",
    sections: output.sections,
    title: "# AGENTS",
    tool: output.tool,
  });
}

async function resolveSections(input: BuildInput): Promise<BuildSection[]> {
  const sections: BuildSection[] = [];

  for (const repoFile of input.manifest.repoContext) {
    const source = path.join(input.projectPath, ".ai", repoFile);
    sections.push({
      body: await readText(source),
      heading: repoFile,
      layer: "Repo Context",
      source: path.relative(input.projectPath, source),
    });
  }

  for (const principle of input.manifest.principles) {
    sections.push(
      await loadSection(
        input.kbPath,
        path.join("10-engineering-principles", `${principle}.md`),
        path.join("knowledge-base", "10-engineering-principles", `${principle}.md`),
        principle,
        "Engineering Principles",
      ),
    );
  }

  for (const standard of input.manifest.standards.core) {
    sections.push(
      await loadSection(
        input.kbPath,
        path.join("20-coding-standards", "10-core", `${standard}.md`),
        path.join("knowledge-base", "20-coding-standards", "10-core", `${standard}.md`),
        standard,
        "Core Technical Standards",
      ),
    );
  }

  for (const language of input.manifest.standards.languages) {
    sections.push(
      await loadSection(
        input.kbPath,
        path.join("20-coding-standards", "20-language", `${language}.md`),
        path.join("knowledge-base", "20-coding-standards", "20-language", `${language}.md`),
        language,
        "Language Standards",
      ),
    );
  }

  for (const applicationType of input.manifest.standards.applicationTypes) {
    sections.push(
      await loadSection(
        input.kbPath,
        path.join("20-coding-standards", "30-application-type", `${applicationType}.md`),
        path.join(
          "knowledge-base",
          "20-coding-standards",
          "30-application-type",
          `${applicationType}.md`,
        ),
        applicationType,
        "Application-Type Standards",
      ),
    );
  }

  for (const framework of input.manifest.standards.frameworks) {
    sections.push(
      await loadSection(
        input.kbPath,
        path.join("20-coding-standards", "40-framework", `${framework}.md`),
        path.join("knowledge-base", "20-coding-standards", "40-framework", `${framework}.md`),
        framework,
        "Framework Standards",
      ),
    );
  }

  for (const projectSkill of input.manifest.skills.project) {
    sections.push(
      await loadSection(
        path.join(input.projectPath, ".ai"),
        path.join("skills", `${projectSkill}.md`),
        path.join(".ai", "skills", `${projectSkill}.md`),
        projectSkill,
        "Project Skills",
      ),
    );
  }

  for (const globalSkill of input.manifest.skills.global) {
    sections.push(
      await loadSection(
        input.skillsPath,
        path.join("global", `${globalSkill}.md`),
        path.join("skills", "global", `${globalSkill}.md`),
        globalSkill,
        "Global Skills",
      ),
    );
  }

  sections.push(
    await loadSection(
      input.agentPath,
      path.join("10-style", `${input.manifest.style}.md`),
      path.join("agent", "10-style", `${input.manifest.style}.md`),
      input.manifest.style,
      "Response Style",
    ),
  );

  sections.push(
    await loadSection(
      input.agentPath,
      path.join("20-persona", `${input.manifest.persona}.md`),
      path.join("agent", "20-persona", `${input.manifest.persona}.md`),
      input.manifest.persona,
      "Persona",
    ),
  );

  return sections;
}

async function loadSection(
  rootPath: string,
  relativePath: string,
  sourceLabel: string,
  heading: string,
  layer: string,
): Promise<BuildSection> {
  const source = path.join(rootPath, relativePath);

  return {
    body: await readText(source),
    heading,
    layer,
    source: sourceLabel,
  };
}

function renderContextDocument(input: {
  manifest: Manifest;
  note?: string;
  sections: BuildSection[];
  title: string;
  tool: "codex";
}): string {
  const buildInputs = [
    `- Tool: ${input.tool}`,
    `- Persona: ${input.manifest.persona}`,
    `- Style: ${input.manifest.style}`,
    `- Principles: ${formatList(input.manifest.principles)}`,
    `- Core standards: ${formatList(input.manifest.standards.core)}`,
    `- Language standards: ${formatList(input.manifest.standards.languages)}`,
    `- Application-type standards: ${formatList(input.manifest.standards.applicationTypes)}`,
    `- Framework standards: ${formatList(input.manifest.standards.frameworks)}`,
    `- Project skills: ${formatList(input.manifest.skills.project)}`,
    `- Global skills: ${formatList(input.manifest.skills.global)}`,
    `- Repo context: ${formatList(input.manifest.repoContext)}`,
  ].join("\n");

  const renderedSections = input.sections
    .map((section, index) =>
      [
        `## ${index + 1}. ${section.layer}: ${section.heading}`,
        "",
        `Source: \`${section.source}\``,
        "",
        section.body.trim(),
      ].join("\n"),
    )
    .join("\n\n");

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
    renderedSections,
    "",
  ].join("\n");
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return "none";
  }

  return items.join(", ");
}
