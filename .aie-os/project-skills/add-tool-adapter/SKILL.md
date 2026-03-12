---
name: add-tool-adapter
description: Use this skill when the user wants to add support for a new tool by creating a new AIE OS adapter. It scaffolds the adapter contribution wiring for the named tool, updates deterministic registration points, and then tells the contributor where the adapter-specific rendering logic must be implemented.
---

# Add Tool Adapter

Use this skill when the user wants to add a new adapter for a new tool in this `AIE OS` project.

## Outcome

- Ask for the tool name if it is not already explicit.
- Scaffold the new adapter contribution shape for that tool.
- Add the deterministic wiring needed by the project:
  - adapter file scaffold
  - static adapter registry entry
  - supported tool type update
  - CLI tool selection wiring if needed
- After scaffolding, tell the contributor exactly where the real adapter logic must be implemented.

## Scope

Do:
- create the adapter file scaffold
- update the static TypeScript adapter registry
- update the supported adapter tool type
- update CLI support if the new tool must be selectable from `build --tool`

Do not:
- invent tool-specific rendering rules without user input
- leave deterministic wiring as a manual follow-up
- change unrelated adapters

## Implementation Target

The real adapter logic belongs in:
- `cli/src/core/agentAdapters/<tool>Adapter.ts`

The deterministic registration points are:
- `cli/src/core/agentAdapters/index.ts`
- `cli/src/core/agentAdapters/types.ts`
- CLI parsing/help if the tool should be accepted by `build --tool`

## Response After Scaffolding

After the scaffold is created, report:
- the files added or updated
- the generated adapter file path
- that the remaining work is to implement the adapter-specific artifact rendering logic in that adapter file
