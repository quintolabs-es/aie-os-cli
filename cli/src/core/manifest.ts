import { readText, writeText } from "./files";

export type Manifest = {
  paths: {
    agent: string;
    globalSkills: string;
    knowledgeBase: string;
    projectCodingStandards: string;
    projectContext: string;
    projectSkills: string;
  };
  selection: {
    applicationType: string;
    frameworks: string[];
    language: string;
    persona: string;
    style: string;
  };
  version: number;
};

export async function loadManifest(manifestPath: string): Promise<Manifest> {
  const rawManifest = await readText(manifestPath);

  let parsedManifest: unknown;
  try {
    parsedManifest = JSON.parse(rawManifest);
  } catch {
    throw new Error(`Invalid JSON manifest: ${manifestPath}`);
  }

  return normalizeManifest(parsedManifest, manifestPath);
}

export async function saveManifest(
  manifest: Manifest,
  manifestPath: string,
): Promise<void> {
  await writeText(
    manifestPath,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function normalizeManifest(rawManifest: unknown, manifestPath: string): Manifest {
  const manifest = expectRecord(rawManifest, "manifest", manifestPath);
  const paths = expectRecord(manifest.paths, "paths", manifestPath);
  const selection = expectRecord(manifest.selection, "selection", manifestPath);

  return {
    version: expectNumber(manifest.version, "version", manifestPath),
    paths: {
      knowledgeBase: expectString(paths.knowledgeBase, "paths.knowledgeBase", manifestPath),
      agent: expectString(paths.agent, "paths.agent", manifestPath),
      globalSkills: expectString(paths.globalSkills, "paths.globalSkills", manifestPath),
      projectContext: expectString(paths.projectContext, "paths.projectContext", manifestPath),
      projectCodingStandards: expectString(
        paths.projectCodingStandards,
        "paths.projectCodingStandards",
        manifestPath,
      ),
      projectSkills: expectString(paths.projectSkills, "paths.projectSkills", manifestPath),
    },
    selection: {
      persona: expectString(selection.persona, "selection.persona", manifestPath),
      style: expectString(selection.style, "selection.style", manifestPath),
      language: expectString(selection.language, "selection.language", manifestPath),
      applicationType: expectString(
        selection.applicationType,
        "selection.applicationType",
        manifestPath,
      ),
      frameworks: expectStringArray(
        selection.frameworks,
        "selection.frameworks",
        manifestPath,
      ),
    },
  };
}

function expectRecord(
  value: unknown,
  fieldName: string,
  manifestPath: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected ${fieldName} to be an object in manifest: ${manifestPath}`);
  }

  return value as Record<string, unknown>;
}

function expectString(
  value: unknown,
  fieldName: string,
  manifestPath: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`Expected ${fieldName} to be a string in manifest: ${manifestPath}`);
  }

  return value;
}

function expectStringArray(
  value: unknown,
  fieldName: string,
  manifestPath: string,
): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Expected ${fieldName} to be a string array in manifest: ${manifestPath}`);
  }

  return value;
}

function expectNumber(
  value: unknown,
  fieldName: string,
  manifestPath: string,
): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`Expected ${fieldName} to be a number in manifest: ${manifestPath}`);
  }

  return value;
}
