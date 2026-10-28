# CollabIDE — Real-Time Collaborative Code Editor (MERN)

A browser-based, VS Code–inspired IDE where up to **4 people** can edit the
same project — including the same file, the same line — at the same time,
with real conflict-free merging (not last-write-wins).

---

## 1. What's actually implemented right now

This is being built in the phased order below. Everything marked ✅ is real,
tested, working code — not a stub. Everything marked 🚧 has a clean
architectural seam (a named file, a documented event, a clearly-labeled
placeholder panel) ready for the next pass, per the "don't fake it" ground
rule this project was built under.

| Phase | Feature | Status |
|---|---|---|
| 1 | Project setup (monorepo, scripts, env) | ✅ |
| 2 | Auth (register/login/logout/me, JWT cookie, bcrypt) | ✅ |
| 3 | Dashboard (projects, filters, star, cards) | ✅ |
| 4 | Project creation + templates | ✅ |
| 5 | File system CRUD (create/rename/move/delete/duplicate, nested folders) | ✅ |
| 6 | Monaco editor integration | ✅ |
| 7 | Socket.IO room system (join/leave, capacity limit, presence) | ✅ |
| 8 | **CRDT collaborative editing (Yjs, per-file Y.Doc, real merge)** | ✅ |
| 9 | Live cursors & selections (Yjs Awareness + y-monaco) | ✅ |
| 10 | Invite links (generate/regenerate/disable/expire, join flow) | ✅ |
| 11 | Terminal (real sandboxed exec: allowlisted binaries, no shell, timeouts) | ✅ |
| 12 | Workspace search (regex/case/whole-word, replace-all) | ✅ |
| 13 | Source control UI (real changes list incl. deletions, commits, log, **real git push/pull**) | ✅ |
| 14 | Command palette | ✅ |
| 15 | Themes (Dark Modern, Light, High Contrast, Neon Green, Monokai, Dracula) | ✅ |
| 16 | Version history (CRDT-safe restore — merges, doesn't overwrite) | ✅ |
| 17 | Security & rate limiting | ✅ |
| 18 | Keyboard shortcuts (Ctrl+S/W/B/P/`` ` ``/Shift+E/F/G) | ✅ |
| — | Problems panel (real Monaco diagnostics) | ✅ |
| — | Breakpoints (real glyph-margin toggle in Monaco) | ✅ |
| 20 | Debugger | 🚧 UI shell only — needs a real Debug Adapter Protocol backend |
| 25 | Extensions marketplace | 🚧 clearly-labeled mock catalog, per spec |

**The single most important requirement — four people genuinely editing the
same file at the same time without overwriting each other — is done and is
architecturally correct**, not simulated:

- Each open file is backed by a real `Y.Doc` living in server memory
  (`server/collaboration/ydocManager.js`), ref-counted per open editor.
  **Ref-counting correctness note:** only the initial `yjs-sync-request`
  (a file being opened) and the corresponding close increment/decrement
  this count — the high-frequency `yjs-update` and `awareness-update`
  handlers (fired on every keystroke and cursor move) deliberately use a
  non-owning `peekDoc()` lookup instead of `getOrCreateDoc()`, specifically
  to avoid inflating the count on every edit. An earlier version of this
  code had that backwards and would have leaked a `Y.Doc` in memory for
  the life of the server process, permanently, after the very first edit
  to any file — caught during a verification pass and fixed; see the
  ref-counting tests referenced in this file's git history.
- Clients never send or trust a full file string while editing — only
  binary Yjs update deltas, applied via `Y.applyUpdate` (a commutative,
  conflict-free CRDT merge) and rebroadcast to the room.
- Cursor/selection presence rides on the same Yjs `Awareness` protocol that
  Monaco's official `y-monaco` binding expects, so remote cursors, colors,
  and name labels are the real thing, not a fake overlay.
- Persistence to MongoDB is **debounced**, not per-keystroke: edits merge
  in memory and get flushed to disk every ~1.5s (configurable), with
  periodic version snapshots for history.

---

## 2. Tech stack

**Client:** React 18, Vite, Tailwind CSS, Monaco Editor (`@monaco-editor/react`),
Yjs + `y-monaco` + `y-protocols`, Socket.IO client, Zustand, React Router, Axios, `react-hot-toast`.

**Server:** Node.js, Express, MongoDB/Mongoose, Socket.IO, Yjs + `y-protocols`,
JWT (http-only cookies), bcryptjs, Helmet, `express-mongo-sanitize`, `express-rate-limit`.

---

## 3. Project structure

```text
collab-editor/
├── client/
│   └── src/
│       ├── collaboration/     # SocketYjsProvider — bridges Y.Doc <-> socket
│       ├── editor/            # CodeEditor.jsx (Monaco + y-monaco binding)
│       ├── components/        # FileExplorer, EditorTabs, ActivityBar, modals, etc.
│       ├── pages/              # Landing, Login, Register, Dashboard, Workspace, InviteLanding
│       ├── store/              # authStore, projectStore, fileStore, editorStore, uiStore
│       └── services/           # api.js (axios), socket.js (socket.io-client)
│
└── server/
    ├── models/                 # User, Project, File, FileVersion, CollaborationSession
    ├── controllers/            # auth, project, file
    ├── routes/                 # auth, project, file
    ├── middleware/              # auth (JWT), projectAccess (role checks), errorHandler
    ├── socket/                 # socket.js (auth handshake), room.socket.js, presence.socket.js, collaboration.socket.js
    ├── collaboration/          # ydocManager.js — the CRDT core
    └── services/                # template.service.js (project scaffolding)
```

---

## 4. Running it locally

### Prerequisites
- Node.js 18+
- A running MongoDB instance (local `mongod`, or a free Atlas cluster)

### Setup

```bash
# from the repo root
npm run install:all

cp server/.env.example server/.env
# edit server/.env — set MONGO_URI and a real JWT_SECRET

cp client/.env.example client/.env
```

### Run

```bash
npm run dev
```

This starts the API on `http://localhost:8000` and the client on
`http://localhost:5173` concurrently.

---

### Real git integration (Phase 19)

Push/Pull are genuine `git` operations, not a mocked seam — run against the
same on-disk scratch copy the terminal uses
(`server/services/git.service.js` + `workspace.service.js`):

- **Push**: commits any pending changes, then `git push origin main` to a
  remote URL the project owner/editor configures
- **Pull**: `git pull`, then reconciles the result back into MongoDB via
  `syncDiskToMongo` — for a file that's currently open in someone's live
  editor, the pulled content is applied as a Yjs transaction
  (`restoreDocContent`) rather than a raw overwrite, so it merges instead
  of clobbering concurrent edits, then broadcasts to that file's room
- A default `.gitignore` (`node_modules/`, `dist/`, `.env`, …) is written
  on repo init, and the disk→Mongo sync applies the same exclusion list
  independently — this workspace directory is **shared with the sandboxed
  terminal**, so without both of these, an `npm install` run in the
  terminal followed by a pull-triggered sync would flood MongoDB with
  thousands of `node_modules` file records.

**Security caveat, stated plainly:** the only supported auth method is a
remote URL with embedded credentials
(`https://user:TOKEN@github.com/you/repo.git`). There's no SSH agent
forwarding or OAuth flow. The URL is stored on the `Project` document as
plain text (`redactRemoteUrl` masks it before it's ever echoed back to a
client or logged) — in a production deployment this belongs in a secrets
manager, not a database field.

---

## 5. Socket architecture (event reference)

| Event | Direction | Purpose |
|---|---|---|
| `join-room` / `leave-room` | client → server | Enter/exit a project's room; server enforces the 4-member cap |
| `user-joined` / `user-left` | server → room | Presence broadcast |
| `yjs-sync-request` | client → server (ack) | Get the current CRDT state for a file when opening it |
| `yjs-update` | bidirectional | Binary CRDT delta — the actual collaborative edit payload |
| `awareness-update` | bidirectional | Cursor position, selection, user color/name |
| `restore-version` | client → server (ack) | CRDT-safe restore of a `FileVersion` snapshot into the live doc |
| `file-created` / `file-renamed` / `file-deleted` / `folder-created` | bidirectional | File tree sync |
| `file-closed-editor` | client → server | Releases a file's Y.Doc ref count and clears that user's awareness state for it |
| `terminal-create` | client → server (ack) | Materializes the project's files to a scratch dir and opens a terminal tab |
| `terminal-input` | client → server | Runs a command (allowlisted binary, no shell) in that scratch dir |
| `terminal-output` / `terminal-exit` | server → client | Streamed stdout/stderr and exit code |
| `terminal-kill` / `terminal-close` | client → server | Kill the running process / tear down the terminal |

### Terminal sandboxing

Real commands run via `child_process.spawn(bin, args, { shell: false, ... })`
against a scratch copy of the project's files
(`server/services/workspace.service.js`), never the server's own source tree:

- `shell: false` alone blocks `;`, `&&`, `|`, and injection payloads
- Only an explicit allowlist may execute at all (`node`, `npm`, `npx`,
  `python3`, `ls`, `cat`, `echo`, `pwd`, `mkdir`, `touch`, …)
- Every process has a 30s wall-clock timeout and a 200KB output cap
- The documented upgrade path — swapping `spawn()` for a call into a
  per-project Docker container — only touches `terminal.service.js`;
  nothing else in the app needs to change.

---

## 6. Security model

- JWT stored in an **http-only cookie**, never exposed to client JS.
- Every REST route that touches a project runs through `requireProjectMember`,
  and mutating routes additionally check `requireEditPermission` /
  `requireProjectOwner` — role is derived server-side from the DB record,
  never trusted from the client.
- Every Socket.IO connection is authenticated at the handshake (JWT from the
  cookie, verified before any event handler runs) and every collaboration
  event re-checks project membership before touching a `Y.Doc`.
- Workspace size is enforced in **two places** (REST join + socket join) so
  a socket reconnect can't bypass the 4-user cap.

---

## 7. Known gaps / next steps

- The **debugger** is a UI shell only (Variables/Call Stack/Watch panels,
  real glyph-margin breakpoints) — it needs a real Debug Adapter Protocol
  backend (e.g. the Node.js inspector protocol) to actually run anything.
- The **extensions marketplace** is a clearly-labeled mock catalog, per the
  spec's own instructions for this phase — install/uninstall toggles local
  state only.
- **Push/Pull** now run real `git` commands (see section 5) — the
  remaining gap is auth: only credential-embedded HTTPS URLs are
  supported, no SSH/OAuth.
- Deleted files aren't shown as `D` in the Source Control changes list,
  since the file record itself is gone by the time it's deleted — tracking
  that would mean soft-deleting `File` docs instead of hard-deleting them.
- Search's **replace-all** writes through the REST path directly to
  MongoDB. If a file is open in someone's live editor, that file's Y.Doc is
  authoritative and will win on its next autosave flush — for files
  currently open collaboratively, prefer doing the replace inside the
  editor itself.
- Chunk size: `yjs` + `monaco-editor` produce a large JS bundle (~2.4MB for
  the yjs chunk before gzip); the build already flags this — code-splitting
  Monaco via dynamic `import()` is the next perf pass.
- The terminal's sandboxing is allowlist + no-shell + timeouts, which is
  solid for a trusted-user MVP but is not container-level isolation — see
  the "Terminal sandboxing" section above for the documented Docker
  upgrade path before this is exposed to untrusted users.
