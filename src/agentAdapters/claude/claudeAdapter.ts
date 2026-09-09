import { buildMarkdownAdapterOutput } from "../shared/markdownAdapterRenderer";
import type { Adapter, AdapterOutput } from "../types";

const instructionsFileName = "CLAUDE.md";

export const claudeAdapter: Adapter = {
  async build(input): Promise<AdapterOutput> {
    return buildMarkdownAdapterOutput(input, instructionsFileName);
  },
  tool: "claude",
};
