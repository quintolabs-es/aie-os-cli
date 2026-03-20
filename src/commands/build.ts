import path from "node:path";
import { stdout as output } from "node:process";
import { getAdapter } from "../agentAdapters";
import { agentArtifactWriter } from "../artifacts/agentArtifactWriter";
import { aieRelativePaths } from "../context/aieStructure";
import { buildAgentContext } from "../context/build";
import { fileExists, writeText } from "../context/filesystem";
import { loadManifest } from "../context/manifest";
import { terminalStyle } from "./terminalStyle";
import type { BuildExecutionOptions } from "./types";

const ansi = {
  bold: "\u001B[1m",
  cyan: "\u001B[36m",
  dim: "\u001B[2m",
  green: "\u001B[32m",
  reset: "\u001B[0m",
  yellow: "\u001B[33m",
} as const;

export async function buildProject(options: BuildExecutionOptions): Promise<void> {
  await ensureProjectDirectory(options.projectPath);

  const manifestPath = path.join(options.projectPath, aieRelativePaths.manifestFile);
  if (!(await fileExists(manifestPath))) {
    throw new Error(`Missing manifest: ${manifestPath}. Run "init" from the target project first.`);
  }

  const manifest = await loadManifest(manifestPath);
  const buildOutput = await buildAgentContext({
    manifest,
    projectPath: options.projectPath,
    tool: options.tool,
  });
  const adapter = getAdapter(options.tool);
  const adapterOutput = await adapter.build({
    effectiveContext: buildOutput.effectiveContext,
    projectPath: options.projectPath,
  });

  await writeText(
    path.join(options.projectPath, aieRelativePaths.effectiveContextFile),
    `${JSON.stringify(buildOutput.effectiveContext, null, 2)}\n`,
  );
  await agentArtifactWriter.write(options.projectPath, adapterOutput);

  const buildCompleteBox = terminalStyle.promptHeaderBox(
    `Build complete. Generated canonical context file ${aieRelativePaths.effectiveContextFile} and ${adapterOutput.primaryArtifact}.`,
  );

  output.write(
    [
      "",
      ...buildCompleteBox,
      "",
      `${ansi.bold}${ansi.cyan}Bootstrap prompt${ansi.reset}`,
      "Use this first prompt in the next agent session to make sure the agent reloads and follows the instructions from the context you just built.",
      "",
      `${ansi.yellow}${adapterOutput.bootstrapPrompt}${ansi.reset}`,
      "",
    ].join("\n"),
  );
}

async function ensureProjectDirectory(projectPath: string): Promise<void> {
  await ensureDirectoryType(projectPath, "Project path");
}

async function ensureDirectoryType(directoryPath: string, label: string): Promise<void> {
  const fs = await import("node:fs/promises");
  let stats;

  try {
    stats = await fs.stat(directoryPath);
  } catch {
    throw new Error(`${label} does not exist: ${directoryPath}`);
  }

  if (!stats.isDirectory()) {
    throw new Error(`${label} is not a directory: ${directoryPath}`);
  }
}
