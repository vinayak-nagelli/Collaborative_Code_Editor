import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness.js";

/**
 * Bridges a Y.Doc + Awareness pair to the server's per-file Yjs room via
 * Socket.IO events (yjs-sync-request / yjs-update / awareness-update).
 * This plays the same role y-websocket's WebsocketProvider normally plays,
 * but reuses the app's already-authenticated socket instead of opening a
 * second raw WebSocket connection.
 */
export class SocketYjsProvider {
  constructor(socket, projectId, fileId) {
    this.socket = socket;
    this.projectId = projectId;
    this.fileId = fileId;
    this.doc = new Y.Doc();
    this.awareness = new Awareness(this.doc);
    this.synced = false;

    this._onLocalUpdate = (update, origin) => {
      if (origin === this) return; // don't echo back updates we just applied remotely
      this.socket.emit("yjs-update", {
        projectId: this.projectId,
        fileId: this.fileId,
        update: Array.from(update),
      });
    };
    this.doc.on("update", this._onLocalUpdate);

    this._onLocalAwareness = ({ added, updated, removed }) => {
      const changedClients = added.concat(updated, removed);
      const update = encodeAwarenessUpdate(this.awareness, changedClients);
      this.socket.emit("awareness-update", {
        projectId: this.projectId,
        fileId: this.fileId,
        update: Array.from(update),
        clientID: this.doc.clientID,
      });
    };
    this.awareness.on("update", this._onLocalAwareness);

    this._onRemoteUpdate = ({ fileId, update }) => {
      if (fileId !== this.fileId) return;
      Y.applyUpdate(this.doc, new Uint8Array(update), this);
    };
    this._onRemoteAwareness = ({ fileId, update }) => {
      if (fileId !== this.fileId) return;
      applyAwarenessUpdate(this.awareness, new Uint8Array(update), this);
    };
    this.socket.on("yjs-update", this._onRemoteUpdate);
    this.socket.on("awareness-update", this._onRemoteAwareness);
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket.emit(
        "yjs-sync-request",
        { projectId: this.projectId, fileId: this.fileId },
        (res) => {
          if (!res?.ok) return reject(new Error(res?.error || "Sync failed"));
          Y.applyUpdate(this.doc, new Uint8Array(res.update), this);
          if (res.awarenessUpdate) {
            applyAwarenessUpdate(this.awareness, new Uint8Array(res.awarenessUpdate), this);
          }
          this.synced = true;
          resolve(this);
        }
      );
    });
  }

  destroy() {
    this.socket.emit("file-closed-editor", { fileId: this.fileId });
    this.socket.off("yjs-update", this._onRemoteUpdate);
    this.socket.off("awareness-update", this._onRemoteAwareness);
    this.doc.off("update", this._onLocalUpdate);
    this.awareness.off("update", this._onLocalAwareness);
    removeAwarenessStates(this.awareness, [this.doc.clientID], null);
    this.doc.destroy();
  }
}

export default SocketYjsProvider;
