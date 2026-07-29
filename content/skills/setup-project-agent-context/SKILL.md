---
name: setup-project-agent-context
description: Use this skill when the user wants to set up AIE OS, configure agent context, or generate agent instruction files such as AGENTS.md for a project. It gathers missing configuration, runs the AIE OS CLI, and verifies the generated artifacts.
---

# Set Up Project Agent Context

Use this skill as a conversational orchestration layer on top of AIE OS when the user wants to configure or generate agent context for a project.

## Outcome

- Configure the target project with AIE OS when needed.
- Generate `AGENTS.md` through the AIE OS CLI.
- Verify the configuration, canonical context, and agent instructions artifacts.

## Required Input

- target project path
- AIE OS Compose file location
- configuration choices that cannot be determined from the project and available AIE OS content

## Workflow

1. Resolve the target project path and confirm the local AIE OS clone contains `docker-compose.yaml`.
2. Inspect the target project and available AIE OS content before asking questions. Do not ask for values that existing configuration or repository evidence already provides.
3. If `.aie-os/aie-os.json` does not exist, discover valid personas, languages, application types, and frameworks from the configured AIE OS content paths. Ask the user only for unresolved required choices.
4. Run AIE OS initialization with `docker compose -f aie-os/docker-compose.yaml run --rm aie-os init`. When choices have already been gathered, append `--kb-path`, `--agent-path`, `--agent-persona`, and any selected `--skills-path`, `--languages`, `--application-type`, or `--frameworks` options.
5. If `.aie-os/aie-os.json` already exists, preserve it and skip initialization unless the user explicitly requests reconfiguration.
6. Run `docker compose -f aie-os/docker-compose.yaml run --rm aie-os build --tool default`.
7. Verify that `.aie-os/aie-os.json`, `.aie-os/build/effective-context.json`, and `AGENTS.md` exist under the target project and that `AGENTS.md` is non-empty.
8. Report the generated artifact paths and any CLI error that prevents completion.

## Rules

- Treat AIE OS as the source of truth and generation engine.
- Do not write, patch, or reconstruct `AGENTS.md` or `.aie-os/build/effective-context.json` directly.
- Do not duplicate AIE OS configuration or rendering logic in the skill.
- Do not overwrite an existing AIE OS configuration without explicit user approval.
- Use only values supported by the available AIE OS content.
- Stop on CLI failure and report the failing command and error instead of applying a manual workaround.
