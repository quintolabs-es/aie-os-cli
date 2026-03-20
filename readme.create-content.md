
### Create content

AIE OS builds context from three shared sources plus two project-local sources.

#### Knowledge base root (`--kb-path`)

Expected structure

```text
[kb-path]/
  engineering-principles/
    universal/
      *.md
  coding-standards/
    universal/
      *.md
    language/
      <name>/
        *.md
    application-type/
      <name>/
        *.md
    framework/
      <name>/
        *.md
    conditional/
      **/*.md
```

#### Agent root (`--agent-path`)

Expected structure

```text
[agent-path]/
  universal/
    *.md
  persona/
    *.md
```

#### Skills root (`--skills-path`)

Expected structure

```text
[skills-path]/
  <skill-name>/
```

#### Project-local sources in the target project

Expected structure

```text
.aie-os/
  project-coding-standards/
    *.md
  project-skills/
    <skill-name>/
```

Rules:
- `<name>` folder names under `language/`, `application-type/`, and `framework/` are the option names discovered by `init`.
- The available languages are exactly the folder names under `[kb-path]/coding-standards/language/`.
- The available application types are exactly the folder names under `[kb-path]/coding-standards/application-type/`.
- The available frameworks are exactly the folder names under `[kb-path]/coding-standards/framework/`.
- Make discovered option names legible, e.g., `language/csharp/*.md`, `application-type/console/*.md`, etc.
- Shared content should stay reusable across many repositories. Put repo-specific commands and conventions in `.aie-os/project-coding-standards/`.
- An application-type folder may exist only to expose a valid option name to `init`; use `conditional/` when the actual rules depend on a language + application-type combination.
- Universal agent files should hold agent-wide operational rules that apply across all personas.
- Persona files should define both the agent role and the communication style for that persona.
- Skills should follow the Agent Skills packaging specification: https://agentskills.io/specification
- AIE OS integrates skills by folder and does not validate skill internals beyond discovering the skill directory.
- Add concise markdown files only. `README.md` is descriptive and ignored by `build`.
- Project-specific coding standards and skills may override shared ones.
- Shared engineering principles do not have a project-specific override layer.

### How context is built

Build uses a simple file-based contract:

1. render the selected persona from `[agent-path]/persona/<persona>.md`
2. collect every matched `critical-rules.md` file into one top `Critical Rules` section
3. append every other matched markdown file in precedence order
4. ignore every `README.md`

Section labels in the final context are derived from the folder structure where the file is found.

Examples:
- `[kb-path]/engineering-principles/universal/*.md` -> `Engineering Principles`
- `[kb-path]/coding-standards/language/typescript/*.md` -> `Language: typescript`
- `[kb-path]/coding-standards/application-type/api/*.md` -> `Application Type: api`
- `[agent-path]/universal/*.md` -> `Agent Rules`
- `.aie-os/project-coding-standards/*.md` -> `Project Coding Standards`

### Writing files

- Write normal markdown. No in-file schema is required.
- `critical-rules.md` is the only special filename.
- Use `critical-rules.md` only for rules that must always surface at the top of the final agent context.
- Persona files should start with an identity line such as `You are a software developer...`.
- Keep files short, explicit, and easy to scan.
- Prefer bullets and direct wording over narrative explanation.
- If a rule could fit in several places, put it in the most specific valid layer.
- Keep context small. Prefer several short files over one large file.
- Do not depend on markdown headings for behavior. Folder location controls inclusion and final section labeling.

### Conditional coding standards

Use `coding-standards/conditional/` only for advanced cases where one file should apply only when multiple selected dimensions match together.

This is optional. A basic knowledge base does not need it.

Each conditional file must use frontmatter:

```md
---
applies_to:
  languages: [csharp]
  application_types: [api]
  frameworks: [fastendpoints]
---
```

Matching rules:

- Different dimensions are matched with `AND`.
- Multiple values inside the same dimension are matched with `OR`.
- If `applies_to` is missing or empty, the file matches nowhere and must not be included.
- If one dimension is not specified, it does not contribute any match condition.

Examples:

- `languages: [csharp]` and `application_types: [api]`
  - applies only when the selected language includes `csharp` and the selected application type includes `api`
- `frameworks: [react-native, expo]`
  - applies when the selected frameworks include `react-native` or `expo`

Use this for true cross-dimension rules such as:

- defaults for new C# APIs
- rules for TypeScript CLI tools consumed through `bin/<app-name>`
- rules that apply only to TypeScript mobile apps

Do not use `conditional/` for normal language-only, application-type-only, or framework-only rules.
