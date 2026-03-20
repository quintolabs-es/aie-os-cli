### Install `aie-os-cli` package as dev dependency
```bash
cd xample-app
pnpm add -D github:quintolabs-es/aie-os-cli#<ref>
pnpm aie-os-cli init [--project-path <value>]
pnpm aie-os-cli init [--project-path <value>] --kb-path <value> --agent-path <value> --agent-persona <value> [--languages <value1,value2>] [--application-type <value1,value2>] [--frameworks <value1,value2>] [--skills-path <value>]
pnpm aie-os-cli build --tool codex [--project-path <value>]
```

### Clone the `aie-os-cli` repo and use it locally
```bash
cd xample-app
git clone https://github.com/quintolabs-es/aie-os-cli aie-os
pnpm --dir aie-os run build
bash aie-os/bin/aie-os init [--project-path <value>]
bash aie-os/bin/aie-os init [--project-path <value>] --kb-path <value> --agent-path <value> --agent-persona <value> [--languages <value1,value2>] [--application-type <value1,value2>] [--frameworks <value1,value2>] [--skills-path <value>]
bash aie-os/bin/aie-os build --tool codex [--project-path <value>]
```

**Add `aie-os/` to `.gitignore` only for the local-clone workflow.**

### Create content
Use `/content` as the starting point for shared principles, standards, skills, and personas. Add new content or update the existing files and folders as needed. See `docs/readme.create-content.md` for the content structure and authoring rules.

### Initialize AIE-OS

```bash
pnpm aie-os-cli init [--project-path <value>]
pnpm aie-os-cli init [--project-path <value>] --kb-path <value> --agent-path <value> --agent-persona <value> [--languages <value1,value2>] [--application-type <value1,value2>] [--frameworks <value1,value2>] [--skills-path <value>]
bash aie-os/bin/aie-os init [--project-path <value>]
bash aie-os/bin/aie-os init [--project-path <value>] --kb-path <value> --agent-path <value> --agent-persona <value> [--languages <value1,value2>] [--application-type <value1,value2>] [--frameworks <value1,value2>] [--skills-path <value>]
```

#### `init` takes options:
* `--project-path /path/to/app/project/dir`: optional, defaults to current directory;
* `--kb-path /path/to/knowledge-base/dir`: required in explicit mode; prompted in interactive mode;
* `--agent-path /path/to/agent/dir`: required in explicit mode; prompted in interactive mode;
* `--skills-path /path/to/skills/dir`: optional, empty disables shared skills;
* `--agent-persona <name>`: required in explicit mode; prompted in interactive mode. Available values come from markdown file names under `[agent-path]/persona/`;
* `--languages <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-standards/language/`;
* `--application-type <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-standards/application-type/`;
* `--frameworks <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-standards/framework/`.

`init` modes:
- no init config arguments: interactive mode
- any init config argument (`--kb-path`, `--agent-path`, `--skills-path`, `--agent-persona`, `--languages`, `--application-type`, `--frameworks`): explicit mode
- `--project-path` alone does not switch `init` to explicit mode
- in explicit mode, omitted optional values become empty/unset and `init` does not prompt

E.g.
```bash
pnpm aie-os-cli init \
  --project-path ./xample-app \
  --kb-path ./content/knowledge-base \
  --agent-path ./content/agent \
  --skills-path ./content/skills \
  --agent-persona software-developer \
  --application-type api,mobile \
  --frameworks react-native
```

### Build agent context.
```bash
pnpm aie-os-cli build --tool codex
bash aie-os/bin/aie-os build --tool codex
```
* `--tool`: mandatory. Accepts `codex`. More adapters can be added.
* `--project-path /path/to/project` optional, defaults to current directory.

### Bootstrap agent sessions

For the local-clone workflow, use `aie-os/bootstrap-prompt.md` as the first prompt in a new agent session so the agent reloads and follows the generated repository instructions from `AGENTS.md` before starting task work.

### Ignore AIE OS tool

Do not commit the local `aie-os/` clone inside the target project. Add the local `aie-os/` clone to the target project's `.gitignore`.

```gitignore
aie-os/
```

### What is added to the app project repository

Commit to the target project repository:
- `.aie-os/aie-os.json`
- `.aie-os/project-coding-standards/`
- `.aie-os/project-skills/`
- `.aie-os/build/effective-context.json`
- `.aie-os/build/skills/`
- agent-specific generated artefacts (e.g. `AGENTS.md`)

For `--tool codex`:
- AIE OS indexes all shared and project skills in `AGENTS.md`
- each skill entry includes the skill name, copied `SKILL.md` path, and usage description
- shared and project skills are copied into `.aie-os/build/skills/` so `AGENTS.md` references only project-local paths
