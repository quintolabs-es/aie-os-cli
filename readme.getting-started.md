### First time setup aie-os cli
```bash
cd xample-app
git clone https://github.com/bustroker/aie-os
npm --prefix aie-os/cli run build
```
### Create content
Check `readme.create-content.md` for instructions on how to add principles, standards, skills, agent universal rules, and agent personas.

### Initialize AIE-OS
```bash
cd xample-app
bash aie-os/bin/aie-os init
```

If all options are provided, `init` runs without prompting.

#### Command `bash aie-os/bin/aie-os init` takes options:
* `--project-path /path/to/app/project/dir`: optional, defaults to current directory;
* `--kb-path /path/to/knowledge-base/dir`: optional, prompted if not provided;
* `--agent-path /path/to/agent/dir`: optional, prompted if not provided;
* `--skills-path /path/to/skills/dir`: optional, prompted if not provided.
* `--agent-persona <name>`: optional, prompted if not provided. Available values come from markdown file names under `[agent-path]/persona/`.
* `--languages <name1,name2>`: optional, prompted if not provided. Available values come from folder names under `[kb-path]/coding-standards/language/`.
* `--application-type <name1,name2>`: optional, prompted if not provided. Available values come from folder names under `[kb-path]/coding-standards/application-type/`.
* `--frameworks <name1,name2>`: optional, prompted if not provided. Available values come from folder names under `[kb-path]/coding-standards/framework/`.

E.g.
```bash
bash ./bin/aie-os init \
  --project-path ./xample-app \
  --kb-path ./content/knowledge-base \
  --agent-path ./content/agent \
  --skills-path ./content/skills \
  --agent-persona software-developer \
  --languages csharp,typescript \
  --application-type api,mobile \
  --frameworks react-native
```

### Build agent context.
```bash
cd xample-app
bash aie-os/bin/aie-os build --tool codex
```
* `--tool`: mandatory. Accepts `codex`. More adapters can be added.
* `--project-path /path/to/project` optional, defaults to current directory.

### Bootstrap agent sessions

After building the agent context, use `aie-os/bootstrap-promps.agents.md` as the first prompt in a new agent session so the agent reloads and follows the generated repository instructions from `AGENTS.md` before starting task work.

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
- `.aie-os/build/effective-context.md`
- `.aie-os/build/skills/`
- agent-specific generated artefacts (e.g. `AGENTS.md`)

For `--tool codex`:
- AIE OS indexes all shared and project skills in `AGENTS.md`
- each skill entry includes the skill name, copied `SKILL.md` path, and usage description
- shared and project skills are copied into `.aie-os/build/skills/` so `AGENTS.md` references only project-local paths
