
### Create content
Use [`/content`](../content) folder as the starting point for shared principles, rules, skills, and personas. Add new content or update the existing files and folders as needed.
See [`docs/readme.create-content.md`](./readme.create-content.md) for the content structure and authoring rules.

### Clone `aie-os` into the target project
The repo also includes a ready-to-use [`/content`](../content) folder for getting started.
```bash
cd xample-app
git clone https://github.com/quintolabs-es/aie-os
```
Then build
```bash
docker compose -f aie-os/docker-compose.yaml build

# OR catch up with latest
git -C aie-os pull origin main
docker compose -f aie-os/docker-compose.yaml build
```

**Make sure to gnore `aie-os` in `.gitignore`.**

### Initialize AIE OS
The commands below assume the local clone workflow.

```bash
cd xample-app

# interactive
docker compose -f aie-os/docker-compose.yaml run --rm aie-os init

# OR explicit
docker compose -f aie-os/docker-compose.yaml run --rm aie-os init \
  --kb-path <value> \
  --agent-path <value> \
  --agent-persona <value> \
  [--languages <value1,value2>] \
  [--application-type <value1,value2>] \
  [--frameworks <value1,value2>] \
  [--skills-path <value>] \
```

#### `init` command options:
* `--project-path /path/to/app/project/dir`: optional, defaults to current directory;
* `--kb-path /path/to/knowledge-base/dir`: required in explicit mode; prompted in interactive mode;
* `--agent-path /path/to/agent/dir`: required in explicit mode; prompted in interactive mode;
* `--skills-path /path/to/skills/dir`: optional, empty disables shared skills;
* `--agent-persona <name>`: required in explicit mode; prompted in interactive mode. Available values come from markdown file names under `[agent-path]/persona/`;
* `--languages <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-rules/language/`;
* `--application-type <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-rules/application-type/`;
* `--frameworks <name1,name2>`: optional. Available values come from folder names under `[kb-path]/coding-rules/framework/`.

`init` modes:
- no init config arguments: interactive mode
- any init config argument (`--kb-path`, `--agent-path`, `--skills-path`, `--agent-persona`, `--languages`, `--application-type`, `--frameworks`): explicit mode
- `--project-path` alone does not switch `init` to explicit mode
- in explicit mode, omitted optional values become empty/unset and `init` does not prompt

### Build agent context.
Build context and generate the adapter artifacts. `build` targets the `default` adapter when `--target-agent` is omitted.
```bash
docker compose -f aie-os/docker-compose.yaml run --rm aie-os build [--project-path <value>] [--target-agent default]
```
* `--target-agent`: optional. Defaults to `default`. Supported values: `default`, `copilot`, `chatgpt` (write `AGENTS.md`), `claude` (writes `CLAUDE.md`).
* `--project-path /path/to/project` optional, defaults to current directory.
