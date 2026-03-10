import type { Manifest } from "../manifest";

export type EffectiveContextSection = {
  body: string;
  heading: string;
  layer: string;
  source: string;
};

export type EffectiveContext = {
  manifest: Manifest;
  sections: EffectiveContextSection[];
  version: number;
};

export type AdapterInput = {
  effectiveContext: EffectiveContext;
  effectiveContextMarkdown: string;
  projectPath: string;
};

export type AdapterOutputFile = {
  contents: string;
  path: string;
};

export type AdapterOutput = {
  files: AdapterOutputFile[];
  primaryArtifact: string;
};

export type Adapter = {
  tool: "codex";
  build: (input: AdapterInput) => AdapterOutput;
};
