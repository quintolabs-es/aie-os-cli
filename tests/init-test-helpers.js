const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");

async function createInitFixture() {
  const rootPath = await fs.mkdtemp(path.join(os.tmpdir(), "aie-os-init-"));
  const projectPath = path.join(rootPath, "project");
  const sharedPath = path.join(rootPath, "shared");
  const knowledgeBasePath = path.join(sharedPath, "knowledge-base");
  const agentPath = path.join(sharedPath, "agent");

  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-standards", "language", "typescript"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-standards", "application-type", "cli"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-standards", "framework", "react"), {
    recursive: true,
  });
  await fs.mkdir(path.join(agentPath, "persona"), { recursive: true });

  await fs.writeFile(
    path.join(agentPath, "persona", "software-developer.md"),
    "You are a software developer.\n",
  );

  return {
    agentPath,
    knowledgeBasePath,
    projectPath,
    rootPath,
  };
}

module.exports = {
  createInitFixture,
};
