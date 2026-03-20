import { aieStructure } from "../context/aieStructure";

const { criticalRulesFileName, readmeFileName, skillFileName } = aieStructure.files;
const { directoryName: projectDirectoryName, projectSkillsDirectoryName } = aieStructure.project;

export const projectCodingStandardsReadmeTemplate = `# Project Coding Standards

Add repo-specific markdown files here.

- \`${criticalRulesFileName}\` is lifted into the top \`Critical Rules\` section.
- Any other \`*.md\` file is appended under \`Project Coding Standards\`.
- \`${readmeFileName}\` is ignored by build.

## \`${criticalRulesFileName}\`

\`\`\`md
- Confirm backward-incompatible changes before implementing them.
- Keep externally visible behavior explicit when this repo changes public contracts.
\`\`\`

## \`repo-rules.md\`

\`\`\`md
- Keep feature-specific code close together in this repo.
- Prefer small adapters around external services used by this repo.
\`\`\`
`;

export const projectSkillsReadmeTemplate = `# Project Skills

Add repo-specific skills here.

- Each skill is a folder, not a single markdown file.
- Each skill folder must contain \`${skillFileName}\`.
- Skills must follow the Agent Skills packaging specification:
  https://agentskills.io/specification
- Skills are copied to the project \`${projectDirectoryName}\` folder and referenced in the aggregated context file.
- \`${readmeFileName}\` is ignored by build.

Example:

\`\`\`text
${projectSkillsDirectoryName}/
  add-endpoint/
    ${skillFileName}
\`\`\`
`;
