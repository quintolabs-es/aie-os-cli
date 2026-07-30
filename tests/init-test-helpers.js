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
  await fs.mkdir(path.join(agentPath, "universal"), { recursive: true });
  await fs.mkdir(path.join(knowledgeBasePath, "engineering-principles", "universal"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-rules", "universal"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-rules", "language", "typescript"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-rules", "application-type"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-rules", "framework"), {
    recursive: true,
  });
  await fs.mkdir(path.join(knowledgeBasePath, "coding-rules", "conditional"), {
    recursive: true,
  });
  await fs.mkdir(path.join(agentPath, "persona"), { recursive: true });

  await fs.writeFile(
    path.join(agentPath, "persona", "software-developer.md"),
    "You are a software developer.\n",
  );
  await fs.writeFile(
    path.join(knowledgeBasePath, "coding-rules", "application-type", "cli.md"),
    "- Keep CLI commands composable.\n",
  );
  await fs.writeFile(
    path.join(knowledgeBasePath, "coding-rules", "framework", "react.md"),
    "- Keep React components focused.\n",
  );
  await fs.writeFile(
    path.join(knowledgeBasePath, "coding-rules", "conditional", "cli-typescript.md"),
    `---
applies_to:
  application_types: [cli]
  languages: [typescript]
---

- Conditional CLI TypeScript rule.
`,
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
