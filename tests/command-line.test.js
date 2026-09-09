const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const {
  parseCommandInput,
  resolveExecutionOptions,
} = require(path.join(__dirname, "..", "dist", "commands", "commandLine.js"));

test("Init defaults are fixed project-local content paths", () => {
  const executionOptions = resolveExecutionOptions(parseCommandInput(["init"]), "/tmp/example-project");

  assert.equal(executionOptions.command, "init");
  assert.deepEqual(executionOptions.defaults, {
    agentPath: "aie-os/content/agent",
    kbPath: "aie-os/content/knowledge-base",
    skillsPath: "aie-os/content/skills",
  });
  assert.equal(executionOptions.mode, "interactive");
});

test("Init defaults stay the same when --project-path is provided", () => {
  const executionOptions = resolveExecutionOptions(
    parseCommandInput(["init", "--project-path", "./nested/project"]),
    "/tmp/workspace",
  );

  assert.equal(executionOptions.command, "init");
  assert.equal(executionOptions.projectPath, "/tmp/workspace/nested/project");
  assert.deepEqual(executionOptions.defaults, {
    agentPath: "aie-os/content/agent",
    kbPath: "aie-os/content/knowledge-base",
    skillsPath: "aie-os/content/skills",
  });
});

test("Build defaults to the default target agent when --target-agent is omitted", () => {
  const executionOptions = resolveExecutionOptions(parseCommandInput(["build"]), "/tmp/example-project");

  assert.equal(executionOptions.command, "build");
  assert.equal(executionOptions.projectPath, "/tmp/example-project");
  assert.equal(executionOptions.targetAgent, "default");
});

test("Build accepts claude, copilot, and chatgpt as target agents", () => {
  for (const targetAgent of ["claude", "copilot", "chatgpt"]) {
    const executionOptions = resolveExecutionOptions(
      parseCommandInput(["build", "--target-agent", targetAgent]),
      "/tmp/example-project",
    );

    assert.equal(executionOptions.targetAgent, targetAgent);
  }
});

test("Build rejects an unsupported target agent", () => {
  assert.throws(
    () => resolveExecutionOptions(parseCommandInput(["build", "--target-agent", "codex"]), "/tmp/example-project"),
    /Unsupported target agent: codex/u,
  );
});

test("Explicit init preserves an explicitly empty knowledge-base path in the execution model", () => {
  const executionOptions = resolveExecutionOptions(
    parseCommandInput([
      "init",
      "--project-path",
      "./nested/project",
      "--kb-path",
      "",
      "--agent-path",
      "content/agent",
      "--agent-persona",
      "software-developer",
    ]),
    "/tmp/workspace",
  );

  assert.equal(executionOptions.command, "init");
  assert.equal(executionOptions.providedPaths.kbPath, "");
});
