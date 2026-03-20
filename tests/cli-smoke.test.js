const assert = require("node:assert/strict");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const test = require("node:test");

const execFileAsync = promisify(execFile);
const cliEntry = path.join(__dirname, "..", "dist", "index.js");

test("CLI help command prints usage text", async () => {
  const { stdout, stderr } = await execFileAsync(process.execPath, [cliEntry, "--help"]);

  assert.equal(stderr, "");
  assert.match(stdout, /^AIE OS\r?\n/u);
  assert.match(stdout, /Usage:\r?\n/u);
  assert.match(stdout, /aie-os-cli build --tool codex/u);
});

test("CLI without a command shows a command-required error and help", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /You must specify a command\./u);
      assert.match(error.stdout, /Usage:/u);
      return true;
    },
  );
});

test("Build command requires --tool", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry, "build"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Missing required option --tool/u);
      return true;
    },
  );
});
