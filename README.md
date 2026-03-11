# AIE OS

`AIE OS` standardizes reusable engineering knowledge, reusable agent configuration, reusable skills, and deterministic context delivery for coding agents.

`init` captures the project configuration. `build` uses shared engineering principles, shared coding standards, language/application-type/framework-specific standards from the provided knowledge base, project-specific coding standards and skills, and agent persona/style to build one canonical context. Then the selected agent adapter turns that canonical context into agent-specific artifacts such as `AGENTS.md`.

The shared content structure is intentionally simple: add clear, direct, reusable files under the appropriate folders so `init` can discover options from folder names and `build` can resolve them deterministically.

## Usage
### Setup cli

```bash
cd xample-app
git clone <aie-os-repo-url> aie-os
npm --prefix aie-os/cli run build
```

### Create content

- Shared content lives under:
  - `content/knowledge-base/engineering-principles/universal/`
  - `content/knowledge-base/coding-standards/universal/`
  - `content/knowledge-base/coding-standards/language/<name>/`
  - `content/knowledge-base/coding-standards/application-type/<name>/`
  - `content/knowledge-base/coding-standards/framework/<name>/`
  - `content/agent/persona/`
  - `content/agent/style/`
  - `content/skills/`
- Project-specific content lives under:
  - `.aie-os/project-coding-standards/`
  - `.aie-os/project-skills/`
- Folder names define discovered option names for `init`.
- Add concise markdown files only. `README.md` is descriptive and ignored by `build`.
- Project-specific coding standards and skills may override shared ones. Shared engineering principles do not have a project-specific override layer.

### Build agent specific context

```bash
cd xample-app
bash aie-os/bin/aie-os init --project-path /defaults/to/cwd
bash aie-os/bin/aie-os build --tool codex --project-path /defaults/to/cwd
```

#### Command `bash aie-os/bin/aie-os init` takes options:
* `--project-path /path/to/app/project/dir`: optiona, defaults to current directory;
* `--kb-path /path/to/knowledge-base/dir`: optiona, prompted if not provided;
* `--agent-path /path/to/agent/dir`: optiona, prompted if not provided;
* `--skills-path /path/to/skills/dir`: optiona, prompted if not provided.

**Other options prompted**
- `persona` options come from folder/file names under `content/agent/persona/`.
- `style` options come from folder/file names under `content/agent/style/`.
- `language` options come from folder names under `content/knowledge-base/coding-standards/language/`.
- `application type` options come from folder names under `content/knowledge-base/coding-standards/application-type/`.
- `framework` options come from folder names under `content/knowledge-base/coding-standards/framework/`.
- The selected option value is the same name used by `build` to resolve the corresponding folder or file.


#### Command `bash aie-os/bin/aie-os build` takes options:
* `--tool`: mandatory. accepts `codex`.
* `--project-path /path/to/project` optional, defaults to current directory.

## AIE-OS project structure

```text
aie-os/
  content/
    knowledge-base/
      engineering-principles/
        universal/
      coding-standards/
        universal/
        language/
        application-type/
        framework/
    agent/
      style/
      persona/
    skills/
  bin/
  cli/
```

- `content/knowledge-base/` holds shared engineering principles and coding standards.
- `content/agent/` holds shared style and persona definitions.
- `content/skills/` holds shared skills.
- `bin/` holds the local CLI wrapper.
- `cli/` contains the CLI implementation.

## AIE-OS project structure
Below the general agent-agnostic structure. Agent specific artefacts would be added by the build execution, after effective-context files.
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

- `aie-os/` is the local clone of this repo.
- `.aie-os/` contains project-local AIE OS configuration and generated artifacts.


## Building Context

- `build` resolves shared knowledge, agent configuration, shared skills, project coding standards, and project skills into one canonical output.
- Canonical outputs:
  - `.aie-os/build/effective-context.json`
  - `.aie-os/build/effective-context.md`
- Adapters consume `effective-context.json` as the machine-readable contract and may also use `effective-context.md`.
- Adapters write tool-specific artifacts only.

## Agent Adapters

- `codex` writes `AGENTS.md` at the target project root using the canonical effective context built in `.aie-os/build/effective-context.json` and rendered in `.aie-os/build/effective-context.md`.
