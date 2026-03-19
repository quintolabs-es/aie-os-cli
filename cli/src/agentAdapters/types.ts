export type AdapterTool = "codex";

export type EffectiveContextBlock = {
  contents: string;
  layer: string;
  sectionLabel: string;
  source: string;
};

export type EffectiveContextPersona = {
  contents: string;
  source: string;
};

export type EffectiveContextInputs = {
  applicationTypes: string[];
  frameworks: string[];
  languages: string[];
  persona: string;
};

export type EffectiveContextMetadata = {
  inputs: EffectiveContextInputs;
};

export type EffectiveContextSkillScope = "project" | "shared";

export type EffectiveContextSkill = {
  description: string;
  entrypoint: string;
  name: string;
  scope: EffectiveContextSkillScope;
  source: string;
  warnings: string[];
};

export type EffectiveContext = {
  version: string;
  metadata: EffectiveContextMetadata;
  persona: EffectiveContextPersona;
  criticalRules: EffectiveContextBlock[];
  sections: EffectiveContextBlock[];
  skills: EffectiveContextSkill[];
};

export type AdapterInput = {
  effectiveContext: EffectiveContext;
  projectPath: string;
};

export type AdapterOutputFile = {
  contents: string;
  path: string;
};

export type SkillCopyItem = {
  destination: string;
  source: string;
};

export type SkillAdapterOutput = {
  copies: SkillCopyItem[];
  markdown: string;
};

export type AdapterOutput = {
  files: AdapterOutputFile[];
  primaryArtifact: string;
  skillAdapterOutput?: SkillAdapterOutput;
  warnings: string[];
};

export type Adapter = {
  tool: AdapterTool;
  build: (input: AdapterInput) => Promise<AdapterOutput>;
};
