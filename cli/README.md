# AIE OS CLI

`aie-os-cli` builds deterministic agent context from external knowledge,
agent-configuration, and skills sources, then projects it into tool-specific
delivery adapters.

## Scope

- The package contains CLI code only.
- The KB is always external to the package.
- The agent configuration is always external to the package.
- Global skills are always external to the package.
- Project-specific skills live in the target repository under `.ai/skills/`.
- When developing inside the `aie-os` repository, the CLI defaults to the
  sibling `../knowledge-base`, `../agent`, and `../skills` directories after
  compilation.
- When installed independently, pass `--kb-path` and optionally
  `--agent-path` and `--skills-path`, or set `AIE_OS_KB_PATH`,
  `AIE_OS_AGENT_PATH`, and `AIE_OS_SKILLS_PATH`.

## Commands

```bash
aie-os init --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base --skills-path /path/to/skills
aie-os build --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base --skills-path /path/to/skills
```

If `agent/` or `skills/` are not next to the selected KB, also pass
`--agent-path` and `--skills-path`.

## Generated Files

- `repo/.ai/agent-context.md`
- `repo/AGENTS.md`
