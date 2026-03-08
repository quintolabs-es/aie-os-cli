import { readText } from "./files";

export type Manifest = {
  persona: string;
  principles: string[];
  repoContext: string[];
  skills: {
    global: string[];
    project: string[];
  };
  standards: {
    applicationTypes: string[];
    core: string[];
    frameworks: string[];
    languages: string[];
  };
  style: string;
  version: number;
};

type ParsedNode = ParsedMap | ParsedList | string;
type ParsedMap = Record<string, ParsedNode>;
type ParsedList = string[];

type Token = {
  content: string;
  indent: number;
};

export async function loadManifest(manifestPath: string): Promise<Manifest> {
  const rawManifest = await readText(manifestPath);
  const parsedManifest = parseManifest(rawManifest);

  return normalizeManifest(parsedManifest, manifestPath);
}

function parseManifest(rawManifest: string): ParsedMap {
  const tokens = rawManifest
    .split(/\r?\n/u)
    .filter((line) => {
      const trimmed = line.trim();
      return trimmed !== "" && !trimmed.startsWith("#");
    })
    .map((line) => ({
      content: line.trim(),
      indent: line.match(/^ */u)?.[0].length ?? 0,
    }));

  const [node] = parseNode(tokens, 0, 0);
  if (!node || Array.isArray(node) || typeof node === "string") {
    throw new Error("Invalid manifest structure");
  }

  return node;
}

function parseNode(
  tokens: Token[],
  startIndex: number,
  indent: number,
): [ParsedNode, number] {
  const current = tokens[startIndex];
  if (!current) {
    return [{}, startIndex];
  }

  if (current.indent !== indent) {
    throw new Error(`Invalid indentation near "${current.content}"`);
  }

  if (current.content.startsWith("- ")) {
    return parseList(tokens, startIndex, indent);
  }

  return parseMap(tokens, startIndex, indent);
}

function parseMap(
  tokens: Token[],
  startIndex: number,
  indent: number,
): [ParsedMap, number] {
  const value: ParsedMap = {};
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.indent < indent) {
      break;
    }
    if (token.indent > indent) {
      throw new Error(`Invalid indentation near "${token.content}"`);
    }

    const separatorIndex = token.content.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Invalid manifest entry: ${token.content}`);
    }

    const key = token.content.slice(0, separatorIndex).trim();
    const rawValue = token.content.slice(separatorIndex + 1).trim();

    if (rawValue !== "") {
      value[key] = parseScalar(rawValue);
      index += 1;
      continue;
    }

    if (!tokens[index + 1] || tokens[index + 1].indent <= indent) {
      value[key] = {};
      index += 1;
      continue;
    }

    const [child, nextIndex] = parseNode(tokens, index + 1, indent + 2);
    value[key] = child;
    index = nextIndex;
  }

  return [value, index];
}

function parseList(
  tokens: Token[],
  startIndex: number,
  indent: number,
): [ParsedList, number] {
  const value: ParsedList = [];
  let index = startIndex;

  while (index < tokens.length) {
    const token = tokens[index];
    if (token.indent < indent) {
      break;
    }
    if (token.indent !== indent || !token.content.startsWith("- ")) {
      break;
    }

    value.push(token.content.slice(2).trim());
    index += 1;
  }

  return [value, index];
}

function parseScalar(value: string): ParsedNode {
  if (value === "[]") {
    return [];
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function normalizeManifest(rawManifest: ParsedMap, manifestPath: string): Manifest {
  const standards = expectMap(rawManifest.standards, "standards", manifestPath);
  const skills = expectOptionalMap(rawManifest.skills, "skills", manifestPath);

  return {
    persona: expectString(rawManifest.persona, "persona", manifestPath),
    principles: expectList(rawManifest.principles, "principles", manifestPath),
    repoContext: expectList(rawManifest.repoContext, "repoContext", manifestPath),
    skills: {
      global: expectOptionalList(skills?.global, "skills.global", manifestPath),
      project: expectOptionalList(skills?.project, "skills.project", manifestPath),
    },
    standards: {
      applicationTypes: expectOptionalList(
        standards.applicationTypes,
        "standards.applicationTypes",
        manifestPath,
      ),
      core: expectList(standards.core, "standards.core", manifestPath),
      frameworks: expectList(standards.frameworks, "standards.frameworks", manifestPath),
      languages: expectList(standards.languages, "standards.languages", manifestPath),
    },
    style: expectString(rawManifest.style, "style", manifestPath),
    version: expectNumber(rawManifest.version, "version", manifestPath),
  };
}

function expectList(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): string[] {
  if (!value) {
    throw new Error(`Missing ${fieldName} in manifest: ${manifestPath}`);
  }

  if (!Array.isArray(value)) {
    throw new Error(`Expected ${fieldName} to be a list in manifest: ${manifestPath}`);
  }

  return value;
}

function expectOptionalList(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): string[] {
  if (value === undefined) {
    return [];
  }

  return expectList(value, fieldName, manifestPath);
}

function expectMap(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): ParsedMap {
  if (!value) {
    throw new Error(`Missing ${fieldName} in manifest: ${manifestPath}`);
  }

  if (Array.isArray(value) || typeof value === "string") {
    throw new Error(`Expected ${fieldName} to be an object in manifest: ${manifestPath}`);
  }

  return value;
}

function expectOptionalMap(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): ParsedMap | undefined {
  if (value === undefined) {
    return undefined;
  }

  return expectMap(value, fieldName, manifestPath);
}

function expectNumber(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): number {
  if (typeof value !== "string") {
    throw new Error(`Expected ${fieldName} to be a number in manifest: ${manifestPath}`);
  }

  const parsedValue = Number(value);
  if (Number.isNaN(parsedValue)) {
    throw new Error(`Expected ${fieldName} to be a number in manifest: ${manifestPath}`);
  }

  return parsedValue;
}

function expectString(
  value: ParsedNode | undefined,
  fieldName: string,
  manifestPath: string,
): string {
  if (typeof value !== "string") {
    throw new Error(`Expected ${fieldName} to be a string in manifest: ${manifestPath}`);
  }

  return value;
}
