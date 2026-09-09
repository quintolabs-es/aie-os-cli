---
name: setup-project-agent-context
description: Use this skill when the user wants to set up AIE OS, configure agent context, or generate agent instruction files such as AGENTS.md for a project. It gathers missing configuration, runs the AIE OS CLI, and verifies the generated artifacts.
---

# Set Up Project Agent Context

Use this skill when the user wants to configure or generate agent context for a project.

## Outcome

- Configure the target project with AIE OS when needed.
- Generate the agent instructions file (`AGENTS.md`, or `CLAUDE.md` when the target agent is `claude`) through the AIE OS CLI.
- Verify the configuration, canonical context, and agent instructions artifacts.

## Required Input

- target project path
- AIE OS Compose file location
- explicit user-selected configuration choices gathered through a conversational flow for all CLI parameters that will be passed to AIE OS

## Workflow

1. Inspect the target project and available AIE OS content. Use repository evidence only to detect existing values and valid alternatives.
2. Ask for configuration through a conversational sequence, not by presenting a prebuilt command for approval.
3. Ask one short decision at a time unless grouping closely related choices is clearer. For example:
   - ask which persona to use and require exactly one valid persona name;
   - ask which languages apply and require `none`, one valid language name, or multiple valid language names;
   - ask which application types apply and require `none`, one valid application-type name, or multiple valid application-type names;
   - ask which frameworks apply and require `none`, one valid framework name, or multiple valid framework names;
   - ask whether to include the shared skills path and require one of the valid answers such as `yes` or `no`;
   - ask which target agent to use and require exactly one of: `default`, `copilot`, `chatgpt`, `claude`;
   - ask for target project path, Compose file location, knowledge-base path, and agent path when they are not obvious, unusual, or when multiple candidates exist.
4. Every question for a selectable value must list the exact valid response values in the question itself. Phrase it conversationally while keeping the answer space closed. Example: `Which languages will this project use? Answer with none, one, or more than one of: typescript, csharp.`
5. For selectable values, show only valid alternatives discovered from the available AIE OS content. Add a concise recommendation when useful, but clearly label it as a recommendation and never treat it as selected.
6. Accept only answers that unambiguously match the listed values. Ask a follow-up if the answer is ambiguous, unsupported, incomplete, or uses a synonym that cannot be mapped with certainty.
7. After the conversational questions are complete, summarize the selected values in plain language and ask for explicit approval to continue.
8. Do not run `init` or `build` until the user explicitly approves the summarized selections.
9. Confirm the local AIE OS clone contains `docker-compose.yaml`.
10. If `.aie-os/aie-os.json` does not exist, run `docker compose -f aie-os/docker-compose.yaml run --rm aie-os init`. Append the approved `--kb-path`, `--agent-path`, `--agent-persona`, and any approved `--skills-path`, `--languages`, `--application-type`, or `--frameworks` options.
11. If `.aie-os/aie-os.json` exists, preserve it and skip initialization unless the user explicitly requests reconfiguration.
12. Run `docker compose -f aie-os/docker-compose.yaml run --rm aie-os build --target-agent <approved-target-agent>`.
13. Verify `.aie-os/aie-os.json`, `.aie-os/build/effective-context.json`, and a non-empty agent instructions file (`AGENTS.md`, or `CLAUDE.md` when the approved target agent is `claude`).
14. Report the generated artifact paths or the CLI error that prevented completion.

## Rules

- Treat AIE OS as the source of truth and generation engine.
- Do not write, patch, or reconstruct `AGENTS.md` or `.aie-os/build/effective-context.json` directly.
- Do not duplicate AIE OS configuration or rendering logic in the skill.
- Do not overwrite an existing AIE OS configuration without explicit user approval.
- Do not assume configuration values. Always gather selections conversationally and obtain explicit approval before execution.
- Do not ask the user to validate a fully formed command as a substitute for parameter discovery.
- Do not ask open-ended questions for selectable parameters. The question must include the allowed values and the expected cardinality: `none`, exactly one, or one or more.
- Recommendations are allowed, but they must be confirmed by the user as selections before use.
- Use only values supported by the available AIE OS content.
- Stop on CLI failure and report the failing command and error instead of applying a manual workaround.
- Keep questions, alternatives, recommendations, and status messages concise.
