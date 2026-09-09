import { claudeAdapter } from "./claude/claudeAdapter";
import { defaultAdapter } from "./default/defaultAdapter";
import type { Adapter, AdapterTool } from "./types";

const adapters = {
  claude: claudeAdapter,
  default: defaultAdapter,
} satisfies Record<AdapterTool, Adapter>;

export function getAdapter(tool: AdapterTool): Adapter {
  const adapter = adapters[tool];

  if (!adapter) {
    throw new Error(`Unsupported tool: ${tool}`);
  }

  return adapter;
}

export type {
  Adapter,
  AdapterTool,
  AdapterInput,
  AdapterOutput,
  AdapterOutputFile,
  EffectiveContextBlock,
  EffectiveContext,
  EffectiveContextSkill,
  EffectiveContextSkillScope,
  EffectiveContextInputs,
  EffectiveContextMetadata,
  EffectiveContextPersona,
  SkillAdapterOutput,
  SkillCopyItem,
} from "./types";
