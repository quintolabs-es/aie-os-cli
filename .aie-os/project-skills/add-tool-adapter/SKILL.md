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
  - CLI tool selection wiring
  - CLI help text update
- After scaffolding, tell the contributor exactly what remains to implement.

## Scope

Do:
- create the adapter file scaffold
- update the static TypeScript adapter registry
- update the supported adapter tool type
- update CLI support so the new tool is selectable from `build --tool`
- update CLI help text so the new tool appears in usage and option descriptions

Do not:
- invent tool-specific rendering rules without user input
- leave deterministic wiring as a manual follow-up
- change unrelated adapters

## Required Input

- If the user did not provide the tool name, ask for it.
- Use the provided tool name to derive all identifiers below.

## Deterministic Naming

Given the user-provided tool name:

- `toolKey`
  - lowercase kebab-case
  - used for `--tool`
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
  - `src/agentAdapters/${adapterBaseName}Adapter.ts`

## Workflow

1. Stop if `toolKey` already exists in:
   - `src/agentAdapters/types.ts`
   - `src/agentAdapters/index.ts`
   - `src/commands/commandLine.ts`

2. Create `adapterFile` with this exact scaffold, replacing the placeholders:

```ts
import type { Adapter, AdapterOutput } from "./types";

export const <adapterSymbol>: Adapter = {
  tool: "<toolKey>",
  async build(_input): Promise<AdapterOutput> {
    return {
      files: [
        {
          path: "TODO-<toolKey>-artifact.txt",
          contents: "TODO: implement <toolKey> adapter output.\\n",
        },
      ],
      primaryArtifact: "TODO-<toolKey>-artifact.txt",
      warnings: [
        "Implement tool-specific artifact rendering in src/agentAdapters/<adapterBaseName>Adapter.ts.",
      ],
    };
  },
};
```

3. Update `src/agentAdapters/types.ts`.

Change:

```ts
export type AdapterTool = "codex";
```

To:

```ts
export type AdapterTool = "codex" | "<toolKey>";
```

If more tools already exist, append `| "<toolKey>"` to the union instead of rewriting unrelated values.

4. Update `src/agentAdapters/index.ts`.

Add the import:

```ts
import { <adapterSymbol> } from "./<adapterBaseName>Adapter";
```

Add the registry entry:

```ts
  <toolKey>: <adapterSymbol>,
```

Keep the existing static registry object. Do not replace it with dynamic loading.

5. Update `src/commands/commandLine.ts`.

Make these deterministic changes:

- keep the command-line tool type aligned with the adapter registry:

```ts
import type { ToolName } from "./types";
```

- replace the single-tool constant:

```ts
const TOOL_NAME = "codex";
```

With:

```ts
const DEFAULT_TOOL_NAME: ToolName = "codex";
const SUPPORTED_TOOLS: ToolName[] = ["codex", "<toolKey>"];
const SUPPORTED_TOOLS_CLI = SUPPORTED_TOOLS.join("|");
const SUPPORTED_TOOLS_TEXT = SUPPORTED_TOOLS.join(", ");
```

- update `usageText` so the build usage line becomes:

```ts
  build --tool <${SUPPORTED_TOOLS_CLI}> [--project-path <path>]
```

- update the `--tool` option description to:

```ts
  --tool                            Delivery adapter target. Supported tools: ${SUPPORTED_TOOLS_TEXT}.
```

- update the help fallback build tool from:

```ts
tool: TOOL_NAME,
```

To:

```ts
tool: DEFAULT_TOOL_NAME,
```

- update build validation from the single-tool check to:

```ts
if (!SUPPORTED_TOOLS.includes(tool as ToolName)) {
  throw new Error(`Unsupported tool: ${tool}`);
}
```

- update the final build execution options return to:

```ts
tool: tool as ToolName,
```

Do not leave any `Only codex is supported in v1.` wording in the file after the scaffold.

6. Do not change any other files unless the user explicitly asks for more.

## Response After Scaffolding

After the scaffold is created, report:

- the files added or updated
- the generated adapter file path
- these exact next steps for the contributor:
  1. implement the tool-specific rendering logic in `src/agentAdapters/<adapterBaseName>Adapter.ts`
  2. replace the placeholder output path and contents in that adapter file
  3. run `pnpm run build`
  4. run `bash bin/aie-os build --tool <toolKey> --project-path <path-to-test-project>`
  5. inspect the generated artifact written by the new adapter
