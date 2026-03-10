import { renderEffectiveContextMarkdown } from "../build";
import type { Adapter, AdapterOutput } from "./types";

export const codexAdapter: Adapter = {
  build(input): AdapterOutput {
    const contents = renderEffectiveContextMarkdown({
      effectiveContext: input.effectiveContext,
      note: "Canonical source: `.aie-os/build/effective-context.md`.",
      title: "# AGENTS",
      tool: "codex",
    });

    return {
      files: [
        {
          contents,
          path: "AGENTS.md",
        },
      ],
      primaryArtifact: "AGENTS.md",
    };
  },
  tool: "codex",
};
