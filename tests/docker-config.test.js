const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const test = require("node:test");

const repositoryRoot = path.resolve(__dirname, "..");

test("Docker Compose runs the compiled CLI against the mounted target project", async () => {
  const [dockerfile, compose] = await Promise.all([
    fs.readFile(path.join(repositoryRoot, "Dockerfile"), "utf8"),
    fs.readFile(path.join(repositoryRoot, "docker-compose.yaml"), "utf8"),
  ]);

  assert.match(dockerfile, /ENTRYPOINT \["node", "\/opt\/aie-os\/dist\/index\.js"\]/u);
  assert.match(compose, /working_dir: \/workspace/u);
  assert.match(compose, /- \.\.:\/workspace/u);
  assert.match(compose, /stdin_open: true/u);
  assert.match(compose, /tty: true/u);
});
