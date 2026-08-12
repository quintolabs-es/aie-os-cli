---
name: setup-project-agent-context
description: Use this skill when the user wants to set up AIE OS, configure agent context, or generate agent instruction files such as AGENTS.md for a project. It gathers missing configuration, runs the AIE OS CLI, and verifies the generated artifacts.
---

# Set Up Project Agent Context

Use this skill when the user wants to configure or generate agent context for a project.

## Outcome

- Configure the target project with AIE OS when needed.
- Generate `AGENTS.md` through the AIE OS CLI.
- Verify the configuration, canonical context, and agent instructions artifacts.

## Required Input

- target project path
- AIE OS Compose file location
- configuration choices that cannot be determined from the project and available AIE OS content

## Workflow

1. Inspect the target project and available AIE OS content. Resolve values already present in repository evidence.
2. Start by asking only for missing required information. Keep each question short and direct.
3. For selectable values, show only the valid alternatives. Add a concise recommendation when useful.
4. Confirm the local AIE OS clone contains `docker-compose.yaml`.
5. If `.aie-os/aie-os.json` does not exist, run `docker compose -f aie-os/docker-compose.yaml run --rm aie-os init`. Append the gathered `--kb-path`, `--agent-path`, `--agent-persona`, and any selected `--skills-path`, `--languages`, `--application-type`, or `--frameworks` options.
6. If `.aie-os/aie-os.json` exists, preserve it and skip initialization unless the user explicitly requests reconfiguration.
7. Run `docker compose -f aie-os/docker-compose.yaml run --rm aie-os build --tool default`.
8. Verify `.aie-os/aie-os.json`, `.aie-os/build/effective-context.json`, and a non-empty `AGENTS.md`.
9. Report the generated artifact paths or the CLI error that prevented completion.

## Rules

- Treat AIE OS as the source of truth and generation engine.
- Do not write, patch, or reconstruct `AGENTS.md` or `.aie-os/build/effective-context.json` directly.
- Do not duplicate AIE OS configuration or rendering logic in the skill.
- Do not overwrite an existing AIE OS configuration without explicit user approval.
- Use only values supported by the available AIE OS content.
- Stop on CLI failure and report the failing command and error instead of applying a manual workaround.
- Keep questions, alternatives, recommendations, and status messages concise.
