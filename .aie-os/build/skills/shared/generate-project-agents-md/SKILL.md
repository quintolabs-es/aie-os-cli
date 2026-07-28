---
name: generate-project-agents-md
description: Use this skill when the user wants to create, generate, or configure an AGENTS.md file for a project with AIE OS. It gathers missing configuration, runs the AIE OS CLI, and verifies the generated artifacts.
---

# Generate Project AGENTS.md

Use this skill as a conversational orchestration layer on top of AIE OS when the user wants an `AGENTS.md` file for a project.

## Outcome

- Configure the target project with AIE OS when needed.
- Generate `AGENTS.md` through the AIE OS CLI.
- Verify the configuration, canonical context, and agent instructions artifacts.

## Required Input

- target project path
- AIE OS CLI location or executable command
- configuration choices that cannot be determined from the project and available AIE OS content

## Workflow

1. Resolve the target project path and confirm the AIE OS CLI command available to that project. Prefer the project's local clone command, `bash aie-os/bin/cli`, when present.
2. Inspect the target project and available AIE OS content before asking questions. Do not ask for values that existing configuration or repository evidence already provides.
3. If `.aie-os/aie-os.json` does not exist, discover valid personas, languages, application types, and frameworks from the configured AIE OS content paths. Ask the user only for unresolved required choices.
4. Run AIE OS initialization. Use `bash aie-os/bin/cli init --project-path <project-path>` when an interactive terminal should collect the choices. When choices have already been gathered, run explicit mode with `--kb-path`, `--agent-path`, `--agent-persona`, and any selected `--skills-path`, `--languages`, `--application-type`, or `--frameworks` options.
5. If `.aie-os/aie-os.json` already exists, preserve it and skip initialization unless the user explicitly requests reconfiguration.
6. Run `bash aie-os/bin/cli build --project-path <project-path> --tool default`.
7. Verify that `.aie-os/aie-os.json`, `.aie-os/build/effective-context.json`, and `AGENTS.md` exist under the target project and that `AGENTS.md` is non-empty.
8. Report the generated artifact paths and any CLI error that prevents completion.

## Rules

- Treat AIE OS as the source of truth and generation engine.
- Do not write, patch, or reconstruct `AGENTS.md` or `.aie-os/build/effective-context.json` directly.
- Do not duplicate AIE OS configuration or rendering logic in the skill.
- Do not overwrite an existing AIE OS configuration without explicit user approval.
- Use only values supported by the available AIE OS content.
- Stop on CLI failure and report the failing command and error instead of applying a manual workaround.
