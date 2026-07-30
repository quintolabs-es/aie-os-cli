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

test("Build uses the default adapter and prints the bootstrap prompt after a successful build", async () => {
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
    /│ Build complete\. Generated canonical context file \.aie-os[\\/]build[\\/]effective-context\.json and AGENTS\.md\. │/u,
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

test("Build keeps Conditional Rules in effective context but merges them into Coding Rules in AGENTS output", async () => {
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
    "--languages",
    "typescript",
    "--application-type",
    "cli",
  ]);

  await execFileAsync(process.execPath, [
    cliEntry,
    "build",
    "--project-path",
    fixture.projectPath,
  ]);

  const effectiveContext = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectPath, ".aie-os", "build", "effective-context.json"),
      "utf8",
    ),
  );
  const agentsContents = await fs.readFile(
    path.join(fixture.projectPath, "AGENTS.md"),
    "utf8",
  );

  assert.equal(
    effectiveContext.sections.some((section) =>
      section.sectionLabel === "Conditional Rules" &&
      section.content.includes("Conditional CLI TypeScript rule.")),
    true,
  );
  assert.doesNotMatch(agentsContents, /^## Conditional Rules$/mu);
  assert.match(agentsContents, /^## Coding Rules$/mu);
  assert.match(agentsContents, /Conditional CLI TypeScript rule\./u);
});

test("Build loads selected application-type and framework Markdown files", async () => {
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
    "--application-type",
    "cli",
    "--frameworks",
    "react",
  ]);

  await execFileAsync(process.execPath, [
    cliEntry,
    "build",
    "--project-path",
    fixture.projectPath,
  ]);

  const effectiveContext = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectPath, ".aie-os", "build", "effective-context.json"),
      "utf8",
    ),
  );

  assert.equal(
    effectiveContext.sections.some((section) =>
      section.sectionLabel === "Application Type: cli" &&
      section.content.includes("Keep CLI commands composable.")),
    true,
  );
  assert.equal(
    effectiveContext.sections.some((section) =>
      section.sectionLabel === "Framework: react" &&
      section.content.includes("Keep React components focused.")),
    true,
  );
});

test("Build succeeds when the knowledge-base layer is disabled", async () => {
  const fixture = await createInitFixture();

  await execFileAsync(process.execPath, [
    cliEntry,
    "init",
    "--project-path",
    fixture.projectPath,
    "--kb-path",
    "",
    "--agent-path",
    fixture.agentPath,
    "--agent-persona",
    "software-developer",
  ]);

  await execFileAsync(process.execPath, [
    cliEntry,
    "build",
    "--project-path",
    fixture.projectPath,
  ]);

  const effectiveContext = JSON.parse(
    await fs.readFile(
      path.join(fixture.projectPath, ".aie-os", "build", "effective-context.json"),
      "utf8",
    ),
  );

  assert.equal(effectiveContext.persona.source, path.join(fixture.agentPath, "persona", "software-developer.md"));
  assert.equal(
    effectiveContext.sections.some((section) =>
      section.layer === "Engineering Principles" ||
      section.layer === "Shared Coding Rules" ||
      section.layer === "Language Rules" ||
      section.layer === "Application-Type Rules" ||
      section.layer === "Framework Rules" ||
      section.layer === "Conditional Coding Rules"),
    false,
  );
});
