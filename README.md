# AIE OS

`AIE OS` standardizes reusable engineering knowledge, reusable agent configuration, reusable skills, and deterministic context delivery for coding agents.

## How AIE-OS works
On `init`, it captures the project configuration, including the project path, shared root paths (`kb`, `agent`, `skills`), selected persona, selected languages, selected application types, and selected frameworks.
On `build` it uses init information to collect shared engineering principles, shared coding standards, language/application-type/framework-specific standards from the provided knowledge base, project-specific coding standards and skills, and the selected agent persona to build **one canonical context**. Skills are expected to follow the Agent Skills packaging specification at https://agentskills.io/specification, but AIE OS integrates them by folder rather than validating their internals. Then the selected agent adapter turns that canonical context into agent-specific artifacts such as `AGENTS.md`.

The shared content structure is intentionally simple: add clear, direct, reusable files under the appropriate folders so `init` can discover options from folder names and `build` can resolve them deterministically.

## Usage
Check `readme.getting-started.md`,

## Target project structure
Below the general agent-agnostic structure. Agent specific artefacts are added by the build execution after the effective-context files.
```text
xample-app/
  aie-os/
  .aie-os/
    aie-os.json
    project-coding-standards/
    project-skills/
    build/
      effective-context.json
      effective-context.md
```

- `aie-os/` is the local clone of this repo. ignore it in `.gitignore`.
- `.aie-os/` contains project-local AIE OS configuration and generated artifacts. keep it versioned in the project repo.


## Building Context

- `build` resolves shared knowledge, agent configuration, shared skills, project coding standards, and project skills into one canonical output.
- Skills are represented separately in the canonical context so adapters can integrate them without inlining each skill body.
- Canonical outputs:
  - `.aie-os/build/effective-context.json`
  - `.aie-os/build/effective-context.md`
- `effective-context.json` is the machine-readable adapter contract.
- `effective-context.md` is the human-readable rendering of the resolved context for review and debugging.
- Adapters write tool-specific artifacts only.

## Agent Adapters
- Adapters transform the canonical effective context into the agent-specific files each tool expects.
- `codex` writes `AGENTS.md` at the target project root using the canonical effective context built in `.aie-os/build/effective-context.json` and rendered in `.aie-os/build/effective-context.md`.
- `codex` also snapshots all configured skills under `.aie-os/build/skills/` and renders an `Available Skills` section in `AGENTS.md` with the copied `SKILL.md` paths and usage descriptions.
