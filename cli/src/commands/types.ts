import type { AdapterTool } from "../agentAdapters";

export type CommandName = "init" | "build";
export type ToolName = AdapterTool;

export type ParsedOptions = {
  command: CommandName;
  help: boolean;
  options: Record<string, string>;
};

export type BuildExecutionOptions = {
  command: "build";
  projectPath: string;
  tool: ToolName;
};

export type InitPromptDefaults = {
  agentPath: string;
  skillsPath: string;
  kbPath: string;
};

export type InitSelections = {
  applicationTypes: string[];
  frameworks: string[];
  languages: string[];
  persona: string;
};

export type InitExecutionOptions = {
  command: "init";
  defaults: InitPromptDefaults;
  initialSelections: Partial<InitSelections>;
  providedPaths: Partial<InitPromptDefaults>;
  projectPath: string;
};

export type ExecutionOptions = BuildExecutionOptions | InitExecutionOptions;
