# Print Adapter-Specific Bootstrap Prompt After Build

## Summary

Add a new adapter-owned `bootstrapPrompt` output so `build` can print an agent-specific prompt immediately after a successful build. For codex, keep the supplied prompt text verbatim except for replacing the hardcoded `AGENTS.md` references with a single adapter-local filename variable. Remove the standalone bootstrap prompt file so the adapter becomes the only source of truth.

## Public Interface Changes

- Update `src/agentAdapters/types.ts` to add a required `bootstrapPrompt: string` field to `AdapterOutput`.
- Do not change the canonical effective context schema.
- Do not add or change CLI flags.

## Implementation Plan

### 1. Extend the adapter contract

- In `src/agentAdapters/types.ts`, add `bootstrapPrompt: string` to `AdapterOutput`.
- Keep the prompt on the adapter output, not on the build command, so each adapter owns its own bootstrap instructions.

### 2. Move the codex prompt into the codex adapter

- In `src/agentAdapters/codexAdapter.ts`, introduce one filename constant, for example `instructionsFileName = "AGENTS.md"`.
- Reuse that same constant for:
  - the generated file path
  - `primaryArtifact`
  - the rendered bootstrap prompt text
- Add a small local renderer such as `renderBootstrapPrompt(instructionsFileName: string): string` that returns the exact codex prompt supplied by the user, with the filename interpolated from the variable.

### 3. Print the prompt after a successful build

- In `src/commands/build.ts`, keep the existing success message.
- Immediately after that success message, print a readable labeled section with the adapter's `bootstrapPrompt`.
- Print it only after:
  - `effective-context.json` is written
  - the legacy markdown file is removed
  - adapter artifacts are written successfully
- Keep warnings behavior unchanged.

### 4. Remove the duplicate prompt source and update docs

- Delete `bootstrap-prompt.md` so the codex adapter is the only authoritative source for that prompt.
- Update `docs/readme.getting-started.md` to say that `build` now prints the agent-specific bootstrap prompt after generation, instead of telling users to read a checked-in prompt file.
- Update `docs/readme.add-adapter.md` to document that adapters must return `bootstrapPrompt` along with their generated artifacts.
- Optionally add one short note in `README.md` that `build` prints an adapter-specific session bootstrap prompt.

## Test Cases And Scenarios

- Add a focused regression test in `tests/build-command.test.js`.
- Test scenario:
  - create a fixture with `tests/init-test-helpers.js`
  - run `init` with explicit arguments
  - run `build --tool codex`
  - assert `stderr` is empty
  - assert `stdout` still includes the build completion line
  - assert `stdout` includes the codex bootstrap prompt text
  - assert the prompt references `AGENTS.md`
  - assert the generated `AGENTS.md` file exists in the fixture project root
- Run `pnpm test` as final verification.

## Assumptions And Defaults

- Implement the codex prompt exactly as supplied by the user, except replacing hardcoded `AGENTS.md` references with a single filename variable in the adapter.
- The prompt is printed to stdout only on successful build completion.
- No `--quiet` or suppression flag is added in this change.
- The adapter remains the only place that knows the agent-specific bootstrap prompt.
- Removing `bootstrap-prompt.md` is preferred to avoid drift between the adapter and a duplicate checked-in file.
