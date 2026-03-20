import path from "node:path";
import { stdout as output } from "node:process";
import { copyDirectory, writeText } from "../context/filesystem";
import type { AdapterOutput } from "../agentAdapters";

export const agentArtifactWriter = {
  async write(projectPath: string, output: AdapterOutput): Promise<void> {
    if (output.skillAdapterOutput) {
      await Promise.all(
        output.skillAdapterOutput.copies.map((copyItem) =>
          copyDirectory(
            resolveProjectPath(projectPath, copyItem.source),
            resolveProjectPath(projectPath, copyItem.destination),
          ),
        ),
      );
    }

    await Promise.all(
      output.files.map((file) =>
        writeText(path.join(projectPath, file.path), file.contents),
      ),
    );

    if (output.warnings.length > 0) {
      output.warnings.forEach((warning) => {
        outputWrite(`Warning: ${warning}\n`);
      });
    }
  },
};

function resolveProjectPath(projectPath: string, targetPath: string): string {
  if (path.isAbsolute(targetPath)) {
    return targetPath;
  }

  return path.resolve(projectPath, targetPath);
}

function outputWrite(message: string): void {
  output.write(message);
}
