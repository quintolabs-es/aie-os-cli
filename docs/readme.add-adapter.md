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

1. one adapter file under:
   - `src/agentAdapters/<tool>Adapter.ts`
2. one static registry entry in:
   - `src/agentAdapters/index.ts`
3. one supported tool type update in:
   - `src/agentAdapters/types.ts`
4. CLI support in:
   - `src/commands/commandLine.ts`

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
- replace the placeholder output path and contents
- build and test the new adapter

### Minimal example

```ts
import type { Adapter } from "./types";

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
      files: [{ path: "EXAMPLE.md", contents }],
      primaryArtifact: "EXAMPLE.md",
    };
  },
};
```

### Registry example

```ts
import { codexAdapter } from "./codexAdapter";
import { exampleAdapter } from "./exampleAdapter";

const adapters = {
  codex: codexAdapter,
  example: exampleAdapter,
};
```

One adapter file plus one registry line is the intended extension path. The project skill automates the rest of the deterministic setup.
