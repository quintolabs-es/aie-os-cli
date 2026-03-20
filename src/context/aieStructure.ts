import path from "node:path";

export const aieStructure = {
  agent: {
    personaDirectoryName: "persona",
    universalDirectoryName: "universal",
  },
  files: {
    criticalRulesFileName: "critical-rules.md",
    markdownExtension: ".md",
    readmeFileName: "README.md",
    skillFileName: "SKILL.md",
  },
  knowledgeBase: {
    applicationTypeDirectoryName: "application-type",
    codingStandardsDirectoryName: "coding-standards",
    conditionalDirectoryName: "conditional",
    engineeringPrinciplesDirectoryName: "engineering-principles",
    frameworkDirectoryName: "framework",
    languageDirectoryName: "language",
    universalDirectoryName: "universal",
  },
  localTool: {
    directoryName: "aie-os",
  },
  project: {
    buildDirectoryName: "build",
    buildSkillsDirectoryName: "skills",
    directoryName: ".aie-os",
    effectiveContextFileName: "effective-context.json",
    legacyEffectiveContextMarkdownFileName: "effective-context.md",
    manifestFileName: "aie-os.json",
    projectCodingStandardsDirectoryName: "project-coding-standards",
    projectSkillsDirectoryName: "project-skills",
  },
  sharedContent: {
    agentDirectoryName: "agent",
    knowledgeBaseDirectoryName: "knowledge-base",
    rootDirectoryName: "content",
    skillsDirectoryName: "skills",
  },
} as const;

export const aieRelativePaths = {
  buildDirectory: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.buildDirectoryName,
  ),
  buildSkillsDirectory: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.buildDirectoryName,
    aieStructure.project.buildSkillsDirectoryName,
  ),
  effectiveContextFile: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.buildDirectoryName,
    aieStructure.project.effectiveContextFileName,
  ),
  legacyEffectiveContextMarkdownFile: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.buildDirectoryName,
    aieStructure.project.legacyEffectiveContextMarkdownFileName,
  ),
  manifestFile: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.manifestFileName,
  ),
  projectCodingStandardsDirectory: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.projectCodingStandardsDirectoryName,
  ),
  projectSkillsDirectory: path.join(
    aieStructure.project.directoryName,
    aieStructure.project.projectSkillsDirectoryName,
  ),
} as const;
