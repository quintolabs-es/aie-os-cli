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
  assert.match(stdout, /aie-os build \[options\]/u);
  assert.match(stdout, /--kb-path\s+Knowledge-base path\./u);
  assert.match(stdout, /--skills-path\s+\(optional\) Skills path\./u);
  assert.match(
    stdout,
    /--agent-persona\s+Persona\. Accepted values are markdown file names from \[agent-path\]\/persona without \.md\./u,
  );
  assert.match(
    stdout,
    /--languages\s+\(optional\) Comma-separated language folder names from \[kb-path\]\/coding-rules\/language\./u,
  );
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

test("Build command rejects unsupported target agents", async () => {
  await assert.rejects(
    execFileAsync(process.execPath, [cliEntry, "build", "--target-agent", "codex"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Unsupported target agent: codex/u);
      return true;
    },
  );
});
