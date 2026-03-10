# AIE OS CLI

`cli/` sets up a target project and builds canonical context plus agent-specific
artifacts from `.aie-os/aie-os.json`.

## Setup

```bash
cd aie-os/cli
npm install
npm run build
```

Or from the target project root:

```bash
bash aie-os/cli/setup.sh
```

## Usage

```bash
mkdir my-new-app
cd my-new-app
git clone <aie-os-repo-url> aie-os
bash aie-os/cli/setup.sh
bash aie-os/cli/init-aie-os.sh
bash aie-os/cli/build-agent-context.sh --tool codex
```

## Commands

```bash
bash aie-os/cli/init-aie-os.sh
bash aie-os/cli/build-agent-context.sh --tool codex
```

- `init-aie-os.sh` prompts for every parameter and writes `.aie-os/aie-os.json`.
- `build-agent-context.sh --tool codex` reads `.aie-os/aie-os.json`,
  generates canonical context files under `.aie-os/build/`, and passes the
  result into the selected adapter.

## Adapter Contract

- Canonical build outputs:
  - `.aie-os/build/effective-context.json`
  - `.aie-os/build/effective-context.md`
- Adapters consume `effective-context.json` as the machine-readable contract.
- Adapters may also use `effective-context.md` as the human-readable rendering.
- Adapters write tool-specific artifacts only.
- The `codex` adapter writes `AGENTS.md`.

## Generated Files

- `repo/.aie-os/build/effective-context.json`
- `repo/.aie-os/build/effective-context.md`
- `repo/AGENTS.md`
