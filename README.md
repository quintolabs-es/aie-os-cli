# AIE OS

`AIE OS` is an AI engineering operating system for standardizing reusable
engineering knowledge, reusable agent configuration, and deterministic context
delivery across repositories.

`AIE OS` is the system itself: the model, layers, rules, reusable content, and
build contract for configuring software engineering agents.

The CLI is only the setup and build tool for that system. It scaffolds project
files, assembles effective context, and emits tool-specific delivery artifacts.

## Product Vision

If a developer works across multiple projects, applications, and codebases,
`AIE OS` should help continuously improve agent performance by building the
right context once and reusing it consistently across all projects.

The long-term evolution is to extend the same model from a single developer's
projects to multiple developers and multiple teams, while keeping context
management centralized and deterministic.

## Product North Star

- Author once.
- Compile deterministically.
- Auto-attach by default.
- Validate locally and in CI.
- Enforce centrally when the organization is ready.

## Current Architecture

`AIE OS` has three product parts:

- `knowledge-base/`: reusable engineering knowledge.
- `agent/`: reusable agent configuration.
- `cli/`: context build and tool-specific delivery adapters.

The current precedence model is:

1. Task-specific runtime instructions
2. Repo-specific agent context
3. Engineering principles
4. Core technical standards
5. Language standards
6. Framework standards
7. Response style
8. Persona

Lower-precedence layers may refine earlier layers, but may not contradict or
weaken them.

## Repository Layout

```text
aie-os/
  agent/
  cli/
    src/
    templates/
  knowledge-base/
```

- `knowledge-base/` contains reusable knowledge only: principles and standards.
- `agent/` contains reusable behavior configuration: style and persona.
- `cli/` contains the package-ready TypeScript builder and delivery adapters.

## Current Commands

The first CLI version supports:

- `aie-os init --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base`
- `aie-os build --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base`

`init` scaffolds the repo-local `.ai` files and then runs `build`.

`build` always generates:

- `repo/.ai/agent-context.md`
- `repo/AGENTS.md`

When running the CLI from this repository, the default knowledge-base path is
the sibling `knowledge-base/` directory and the default agent path is the
sibling `agent/` directory.
When the CLI is installed independently, pass `--kb-path` and, if needed,
`--agent-path`, or set `AIE_OS_KB_PATH` and `AIE_OS_AGENT_PATH`.

## Developing The CLI

The CLI lives under `cli/` and is intentionally separate from both the KB and
the reusable agent configuration.

Typical local workflow:

1. `cd cli`
2. `npm install`
3. `npm run build`
4. `node dist/index.js init --tool codex --project-path /path/to/repo`
