import path from "node:path";

export function knowledgeRoot(repoRoot = process.cwd()): string {
  return path.join(repoRoot, "data", "knowledge");
}

export function knowledgePaths(repoRoot = process.cwd()) {
  const root = knowledgeRoot(repoRoot);
  return {
    root,
    manifest: path.join(root, "manifest.json"),
    catalog: path.join(root, "catalog", "items.json"),
    wikiIndex: path.join(root, "wiki", "index.json"),
    wikiDir: path.join(root, "wiki", "digests"),
    buildsIndex: path.join(root, "builds", "index.json"),
    buildsDir: path.join(root, "builds", "by-item"),
    mods: path.join(root, "mods", "index.json"),
  };
}
