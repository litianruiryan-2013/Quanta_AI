// Reads a local folder *in the browser* — drag-drop, the File System Access
// directory picker, or a <input webkitdirectory> fallback. No absolute paths
// are involved (browsers don't expose them); we keep File handles and read
// content on demand. Produces the same tree shape the backend used to return.

const IGNORED_DIRS = new Set([
  "node_modules", ".git", ".hg", ".svn", "__pycache__", ".venv", "venv", "env",
  "dist", "build", ".next", ".nuxt", ".cache", "coverage", ".idea", ".vscode",
  ".pytest_cache", ".mypy_cache", ".tox", "target", "vendor", ".terraform",
  "out", ".turbo", ".parcel-cache",
]);

const IGNORED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "ico", "svgz", "bmp",
  "mp3", "mp4", "mov", "avi", "mkv", "wav", "flac",
  "zip", "tar", "gz", "bz2", "7z", "rar",
  "pdf", "doc", "docx", "ppt", "pptx",
  "exe", "dll", "so", "dylib", "bin", "o", "a",
  "pyc", "class", "jar", "war", "woff", "woff2", "ttf", "otf", "eot",
  "lock", "sqlite", "db",
]);

const DATA_EXTENSIONS = new Set(["csv", "tsv", "xlsx", "xls"]);
const MAX_ENTRIES = 6000;

const ext = (name) => (name.includes(".") ? name.split(".").pop().toLowerCase() : "");
const isHidden = (name) => name.startsWith(".");
const isIgnoredFile = (name) => IGNORED_EXTENSIONS.has(ext(name));
const fileKind = (name) => (DATA_EXTENSIONS.has(ext(name)) ? "data" : "code");

// --- Build a nested tree from a flat list of { path, file } --------------

function buildTreeFromFlat(rootName, flat) {
  const root = { name: rootName, path: "", type: "dir", children: [] };
  const dirIndex = new Map([["", root]]);

  const ensureDir = (relDir) => {
    if (dirIndex.has(relDir)) return dirIndex.get(relDir);
    const parts = relDir.split("/");
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = ensureDir(parentPath);
    const node = { name, path: relDir, type: "dir", children: [] };
    parent.children.push(node);
    dirIndex.set(relDir, node);
    return node;
  };

  for (const { path, file } of flat) {
    const parts = path.split("/");
    const fileName = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join("/");
    const parent = ensureDir(parentPath);
    parent.children.push({
      name: fileName, path, type: "file",
      kind: fileKind(fileName), size: file.size, file,
    });
  }

  const sortNode = (node) => {
    node.children.sort((a, b) =>
      a.type !== b.type ? (a.type === "dir" ? -1 : 1) : a.name.localeCompare(b.name)
    );
    node.children.forEach((c) => c.type === "dir" && sortNode(c));
  };
  sortNode(root);
  return root;
}

// --- 1. Drag-drop via webkitGetAsEntry (skips ignored dirs while walking) --

function readEntriesAll(reader) {
  return new Promise((resolve, reject) => {
    const all = [];
    const pump = () =>
      reader.readEntries((batch) => {
        if (!batch.length) return resolve(all);
        all.push(...batch);
        pump();
      }, reject);
    pump();
  });
}

async function walkEntry(entry, prefix, flat, counter) {
  if (counter.n >= MAX_ENTRIES) return;
  if (entry.isFile) {
    if (isHidden(entry.name) || isIgnoredFile(entry.name)) return;
    const file = await new Promise((res, rej) => entry.file(res, rej));
    counter.n += 1;
    flat.push({ path: prefix + entry.name, file });
  } else if (entry.isDirectory) {
    if (isHidden(entry.name) || IGNORED_DIRS.has(entry.name)) return;
    const children = await readEntriesAll(entry.createReader());
    for (const child of children) {
      await walkEntry(child, prefix + entry.name + "/", flat, counter);
    }
  }
}

export async function readDroppedItems(items) {
  const entries = [];
  for (const item of items) {
    const entry = item.webkitGetAsEntry?.();
    if (entry) entries.push(entry);
  }
  if (!entries.length) throw new Error("No folder detected in the drop.");

  // If a single directory is dropped, use it as the root.
  const flat = [];
  const counter = { n: 0 };
  let rootName = "project";

  if (entries.length === 1 && entries[0].isDirectory) {
    rootName = entries[0].name;
    const children = await readEntriesAll(entries[0].createReader());
    for (const child of children) await walkEntry(child, "", flat, counter);
  } else {
    for (const entry of entries) await walkEntry(entry, "", flat, counter);
  }

  if (!flat.length) throw new Error("That folder has no readable files (after skipping junk).");
  return {
    tree: buildTreeFromFlat(rootName, flat),
    truncated: counter.n >= MAX_ENTRIES,
    fileCount: flat.length,
  };
}

// --- 2. File System Access API directory picker ---------------------------

export const supportsDirectoryPicker = () =>
  typeof window !== "undefined" && "showDirectoryPicker" in window;

async function walkHandle(dirHandle, prefix, flat, counter) {
  for await (const [name, handle] of dirHandle.entries()) {
    if (counter.n >= MAX_ENTRIES) return;
    if (handle.kind === "directory") {
      if (isHidden(name) || IGNORED_DIRS.has(name)) continue;
      await walkHandle(handle, prefix + name + "/", flat, counter);
    } else {
      if (isHidden(name) || isIgnoredFile(name)) continue;
      const file = await handle.getFile();
      counter.n += 1;
      flat.push({ path: prefix + name, file });
    }
  }
}

export async function pickDirectory() {
  const dirHandle = await window.showDirectoryPicker();
  const flat = [];
  const counter = { n: 0 };
  await walkHandle(dirHandle, "", flat, counter);
  if (!flat.length) throw new Error("That folder has no readable files (after skipping junk).");
  return {
    tree: buildTreeFromFlat(dirHandle.name, flat),
    truncated: counter.n >= MAX_ENTRIES,
    fileCount: flat.length,
  };
}

// --- 3. <input webkitdirectory> fallback ----------------------------------

export function readInputFiles(fileList) {
  const files = [...fileList];
  if (!files.length) throw new Error("No files selected.");
  const rootName = (files[0].webkitRelativePath || files[0].name).split("/")[0] || "project";

  const flat = [];
  for (const file of files) {
    const rel = file.webkitRelativePath || file.name;
    const parts = rel.split("/");
    if (parts.some((p) => IGNORED_DIRS.has(p) || isHidden(p))) continue;
    if (isIgnoredFile(file.name)) continue;
    // Drop the leading root segment so paths are relative to the folder.
    const path = parts.slice(1).join("/") || file.name;
    flat.push({ path, file });
    if (flat.length >= MAX_ENTRIES) break;
  }
  if (!flat.length) throw new Error("That folder has no readable files (after skipping junk).");
  return {
    tree: buildTreeFromFlat(rootName, flat),
    truncated: flat.length >= MAX_ENTRIES,
    fileCount: flat.length,
  };
}
