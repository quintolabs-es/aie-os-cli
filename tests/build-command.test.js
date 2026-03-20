const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const test = require("node:test");
const { createInitFixture } = require("./init-test-helpers");

const execFileAsync = promisify(execFile);
const cliEntry = path.join(__dirname, "..", "dist", "index.js");
const ansiPattern = /\u001B\[[0-9;]*m/gu;

test("Build prints the codex bootstrap prompt after a successful build", async () => {
  const fixture = await createInitFixture();

  await execFileAsync(process.execPath, [
    cliEntry,
    "init",
    "--project-path",
    fixture.projectPath,
    "--kb-path",
    fixture.knowledgeBasePath,
    "--agent-path",
    fixture.agentPath,
    "--agent-persona",
    "software-developer",
  ]);

  const { stderr, stdout } = await execFileAsync(process.execPath, [
    cliEntry,
    "build",
    "--tool",
    "codex",
    "--project-path",
    fixture.projectPath,
  ]);
  const normalizedStdout = stdout.replace(ansiPattern, "");

  assert.equal(stderr, "");
  assert.match(
    normalizedStdout,
    /┌─+┐/u,
  );
  assert.match(
    normalizedStdout,
    /│ Build complete\. Generated \.aie-os\/build\/effective-context\.json and AGENTS\.md\. │/u,
  );
  assert.match(
    normalizedStdout,
    /└─+┘/u,
  );
  assert.match(normalizedStdout, /Bootstrap prompt/u);
  assert.match(
    normalizedStdout,
    /Use this first prompt in the next agent session to make sure the agent reloads and follows the instructions from the context you just built\./u,
  );
  assert.match(
    normalizedStdout,
    /Read `AGENTS\.md` at the repo root and treat it as the authoritative instruction set/u,
  );
  assert.match(
    normalizedStdout,
    /reload `AGENTS\.md` from disk before continuing instead of relying on memory\./u,
  );

  await fs.access(path.join(fixture.projectPath, "AGENTS.md"));
  await fs.access(path.join(fixture.projectPath, ".aie-os", "build", "effective-context.json"));
});
