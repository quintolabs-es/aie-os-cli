const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const test = require("node:test");
const { createInitFixture } = require("./init-test-helpers");

const execFileAsync = promisify(execFile);
const cliEntry = path.join(__dirname, "..", "dist", "index.js");

test("Init without config args requires a terminal", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry, "init"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stderr,
        /Init requires a terminal when no init configuration arguments are provided\./u,
      );
      return true;
    },
  );
});

test("Init with only --project-path still uses interactive mode", async () => {
  const fixture = await createInitFixture();

  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry, "init", "--project-path", fixture.projectPath]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(
        error.stderr,
        /Init requires a terminal when no init configuration arguments are provided\./u,
      );
      return true;
    },
  );
});

test("Explicit init requires all mandatory options", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry, "init", "--agent-persona", "software-developer"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Missing required option --kb-path\./u);
      assert.doesNotMatch(error.stderr, /prompted interactively/u);
      return true;
    },
  );
});

test("Explicit init succeeds with required args and defaults optional values to empty", async () => {
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

  const manifestPath = path.join(fixture.projectPath, ".aie-os", "aie-os.json");
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  assert.equal(manifest.paths.skills, "");
  assert.deepEqual(manifest.selection.applicationTypes, []);
  assert.deepEqual(manifest.selection.frameworks, []);
  assert.deepEqual(manifest.selection.languages, []);
  assert.equal(manifest.selection.persona, "software-developer");
});

test("Explicit init rejects invalid provided languages", async () => {
  const fixture = await createInitFixture();

  await assert.rejects(
    execFileAsync(process.execPath, [
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
      "invalid-language",
    ]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Unsupported languages: invalid-language/u);
      return true;
    },
  );
});

test("Explicit init rejects invalid optional selections", async () => {
  const fixture = await createInitFixture();

  await assert.rejects(
    execFileAsync(process.execPath, [
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
      "--frameworks",
      "invalid-framework",
    ]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Unsupported frameworks: invalid-framework/u);
      return true;
    },
  );
});
