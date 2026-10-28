import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness.js";
import File from "../models/File.js";
import FileVersion from "../models/FileVersion.js";

const PERSIST_DEBOUNCE_MS = Number(process.env.YDOC_PERSIST_DEBOUNCE_MS) || 1500;
const VERSION_SNAPSHOT_INTERVAL_MS = 2 * 60 * 1000;

// fileId -> { doc, awareness, persistTimer, lastSnapshotAt, refCount }
const docs = new Map();

/**
 * Returns the in-memory Y.Doc for a file, loading its current MongoDB
 * content into a Y.Text the first time the doc is requested. All later
 * edits are CRDT merges on this shared structure — never a last-write-wins
 * overwrite of the full text.
 */
export async function getOrCreateDoc(fileId) {
  let entry = docs.get(fileId);
  if (entry) {
    entry.refCount += 1;
    return entry;
  }

  const fileRecord = await File.findById(fileId).lean();
  const doc = new Y.Doc();
  const ytext = doc.getText("content");

  if (fileRecord?.content) {
    ytext.insert(0, fileRecord.content);
  }

  const awareness = new Awareness(doc);

  entry = { doc, awareness, persistTimer: null, lastSnapshotAt: 0, refCount: 1 };
  docs.set(fileId, entry);

  doc.on("update", () => {
    schedulePersist(fileId);
  });

  return entry;
}

// Reads an existing doc entry WITHOUT incrementing refCount, for callers
// that need to inspect a doc (e.g. to read its awareness state while a
// socket disconnects) without pretending to be a new editor session.
// Returns undefined if no doc is currently loaded for this file.
export function peekDoc(fileId) {
  return docs.get(fileId);
}

export function releaseDoc(fileId) {
  const entry = docs.get(fileId);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    // Flush any pending write immediately, then free the doc from memory.
    flushPersist(fileId).finally(() => docs.delete(fileId));
  }
}

function schedulePersist(fileId) {
  const entry = docs.get(fileId);
  if (!entry) return;
  if (entry.persistTimer) clearTimeout(entry.persistTimer);
  entry.persistTimer = setTimeout(() => flushPersist(fileId), PERSIST_DEBOUNCE_MS);
}

async function flushPersist(fileId) {
  const entry = docs.get(fileId);
  if (!entry) return;
  entry.persistTimer = null;

  try {
    const content = entry.doc.getText("content").toString();
    const file = await File.findById(fileId);
    if (!file) return;

    const now = Date.now();
    if (file.content !== content && now - entry.lastSnapshotAt > VERSION_SNAPSHOT_INTERVAL_MS) {
      await FileVersion.create({ fileId: file._id, projectId: file.projectId, content: file.content });
      entry.lastSnapshotAt = now;
    }

    if (file.content !== content) {
      file.content = content;
      file.version += 1;
      await file.save();
    }
  } catch (err) {
    console.error(`[ydoc] failed to persist file ${fileId}:`, err.message);
  }
}

export async function flushAllDocs() {
  await Promise.all([...docs.keys()].map((id) => flushPersist(id)));
}

/**
 * Restores a file to an earlier snapshot WITHOUT destroying concurrent
 * edits from other collaborators. Because the doc is a Y.Doc, replacing
 * its content inside a single `doc.transact()` still produces one clean
 * CRDT update — any edits made by other clients a moment earlier or later
 * are merged normally by the same Y.applyUpdate mechanism everyone else
 * uses, rather than a silent last-write-wins file overwrite.
 */
export async function restoreDocContent(fileId, content) {
  const { doc } = await getOrCreateDoc(fileId);
  const ytext = doc.getText("content");

  doc.transact(() => {
    ytext.delete(0, ytext.length);
    ytext.insert(0, content);
  });

  const update = Y.encodeStateAsUpdate(doc);

  // getOrCreateDoc() above bumped refCount for this call, same as an
  // editor opening the file would. This isn't an editor session, so we
  // release that reference immediately: if a real editor already has the
  // file open, this just cancels out (net refCount unchanged, doc stays
  // loaded, its own doc.on("update") listener already scheduled a
  // persist). If nobody has it open, this is what lets the doc be freed
  // right after the change is written, instead of leaking in memory
  // forever every time a restore/replace/pull touches an unopened file.
  releaseDoc(fileId);

  return update;
}
