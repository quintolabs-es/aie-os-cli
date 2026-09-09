---
name: add-tool-adapter
description: Use this skill when the user wants to add support for a new tool by creating a new AIE OS adapter. It scaffolds the adapter contribution wiring for the named tool, updates all deterministic registration points, and then tells the contributor exactly what remains to implement in the adapter file.
---

# Add Tool Adapter

Use this skill when the user wants to add a new adapter for a new tool in this `AIE OS` project.

## Outcome

- Ask for the tool name if it is not already explicit.
- Normalize the tool name into deterministic code identifiers.
- Scaffold the new adapter contribution shape for that tool.
- Add all deterministic wiring needed by the project:
  - adapter file scaffold
  - static adapter registry entry
  - supported tool type update
  - CLI target-agent selection wiring
  - CLI help text update
- After scaffolding, tell the contributor exactly what remains to implement.

## Scope

Do:
- create the adapter file scaffold
- update the static TypeScript adapter registry
- update the supported adapter tool type
- update CLI support so the new tool is selectable from `build --target-agent`
- update CLI help text so the new tool appears in usage and option descriptions

Do not:
- invent tool-specific rendering rules without user input
- leave deterministic wiring as a manual follow-up
- change unrelated adapters

## Target agent aliases

`--target-agent` (CLI-facing, `TargetAgentName` in `src/commands/types.ts`) is a separate concept from `AdapterTool` (`src/agentAdapters/types.ts`) and can have more values. If the user wants a new target-agent name to produce output byte-identical to an existing adapter, do not scaffold a new adapter folder — instead add the name to `SUPPORTED_TARGET_AGENTS` in `src/commands/commandLine.ts` and map it to the existing `AdapterTool` in the alias table (`TARGET_AGENT_ADAPTER_TOOLS`) in `src/commands/build.ts`. Only run the full workflow below when the new tool needs its own `AdapterTool` and adapter file.

## Required Input

- If the user did not provide the tool name, ask for it.
- Use the provided tool name to derive all identifiers below.

## Deterministic Naming

Given the user-provided tool name:

- `toolKey`
  - lowercase kebab-case
  - used for `--target-agent`
  - examples:
    - `Claude Code` -> `claude-code`
    - `Cursor` -> `cursor`

- `adapterBaseName`
  - lowerCamelCase version of `toolKey`
  - examples:
    - `claude-code` -> `claudeCode`
    - `cursor` -> `cursor`

- `adapterSymbol`
  - `${adapterBaseName}Adapter`
  - examples:
    - `claudeCodeAdapter`
    - `cursorAdapter`

- `adapterFile`
  - `src/agentAdapters/${toolKey}/${adapterBaseName}Adapter.ts`

## Workflow

1. Stop if `toolKey` already exists in:
   - `src/agentAdapters/types.ts`
   - `src/agentAdapters/index.ts`
   - `src/commands/types.ts`
   - `src/commands/commandLine.ts`
   - `src/commands/build.ts`

2. Create `adapterFile` with this exact scaffold, replacing the placeholders:

```ts
import type { Adapter, AdapterOutput } from "../types";

export const <adapterSymbol>: Adapter = {
  tool: "<toolKey>",
  async build(_input): Promise<AdapterOutput> {
    return {
      bootstrapPrompt: "TODO: add the session bootstrap prompt for <toolKey>.",
      files: [
        {
          path: "TODO-<toolKey>-artifact.txt",
          contents: "TODO: implement <toolKey> adapter output.\\n",
        },
      ],
      primaryArtifact: "TODO-<toolKey>-artifact.txt",
      warnings: [
        "Implement tool-specific artifact rendering in src/agentAdapters/<toolKey>/<adapterBaseName>Adapter.ts.",
      ],
    };
  },
};
```

3. Update `src/agentAdapters/types.ts`.

Append `| "<toolKey>"` to the existing `AdapterTool` union without rewriting unrelated values, for example:

```ts
export type AdapterTool = "default" | "claude" | "<toolKey>";
```

4. Update `src/agentAdapters/index.ts`.

Add the import:

```ts
import { <adapterSymbol> } from "./<toolKey>/<adapterBaseName>Adapter";
```

Add the registry entry:

```ts
  <toolKey>: <adapterSymbol>,
```

Keep the existing static registry object. Do not replace it with dynamic loading.

5. Update `src/commands/commandLine.ts`.

Add `<toolKey>` to the supported target agents:

```ts
const SUPPORTED_TARGET_AGENTS: TargetAgentName[] = ["default", "copilot", "chatgpt", "claude", "<toolKey>"];
```

Update the `--target-agent` option description and usage examples in `usageText` if the list of supported values is shown there, so `<toolKey>` appears alongside the others.

6. Update `src/commands/types.ts`.

Add `<toolKey>` to the `TargetAgentName` union:

```ts
export type TargetAgentName = "default" | "copilot" | "chatgpt" | "claude" | "<toolKey>";
```

7. Update `src/commands/build.ts`.

Add an identity entry to `TARGET_AGENT_ADAPTER_TOOLS` so the new target agent resolves to its own adapter (not an alias of an existing one):

```ts
const TARGET_AGENT_ADAPTER_TOOLS: Record<TargetAgentName, AdapterTool> = {
  // ...existing entries
  <toolKey>: "<toolKey>",
};
```

8. Do not change any other files unless the user explicitly asks for more.

## Response After Scaffolding

After the scaffold is created, report:

- the files added or updated
- the generated adapter file path
- these exact next steps for the contributor:
  1. implement the tool-specific rendering logic in `src/agentAdapters/<toolKey>/<adapterBaseName>Adapter.ts`
  2. replace the placeholder output path, contents, and bootstrap prompt in that adapter file
  3. run `pnpm run build`
  4. run `bash bin/cli build --project-path <path-to-test-project> --target-agent <toolKey>`
  5. inspect the generated artifact written by the new adapter
