# Run Locally

Use the local wrapper at `./bin/aie-os-cli` when developing this repository.

The wrapper executes the compiled CLI from `dist/index.js`. Build the project first:

```bash
pnpm install
pnpm run build
```

The wrapper sets the displayed command name to `aie-os` in help text and errors, but you still invoke it through `./bin/aie-os-cli`.

Run commands from the repository root so relative paths like `./content/knowledge-base` resolve correctly.

## Commands

Show help:

```bash
./bin/aie-os-cli --help
```

Run `init` interactively against a target project:

```bash
./bin/aie-os-cli init --project-path /path/to/target-project
```

Run `init` in explicit mode against a target project using the content in this repository:

```bash
./bin/aie-os-cli init \
  --project-path /path/to/target-project \
  --kb-path ./content/knowledge-base \
  --agent-path ./content/agent \
  --skills-path ./content/skills \
  --agent-persona software-developer \
  --languages typescript \
  --application-type cli
```

Build the effective context and generate Codex artifacts for a target project:

```bash
./bin/aie-os-cli build --tool codex --project-path /path/to/target-project
```

If `./bin/aie-os-cli` reports that the CLI is not built, run `pnpm run build` again.
