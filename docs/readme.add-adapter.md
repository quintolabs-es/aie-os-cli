### Add an adapter

An adapter transforms the canonical effective context into the files a specific agent tool expects.

Adapter responsibilities:
- read `effective-context.json` through the typed `effectiveContext` object
- render agent-specific output files
- return only tool-specific artifacts as a file model

An adapter must not:
- discover source files
- decide which content is included
- re-run build logic
- write files directly

### Architecture

The extension model is:

1. one adapter folder under:
   - `src/agentAdapters/<tool>/`
2. the adapter implementation file inside that folder:
   - `src/agentAdapters/<tool>/<tool>Adapter.ts`
3. optional adapter-local helpers in the same folder
4. one static registry entry in:
   - `src/agentAdapters/index.ts`
5. one supported tool type update in:
   - `src/agentAdapters/types.ts`
6. CLI support in:
   - `src/commands/commandLine.ts` (`--target-agent`)
   - `src/commands/build.ts` (the target-agent-to-adapter-tool alias map)

### Target agents vs. adapters

`--target-agent` is a CLI-facing concept (`src/commands/types.ts`'s `TargetAgentName`) and can have more values than `AdapterTool`. Two target agents may need byte-identical output (for example `copilot` and `chatgpt` both render `AGENTS.md`) — in that case, do not scaffold a second adapter folder. Instead, add the new target-agent name to `SUPPORTED_TARGET_AGENTS` in `src/commands/commandLine.ts` and map it to the existing `AdapterTool` in the alias table in `src/commands/build.ts`. Only give a target agent its own adapter folder when its rendering actually differs.

When two adapters render nearly the same content (for example `default` and `claude`, which differ only by output filename), factor the shared rendering logic into a small helper under `src/agentAdapters/shared/` parameterized by the differing inputs, and have both adapter files call it. This is a deliberate deviation from the fully self-contained example below, used only to avoid duplicating a renderer that must stay byte-for-byte in sync across adapters.

### Adapter input

- `effectiveContext`
  - canonical machine-readable build result
  - contains:
    - `metadata.inputs`
    - `persona`
    - `criticalRules`
    - `sections`
    - `skills`
- `projectPath`
  - target project root

### Adapter output

- `bootstrapPrompt`
  - agent-specific session bootstrap prompt printed by `build` after successful artifact generation
- `files`
  - file path and contents for each generated agent artifact
- `primaryArtifact`
  - main generated file name, for example `AGENTS.md`

The CLI passes this output to the artifact writer, which is the only component that writes files to disk.

### Project skill

This project already has a local skill for adding a new adapter:

- `.aie-os/project-skills/add-tool-adapter/SKILL.md`

Use that skill when the intent is to add support for a new tool in this repo.

Typical trigger phrasing:

- add a new adapter for a new tool
- support a new tool
- add a tool adapter

The skill owns the deterministic contributor workflow:

- scaffold the adapter file
- update the static registry
- update the supported tool type
- update CLI tool wiring
- update CLI help text

### What remains manual

After the skill scaffolds the new tool, the contributor still needs to:

- implement the tool-specific rendering logic in the generated adapter file
- replace the placeholder output path, contents, and bootstrap prompt
- build and test the new adapter

### Minimal example

```ts
import type { Adapter } from "../types";

export const exampleAdapter: Adapter = {
  tool: "example",
  async build(input) {
    const contents = [
      "# EXAMPLE",
      "",
      "## Persona",
      "",
      input.effectiveContext.persona.content,
      "",
      "## Critical Rules",
      "",
      ...input.effectiveContext.criticalRules.map((section) => `### ${section.sectionLabel}`),
      "",
      ...input.effectiveContext.sections.map((section) => `## ${section.sectionLabel}`),
      "",
    ].join("\n");

    return {
      bootstrapPrompt: "Read `EXAMPLE.md` before starting work.",
      files: [{ path: "EXAMPLE.md", contents }],
      primaryArtifact: "EXAMPLE.md",
      warnings: [],
    };
  },
};
```

### Registry example

```ts
import { defaultAdapter } from "./default/defaultAdapter";
import { exampleAdapter } from "./example/exampleAdapter";

const adapters = {
  default: defaultAdapter,
  example: exampleAdapter,
};
```

One adapter folder plus one registry line is the intended extension path. The project skill automates the rest of the deterministic setup.
