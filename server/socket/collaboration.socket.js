import * as Y from "yjs";
import { applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness.js";
import Project from "../models/Project.js";
import File from "../models/File.js";
import { getOrCreateDoc, releaseDoc, restoreDocContent, peekDoc } from "../collaboration/ydocManager.js";
import FileVersion from "../models/FileVersion.js";

const projectRoom = (projectId) => `project:${projectId}`;
const fileRoom = (fileId) => `file:${fileId}`;

async function assertMembership(userId, projectId) {
  const project = await Project.findById(projectId);
  if (!project || !project.isMember(userId)) {
    throw new Error("Not authorized for this project");
  }
  return project;
}

/**
 * Phase 8: real CRDT sync. Each open file is backed by a Yjs Y.Doc that
 * lives in server memory (server/collaboration/ydocManager.js). Clients
 * never send or trust a full document string during editing — only binary
 * Yjs update deltas, which are applied with Y.applyUpdate (a commutative,
 * conflict-free merge) and then rebroadcast. Four people editing the same
 * line simultaneously converge to the same document without anyone's
 * keystrokes being silently dropped.
 *
 * Cursor/selection presence also rides on Yjs, via the y-protocols
 * Awareness class, which is the same mechanism Monaco's y-monaco binding
 * expects — this replaces the earlier placeholder cursor relay with the
 * real thing.
 */
export default function registerCollaborationHandlers(io, socket) {
  // --- Open a file for collaborative editing ---------------------------
  // Client calls this once per file it opens. Server responds with the
  // current CRDT state (as a binary update) so the client can construct
  // an identical Y.Doc locally before binding Monaco to it.
  socket.on("yjs-sync-request", async ({ projectId, fileId }, ack) => {
    try {
      await assertMembership(socket.user.id, projectId);
      const file = await File.findOne({ _id: fileId, projectId });
      if (!file || file.type !== "file") throw new Error("File not found");

      socket.join(fileRoom(fileId));
      socket.data.openFiles = socket.data.openFiles || new Set();
      socket.data.openFiles.add(fileId);

      const { doc, awareness } = await getOrCreateDoc(fileId);

      const stateUpdate = Y.encodeStateAsUpdate(doc);
      const awarenessStates = [...awareness.getStates().keys()];
      const awarenessUpdate =
        awarenessStates.length > 0 ? encodeAwarenessUpdate(awareness, awarenessStates) : null;

      ack?.({
        ok: true,
        update: Array.from(stateUpdate),
        awarenessUpdate: awarenessUpdate ? Array.from(awarenessUpdate) : null,
      });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // --- Apply an incoming CRDT delta ------------------------------------
  socket.on("yjs-update", async ({ projectId, fileId, update }) => {
    try {
      const project = await assertMembership(socket.user.id, projectId);
      if (project.roleOf(socket.user.id) === "viewer") {
        return socket.emit("error", { message: "Read-only access" });
      }

      // The doc should already be loaded — the client calls
      // yjs-sync-request before ever sending edits, which is what holds
      // the doc's refCount up for the duration of this editor session.
      // peekDoc (not getOrCreateDoc) avoids bumping that count on every
      // single keystroke, which would otherwise leak the doc in memory
      // for the life of the server process. The getOrCreateDoc fallback
      // below only runs for the defensive/race-condition case where an
      // update arrives before sync — and self-cleans immediately after,
      // same pattern as restoreDocContent.
      let entry = peekDoc(fileId);
      if (!entry) {
        entry = await getOrCreateDoc(fileId);
        releaseDoc(fileId);
      }
      Y.applyUpdate(entry.doc, new Uint8Array(update), socket.id);

      // Relay the raw delta rather than the full document — this is the
      // "efficient incremental update" the architecture requires.
      socket.to(fileRoom(fileId)).emit("yjs-update", { fileId, update });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // --- Awareness (live cursors, selections, user color/name) -----------
  socket.on("awareness-update", async ({ projectId, fileId, update, clientID }) => {
    try {
      await assertMembership(socket.user.id, projectId);
      // Same fix as yjs-update above: peek rather than getOrCreate, since
      // this fires on every cursor move and must not bump refCount.
      let entry = peekDoc(fileId);
      if (!entry) {
        entry = await getOrCreateDoc(fileId);
        releaseDoc(fileId);
      }
      applyAwarenessUpdate(entry.awareness, new Uint8Array(update), socket);

      socket.data.awarenessClients = socket.data.awarenessClients || {};
      if (clientID !== undefined) socket.data.awarenessClients[fileId] = clientID;

      socket.to(fileRoom(fileId)).emit("awareness-update", { fileId, update });
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // --- Version history restore (CRDT-safe, see ydocManager.restoreDocContent) ---
  socket.on("restore-version", async ({ projectId, fileId, versionId }, ack) => {
    try {
      const project = await assertMembership(socket.user.id, projectId);
      if (project.roleOf(socket.user.id) === "viewer") {
        throw new Error("Read-only access");
      }

      const version = await FileVersion.findOne({ _id: versionId, fileId });
      if (!version) throw new Error("Version not found");

      const fullStateUpdate = await restoreDocContent(fileId, version.content);

      // Broadcast the restored state to everyone with this file open —
      // Y.applyUpdate merges a full-state update just like a delta.
      io.to(fileRoom(fileId)).emit("yjs-update", { fileId, update: Array.from(fullStateUpdate) });

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  // --- Bulk content replace (Search panel's "Replace All") -------------
  // Routed through the same CRDT-safe path as version restore: whether or
  // not anyone currently has this file open, the change is applied as a
  // Y.Doc transaction and broadcast, so it can never be silently clobbered
  // by a stale in-memory doc's next autosave flush.
  socket.on("replace-file-content", async ({ projectId, fileId, content }, ack) => {
    try {
      const project = await assertMembership(socket.user.id, projectId);
      if (project.roleOf(socket.user.id) === "viewer") {
        throw new Error("Read-only access");
      }

      const fullStateUpdate = await restoreDocContent(fileId, content);
      io.to(fileRoom(fileId)).emit("yjs-update", { fileId, update: Array.from(fullStateUpdate) });

      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, error: err.message });
    }
  });

  socket.on("file-closed-editor", async ({ fileId }) => {
    await closeFile(socket, fileId);
  });

  socket.on("disconnect", async () => {
    const openFiles = socket.data.openFiles;
    if (!openFiles) return;
    for (const fileId of openFiles) {
      await closeFile(socket, fileId);
    }
  });

  // --- File-tree events (create/rename/move/delete) ---------------------
  socket.on("file-created", async (payload) => {
    try {
      await assertMembership(socket.user.id, payload.projectId);
      socket.to(projectRoom(payload.projectId)).emit("file-created", payload.file);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("folder-created", async (payload) => {
    try {
      await assertMembership(socket.user.id, payload.projectId);
      socket.to(projectRoom(payload.projectId)).emit("folder-created", payload.file);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("file-renamed", async (payload) => {
    try {
      await assertMembership(socket.user.id, payload.projectId);
      socket.to(projectRoom(payload.projectId)).emit("file-renamed", payload);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("file-deleted", async (payload) => {
    try {
      await assertMembership(socket.user.id, payload.projectId);
      socket.to(projectRoom(payload.projectId)).emit("file-deleted", payload);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });
}

async function closeFile(socket, fileId) {
  socket.leave(fileRoom(fileId));
  socket.data.openFiles?.delete(fileId);

  const clientID = socket.data.awarenessClients?.[fileId];
  if (clientID !== undefined) {
    // peekDoc, not getOrCreateDoc: the latter would bump refCount right
    // before releaseDoc() below decrements it, netting zero and leaking
    // the reference this file's original "open" call is still holding —
    // the doc would then never actually free from memory.
    const entry = peekDoc(fileId);
    if (entry) {
      removeAwarenessStates(entry.awareness, [clientID], null);
      const update = encodeAwarenessUpdate(entry.awareness, [clientID]);
      socket.to(fileRoom(fileId)).emit("awareness-update", { fileId, update: Array.from(update) });
    }
    delete socket.data.awarenessClients[fileId];
  }

  releaseDoc(fileId);
}
