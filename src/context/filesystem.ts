import fs from "node:fs/promises";
import path from "node:path";
import { aieStructure } from "./aieStructure";

export async function ensureDirectory(directoryPath: string): Promise<void> {
  await fs.mkdir(directoryPath, {
    recursive: true,
  });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readText(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    throw new Error(`Unable to read file: ${filePath}`);
  }
}

export async function writeText(filePath: string, contents: string): Promise<void> {
  await ensureDirectory(path.dirname(filePath));
  await fs.writeFile(filePath, contents, "utf8");
}

export async function copyDirectory(sourcePath: string, destinationPath: string): Promise<void> {
  await ensureDirectory(path.dirname(destinationPath));
  await fs.rm(destinationPath, {
    force: true,
    recursive: true,
  });
  await fs.cp(sourcePath, destinationPath, {
    force: true,
    recursive: true,
  });
}

export async function listDirectoryNames(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function listMarkdownBasenames(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  return entries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(aieStructure.files.markdownExtension) &&
        entry.name !== aieStructure.files.readmeFileName,
    )
    .map((entry) =>
      entry.name.replace(
        new RegExp(`${aieStructure.files.markdownExtension.replace(".", "\\.")}$`, "u"),
        "",
      ),
    )
    .sort();
}

export async function listMarkdownFiles(directoryPath: string): Promise<string[]> {
  const entries = await fs.readdir(directoryPath, {
    withFileTypes: true,
  });

  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        return listMarkdownFiles(entryPath);
      }

      if (
        entry.isFile() &&
        entry.name.endsWith(aieStructure.files.markdownExtension) &&
        entry.name !== aieStructure.files.readmeFileName
      ) {
        return [entryPath];
      }

      return [];
    }),
  );

  return files.flat().sort();
}
