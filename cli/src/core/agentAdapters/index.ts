import { codexAdapter } from "./codexAdapter";
import type { Adapter } from "./types";

export function getAdapter(tool: "codex"): Adapter {
  switch (tool) {
    case "codex":
      return codexAdapter;
    default:
      throw new Error(`Unsupported tool: ${tool satisfies never}`);
  }
}

export type {
  Adapter,
  AdapterInput,
  AdapterOutput,
  AdapterOutputFile,
  EffectiveContext,
  EffectiveContextSection,
} from "./types";
