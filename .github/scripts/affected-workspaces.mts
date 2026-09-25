// Import Node.js Dependencies
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";

interface PackageJSON {
  name: string;
  workspaces?: string[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// Changes outside of a workspace trigger every test suite, except for these files.
const kIgnoredFiles = [
  /^\.changeset\//,
  /^[^/]+\.md$/,
  /^\.github\/dependabot\.yml$/,
  /^\.github\/workflows\/(changesets|codeql|scorecards)\.yml$/
];
const kNullSha = /^0+$/;

function readPackageJSON(dir: string): PackageJSON {
  return JSON.parse(readFileSync(path.join(dir, "package.json"), "utf-8"));
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/**
 * Returns null when there is no usable base commit (manual run, new branch, force push).
 */
function getChangedFiles(baseSha: string | undefined): string[] | null {
  if (!baseSha || kNullSha.test(baseSha)) {
    return null;
  }

  try {
    git("cat-file", "-e", `${baseSha}^{commit}`);
  }
  catch {
    return null;
  }

  return git("diff", "--name-only", baseSha, "HEAD").split("\n").filter(Boolean);
}

const workspaces = readPackageJSON(".").workspaces ?? [];
const manifests = new Map(workspaces.map((workspace) => [workspace, readPackageJSON(workspace)]));
const workspaceByName = new Map(
  [...manifests].map(([workspace, manifest]) => [manifest.name, workspace])
);

const dependents = new Map<string, string[]>();
for (const [workspace, manifest] of manifests) {
  const dependencyNames = Object.keys({
    ...manifest.dependencies,
    ...manifest.devDependencies,
    ...manifest.peerDependencies
  });

  for (const name of dependencyNames) {
    const dependency = workspaceByName.get(name);
    if (dependency) {
      dependents.set(dependency, [...(dependents.get(dependency) ?? []), workspace]);
    }
  }
}

function resolveAffectedWorkspaces(changedFiles: string[] | null): string[] {
  if (changedFiles === null) {
    return workspaces;
  }

  const affected = new Set<string>();
  for (const file of changedFiles) {
    if (kIgnoredFiles.some((pattern) => pattern.test(file))) {
      continue;
    }

    const workspace = workspaces.find((workspace) => file.startsWith(`${workspace}/`));
    if (!workspace) {
      return workspaces;
    }
    affected.add(workspace);
  }

  // A Set iterator also visits values added during iteration, so this collects transitive dependents.
  for (const workspace of affected) {
    for (const dependent of dependents.get(workspace) ?? []) {
      affected.add(dependent);
    }
  }

  return workspaces.filter((workspace) => affected.has(workspace));
}

const changedFiles = getChangedFiles(process.env.BASE_SHA);
const affected = resolveAffectedWorkspaces(changedFiles);

console.log(changedFiles === null ?
  "No usable base commit, testing every workspace" :
  `Changed files:\n${changedFiles.map((file) => `  ${file}`).join("\n")}`);
console.log(`Affected workspaces: ${affected.join(", ") || "none"}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `workspaces=${JSON.stringify(affected)}\n`);
}
