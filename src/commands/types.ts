export type CommandName = "init" | "build";
export type TargetAgentName = "default" | "copilot" | "chatgpt" | "claude";

export type ParsedOptions = {
  command: CommandName | null;
  help: boolean;
  options: Record<string, string>;
};

export type BuildExecutionOptions = {
  command: "build";
  projectPath: string;
  targetAgent: TargetAgentName;
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
  mode: "interactive" | "explicit";
  providedPaths: Partial<InitPromptDefaults>;
  projectPath: string;
};

export type ExecutionOptions = BuildExecutionOptions | InitExecutionOptions;
