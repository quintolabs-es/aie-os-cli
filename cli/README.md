# AIE OS CLI

`aie-os-cli` builds deterministic agent context from external knowledge and
agent-configuration sources, then projects it into tool-specific delivery
adapters.

## Scope

- The package contains CLI code only.
- The KB is always external to the package.
- The agent configuration is always external to the package.
- When developing inside the `aie-os` repository, the CLI defaults to the
  sibling `../knowledge-base` and `../agent` directories after compilation.
- When installed independently, pass `--kb-path` and optionally
  `--agent-path`, or set `AIE_OS_KB_PATH` and `AIE_OS_AGENT_PATH`.

## Commands

```bash
aie-os init --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base
aie-os build --tool codex --project-path /path/to/repo --kb-path /path/to/knowledge-base
```

If `agent/` is not next to the selected KB, also pass `--agent-path`.

## Generated Files

- `repo/.ai/agent-context.md`
- `repo/AGENTS.md`
