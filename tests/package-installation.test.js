const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const test = require("node:test");

const execFileAsync = promisify(execFile);
const repoRoot = path.join(__dirname, "..");

test("Package metadata exposes the installed aie-os-cli command", async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(repoRoot, "package.json"), "utf8"),
  );

  assert.deepEqual(packageJson.bin, {
    "aie-os-cli": "./dist/index.js",
  });
  assert.equal(packageJson.scripts.compile, "tsc -p tsconfig.json");
  assert.equal(packageJson.scripts.build, "pnpm install && pnpm compile");
  assert.equal(packageJson.scripts.prepare, "pnpm compile");
});

test("Packed install exposes pnpm aie-os-cli", async () => {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "aie-os-package-"));
  const consumerPath = path.join(rootPath, "consumer");
  const npmCachePath = path.join(rootPath, ".npm-cache");

  await fs.mkdir(consumerPath, { recursive: true });
  await fs.mkdir(npmCachePath, { recursive: true });
  await fs.writeFile(
    path.join(consumerPath, "package.json"),
    JSON.stringify(
      {
        name: "aie-os-package-consumer",
        private: true,
        version: "1.0.0",
      },
      null,
      2,
    ),
  );

  await execFileAsync("npm", ["pack", "--pack-destination", rootPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      npm_config_cache: npmCachePath,
    },
    maxBuffer: 10 * 1024 * 1024,
  });

  const tarballs = (await fs.readdir(rootPath)).filter((entry) => entry.endsWith(".tgz"));
  assert.equal(tarballs.length, 1);

  await execFileAsync("pnpm", ["add", "-D", path.join(rootPath, tarballs[0])], {
    cwd: consumerPath,
    maxBuffer: 10 * 1024 * 1024,
  });

  const { stdout, stderr } = await execFileAsync("pnpm", ["aie-os-cli", "--help"], {
    cwd: consumerPath,
    maxBuffer: 10 * 1024 * 1024,
  });

  assert.equal(stderr, "");
  assert.match(stdout, /^AIE OS\r?\n/u);
  assert.match(stdout, /aie-os-cli build --tool codex/u);
});
