import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ChevronRight, Link2, Settings, Users, Command, Activity, History, Database, Wifi, FileCode } from "lucide-react";

import ActivityBar from "../components/ActivityBar";
import FileExplorer from "../components/FileExplorer";
import EditorTabs from "../components/EditorTabs";
import UserAvatar from "../components/UserAvatar";
import InviteModal from "../components/InviteModal";
import SearchPanel from "../components/SearchPanel";
import SourceControlPanel from "../components/SourceControlPanel";
import DebugPanel from "../components/DebugPanel";
import ExtensionsPanel from "../components/ExtensionsPanel";
import RequirementsPanel from "../components/RequirementsPanel";
import TasksPanel from "../components/TasksPanel";
import QAPanel from "../components/QAPanel";
import TeamCollabPanel from "../components/TeamCollabPanel";
import AICopilotPanel from "../components/AICopilotPanel";
import ProjectHealthDashboard from "../components/ProjectHealthDashboard";
import Terminal from "../components/Terminal";
import ProblemsPanel from "../components/ProblemsPanel";
import VersionHistoryPanel from "../components/VersionHistoryPanel";
import CommandPalette from "../components/CommandPalette";


import api from "../services/api";
import { getSocket, connectSocket } from "../services/socket";
import useAuthStore from "../store/authStore";
import useFileStore from "../store/fileStore";
import useEditorStore from "../store/editorStore";
import useThemeStore, { THEMES } from "../store/themeStore";
import useProblemsStore from "../store/problemsStore";
import useRequirementStore from "../store/requirementStore";
import useTaskStore from "../store/taskStore";
import useQAStore from "../store/qaStore";
import useDashboardStore from "../store/dashboardStore";

// Heavy dependency (Monaco + Yjs) — loaded only when a file is actually
// opened, so login/dashboard/landing don't pay for this chunk upfront.
const CodeEditor = lazy(() => import("../editor/CodeEditor"));

export default function Workspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { files, fetchFiles, addFileFromSocket, removeFilesFromSocket, replaceFileInTree } = useFileStore();
  const { openTabs, activeFileId, openFile, closeTab } = useEditorStore();

  const [project, setProject] = useState(null);
  const [role, setRole] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [connectionState, setConnectionState] = useState("connecting"); // connecting | connected | reconnecting
  const [activePanel, setActivePanel] = useState("explorer");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [bottomPanel, setBottomPanel] = useState("terminal"); // "terminal" | "problems" | null
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [onlinePanelOpen, setOnlinePanelOpen] = useState(false);
  const onlinePanelRef = useRef(null);
  const { themeId, setTheme } = useThemeStore();
  const problemCount = useProblemsStore((s) => s.allProblems().length);

  const canEdit = role === "owner" || role === "editor";
  const activeTab = openTabs.find((t) => t.fileId === activeFileId);
  const activeFileMeta = files.find((f) => f._id === activeFileId);

  // --- Load project + file tree, then join the collaboration room ---
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get(`/projects/${projectId}`);
        if (cancelled) return;
        setProject(data.project);
        setRole(data.role);
        await fetchFiles(projectId);
      } catch (err) {
        setLoadError(err.message);
      }
    }
    load();

    const socket = connectSocket();

    const doJoin = () => {
      socket.emit("join-room", { projectId }, (res) => {
        if (!res?.ok) {
          toast.error(res?.error || "Could not join workspace");
          if (res?.error?.includes("full")) navigate("/dashboard");
          return;
        }
        setParticipants(res.participants);
        setConnectionState("connected");
      });
    };

    if (socket.connected) doJoin();
    socket.on("connect", () => {
      setConnectionState((prev) => (prev === "connecting" ? "connected" : "connected"));
      doJoin();
    });
    socket.on("disconnect", () => setConnectionState("reconnecting"));
    socket.io.on("reconnect_attempt", () => setConnectionState("reconnecting"));

    const onUserJoined = (u) => {
      setParticipants((prev) => (prev.some((p) => p.userId === u.userId) ? prev : [...prev, u]));
      toast(`${u.name} joined the workspace`);
    };
    const onUserLeft = (u) => {
      setParticipants((prev) => prev.filter((p) => p.userId !== u.userId));
      toast(`${u.name} left the workspace`);
    };
    const onFileCreated = (file) => addFileFromSocket(file);
    const onFolderCreated = (file) => addFileFromSocket(file);
    const onFileDeleted = ({ deletedIds }) => removeFilesFromSocket(deletedIds || []);
    const onFileRenamed = () => fetchFiles(projectId); // paths of a whole subtree may change
    const onFilesSynced = ({ created, updated }) => {
      fetchFiles(projectId); // git pull may have added/changed files outside the normal socket events
      if (created || updated) toast(`Workspace synced from git — ${created} added, ${updated} updated`);
    };

    const onReqCreated = (r) => useRequirementStore.getState().onRequirementCreated(r);
    const onReqUpdated = (r) => useRequirementStore.getState().onRequirementUpdated(r);
    const onReqDeleted = (d) => useRequirementStore.getState().onRequirementDeleted(d);
    const onTaskCreated = (t) => useTaskStore.getState().onTaskCreated(t);
    const onTaskUpdated = (t) => useTaskStore.getState().onTaskUpdated(t);
    const onTaskDeleted = (d) => useTaskStore.getState().onTaskDeleted(d);
    const onTestCreated = (t) => useQAStore.getState().onTestCreated(t);
    const onTestUpdated = (t) => useQAStore.getState().onTestUpdated(t);
    const onTestDeleted = (d) => useQAStore.getState().onTestDeleted(d);
    const onBugCreated = (b) => useQAStore.getState().onBugCreated(b);
    const onBugUpdated = (b) => useQAStore.getState().onBugUpdated(b);
    const onBugDeleted = (d) => useQAStore.getState().onBugDeleted(d);

    // Track which file each collaborator is actively viewing
    const onPresenceUpdate = ({ userId, name, activeFileId: fid, activeFileName }) => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.userId === userId
            ? { ...p, activeFileId: fid, activeFileName: activeFileName || fid }
            : p
        )
      );
    };

    socket.on("user-joined", onUserJoined);
    socket.on("user-left", onUserLeft);
    socket.on("presence-update", onPresenceUpdate);
    socket.on("file-created", onFileCreated);
    socket.on("folder-created", onFolderCreated);
    socket.on("file-deleted", onFileDeleted);
    socket.on("file-renamed", onFileRenamed);
    socket.on("files-synced", onFilesSynced);
    socket.on("requirement:created", onReqCreated);
    socket.on("requirement:updated", onReqUpdated);
    socket.on("requirement:deleted", onReqDeleted);
    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("qa:test-created", onTestCreated);
    socket.on("qa:test-updated", onTestUpdated);
    socket.on("qa:test-deleted", onTestDeleted);
    socket.on("qa:bug-created", onBugCreated);
    socket.on("qa:bug-updated", onBugUpdated);
    socket.on("qa:bug-deleted", onBugDeleted);

    return () => {
      cancelled = true;
      socket.emit("leave-room", { projectId });
      socket.off("connect", doJoin);
      socket.off("disconnect");
      socket.io.off("reconnect_attempt");
      socket.off("user-joined", onUserJoined);
      socket.off("user-left", onUserLeft);
      socket.off("presence-update", onPresenceUpdate);
      socket.off("file-created", onFileCreated);
      socket.off("folder-created", onFolderCreated);
      socket.off("file-deleted", onFileDeleted);
      socket.off("file-renamed", onFileRenamed);
      socket.off("files-synced", onFilesSynced);
      socket.off("requirement:created", onReqCreated);
      socket.off("requirement:updated", onReqUpdated);
      socket.off("requirement:deleted", onReqDeleted);
      socket.off("task:created", onTaskCreated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("task:deleted", onTaskDeleted);
      socket.off("qa:test-created", onTestCreated);
      socket.off("qa:test-updated", onTestUpdated);
      socket.off("qa:test-deleted", onTestDeleted);
      socket.off("qa:bug-created", onBugCreated);
      socket.off("qa:bug-updated", onBugUpdated);
      socket.off("qa:bug-deleted", onBugDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const handleCopyInvite = useCallback(() => {
    if (!project?.inviteCode) return;
    const url = `${window.location.origin}/join/${project.inviteCode}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }, [project]);

  // --- Command Palette command list (Phase 17) ---
  const commands = [
    { id: "new-file", label: "File: New File", shortcut: "", action: () => setActivePanel("explorer") },
    { id: "toggle-terminal", label: "View: Toggle Terminal", shortcut: "Ctrl+`", action: () => setBottomPanel((p) => (p === "terminal" ? null : "terminal")) },
    { id: "toggle-sidebar", label: "View: Toggle Sidebar", shortcut: "Ctrl+B", action: () => setSidebarOpen((v) => !v) },
    { id: "toggle-problems", label: "View: Toggle Problems", shortcut: "", action: () => setBottomPanel((p) => (p === "problems" ? null : "problems")) },
    { id: "explorer", label: "View: Show Explorer", shortcut: "Ctrl+Shift+E", action: () => setActivePanel("explorer") },
    { id: "requirements", label: "View: Show Requirements", shortcut: "Ctrl+Shift+R", action: () => setActivePanel("requirements") },
    { id: "tasks", label: "View: Show Tasks & Traceability", shortcut: "Ctrl+Shift+T", action: () => setActivePanel("tasks") },
    { id: "qa", label: "View: Show Testing & QA", shortcut: "Ctrl+Shift+Q", action: () => setActivePanel("qa") },
    { id: "health-dashboard", label: "View: Project Health & Team Dashboard", shortcut: "Ctrl+Shift+H", action: () => useDashboardStore.getState().openDashboard() },
    { id: "search", label: "View: Show Search", shortcut: "Ctrl+Shift+F", action: () => setActivePanel("search") },
    { id: "source-control", label: "View: Show Source Control", shortcut: "Ctrl+Shift+G", action: () => setActivePanel("source-control") },
    { id: "invite", label: "Invite Collaborator", shortcut: "", action: () => setInviteOpen(true) },
    { id: "close-editor", label: "View: Close Editor", shortcut: "Ctrl+W", action: () => activeFileId && closeTab(activeFileId) },
    { id: "history", label: "File: Show Version History", shortcut: "", action: () => activeFileId && setHistoryOpen(true) },
    ...Object.entries(THEMES).map(([id, def]) => ({
      id: `theme-${id}`,
      label: `Preferences: Color Theme — ${def.label}`,
      shortcut: "",
      action: () => setTheme(id),
    })),
  ];

  // Close the online panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (onlinePanelRef.current && !onlinePanelRef.current.contains(e.target)) {
        setOnlinePanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- Global keyboard shortcuts (Phase 18) ---
  useEffect(() => {
    const onKeyDown = (e) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); setPaletteOpen(true); }
      else if (mod && e.key.toLowerCase() === "s") { e.preventDefault(); toast("Changes save automatically as you type", { icon: "💾" }); }
      else if (mod && e.key.toLowerCase() === "w") { e.preventDefault(); if (activeFileId) closeTab(activeFileId); }
      else if (mod && e.key === "`") { e.preventDefault(); setBottomPanel((p) => (p === "terminal" ? null : "terminal")); }
      else if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); setSidebarOpen((v) => !v); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); setActivePanel("explorer"); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "r") { e.preventDefault(); setActivePanel("requirements"); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "t") { e.preventDefault(); setActivePanel("tasks"); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "q") { e.preventDefault(); setActivePanel("qa"); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "h") { e.preventDefault(); useDashboardStore.getState().openDashboard(); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); setActivePanel("search"); }
      else if (mod && e.shiftKey && e.key.toLowerCase() === "g") { e.preventDefault(); setActivePanel("source-control"); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeFileId, closeTab]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center text-center px-6">
        <div>
          <p className="text-status-error text-sm mb-2">{loadError}</p>
          <button onClick={() => navigate("/dashboard")} className="text-accent text-xs hover:underline">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-subtle border-t-accent" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-bg-base overflow-hidden">
      {/* --- Room header --- */}
      <header className="h-11 shrink-0 flex items-center justify-between px-3 border-b border-border bg-bg-panel">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => navigate("/dashboard")} className="text-text-secondary hover:text-text-primary text-xs">
            CollabIDE
          </button>
          <ChevronRight size={13} className="text-text-muted shrink-0" />
          <span className="text-text-primary text-xs font-medium truncate">{project.name}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* ── Who's Online Panel ── */}
          <div className="relative" ref={onlinePanelRef}>
            <button
              onClick={() => setOnlinePanelOpen((v) => !v)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                onlinePanelOpen
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "bg-bg-elevated border-border-subtle text-text-secondary hover:text-text-primary hover:border-border"
              }`}
              title="Who's online in this workspace"
            >
              <span className="flex items-center -space-x-1.5">
                {participants.slice(0, 3).map((p) => (
                  <UserAvatar key={p.userId} user={p} size={22} showStatus online />
                ))}
                {participants.length > 3 && (
                  <span className="w-6 h-6 rounded-full bg-bg-panel border border-border text-[9px] font-bold text-text-muted flex items-center justify-center">
                    +{participants.length - 3}
                  </span>
                )}
              </span>
              <span className="flex items-center gap-1">
                <Wifi size={10} className="text-status-success" />
                {participants.length} online
              </span>
            </button>

            {/* Dropdown Panel */}
            {onlinePanelOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-bg-panel border border-border rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border bg-bg-elevated/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users size={13} className="text-accent" />
                    <span className="text-xs font-semibold text-text-primary">Active Collaborators</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-status-success/20 text-status-success font-bold">
                      {participants.length} Live
                    </span>
                  </div>
                  {/* DB Storage status */}
                  <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
                    <Database size={10} className="text-accent" />
                    <span>Stored in MongoDB</span>
                  </div>
                </div>

                {/* Participant list */}
                <div className="max-h-72 overflow-y-auto divide-y divide-border/50">
                  {participants.length === 0 ? (
                    <div className="p-4 text-center text-xs text-text-muted">No other users online</div>
                  ) : (
                    participants.map((p) => (
                      <div key={p.userId} className="px-4 py-3 flex items-center gap-3 hover:bg-bg-elevated/50 transition-colors">
                        {/* Avatar */}
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-sm"
                          style={{ backgroundColor: p.color || "#555" }}
                        >
                          {(p.name || "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-text-primary truncate">{p.name}</span>
                            <span
                              className="h-1.5 w-1.5 rounded-full bg-status-success flex-shrink-0 animate-pulse"
                              title="Online"
                            />
                          </div>
                          {p.activeFileName || p.activeFileId ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <FileCode size={10} className="text-accent shrink-0" />
                              <span className="text-[10px] text-accent font-mono truncate">
                                {p.activeFileName || p.activeFileId}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-text-muted italic">No file open</span>
                          )}
                        </div>

                        {/* Color swatch */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1 ring-offset-bg-panel"
                          style={{ backgroundColor: p.color || "#555", ringColor: p.color || "#555" }}
                          title={`Cursor color: ${p.color}`}
                        />
                      </div>
                    ))
                  )}
                </div>

                {/* Footer: DB sync proof */}
                <div className="px-4 py-2.5 border-t border-border bg-bg-elevated/60 flex items-center justify-between">
                  <span className="text-[10px] text-text-muted">Session saved to MongoDB <code className="text-accent">CollaborationSession</code></span>
                  <span className="text-[10px] text-status-success font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-status-success" />
                    Synced
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-text-secondary">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connectionState === "connected" ? "bg-status-success" : "bg-status-warning animate-pulse"
              }`}
            />
            {connectionState === "connected" ? "Connected" : "Reconnecting…"}
          </div>

          <button
            onClick={() => useDashboardStore.getState().openDashboard()}
            className="flex items-center gap-1.5 bg-bg-elevated hover:bg-border text-text-primary border border-border-subtle text-xs font-medium px-2.5 py-1 rounded transition-colors"
            title="Project Health & Team Workload (Ctrl+Shift+H)"
          >
            <Activity size={12} className="text-accent" />
            Health
          </button>

          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={`flex items-center gap-1.5 ${
              historyOpen ? "bg-accent/20 text-accent border-accent/40" : "bg-bg-elevated hover:bg-border text-text-primary"
            } border border-border-subtle text-xs font-medium px-2.5 py-1 rounded transition-colors`}
            title="File Version Timeline & Revert Changes"
          >
            <History size={12} className="text-accent" />
            Revert
          </button>

          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-2.5 py-1 rounded"
          >
            <Link2 size={12} />
            Invite
          </button>
          <select
            value={themeId}
            onChange={(e) => setTheme(e.target.value)}
            title="Color Theme"
            className="bg-bg-elevated border border-border-subtle rounded text-[11px] text-text-secondary px-1.5 py-1 outline-none"
          >
            {Object.entries(THEMES).map(([id, def]) => (
              <option key={id} value={id}>{def.label}</option>
            ))}
          </select>
          <button onClick={() => setPaletteOpen(true)} className="text-text-muted hover:text-text-primary" title="Command Palette (Ctrl+Shift+P)">
            <Command size={15} />
          </button>
          <button className="text-text-muted hover:text-text-primary" title="Settings">
            <Settings size={15} />
          </button>
        </div>
      </header>

      {/* --- Main IDE body --- */}
      <div className="flex-1 flex min-h-0">
        <ActivityBar active={activePanel} onChange={setActivePanel} />

        {sidebarOpen && (
          <div
            className={`${
              activePanel === "requirements" || activePanel === "tasks" || activePanel === "qa" || activePanel === "team" || activePanel === "ai"
                ? "w-80"
                : "w-60"
            } shrink-0 border-r border-border bg-bg-panel transition-[width] duration-150`}
          >
            {activePanel === "explorer" && <FileExplorer projectId={projectId} canEdit={canEdit} />}
            {activePanel === "requirements" && (
              <RequirementsPanel
                projectId={projectId}
                canEdit={canEdit}
                onOpenTaskBoard={() => setActivePanel("tasks")}
              />
            )}
            {activePanel === "tasks" && <TasksPanel projectId={projectId} canEdit={canEdit} />}
            {activePanel === "qa" && <QAPanel projectId={projectId} canEdit={canEdit} />}
            {activePanel === "team" && (
              <TeamCollabPanel
                projectId={projectId}
                activeFile={activeFileMeta}
                onOpenFile={(fileName) => {
                  const target = files.find((f) => f.name === fileName || f.path?.endsWith(fileName));
                  if (target) openFile(target);
                  else toast.error(`File "${fileName}" not found in project`);
                }}
              />
            )}
            {activePanel === "ai" && (
              <AICopilotPanel
                projectId={projectId}
                activeFile={activeFileMeta}
                onInsertCode={(code) => {
                  if (activeFileId) {
                    getSocket().emit("replace-file-content", { projectId, fileId: activeFileId, content: code });
                  } else {
                    toast.error("Please open a file in the editor first");
                  }
                }}
              />
            )}
            {activePanel === "search" && <SearchPanel projectId={projectId} canEdit={canEdit} />}
            {activePanel === "source-control" && <SourceControlPanel projectId={projectId} canEdit={canEdit} />}
            {activePanel === "run" && <DebugPanel />}
            {activePanel === "extensions" && <ExtensionsPanel />}
          </div>
        )}


        <div className="flex-1 flex flex-col min-w-0 relative">
          <EditorTabs />

          {!activeTab ? (
            <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
              Select a file from the Explorer to start editing
            </div>
          ) : (
            <div className="flex-1 min-h-0 relative">
              <Suspense
                fallback={
                  <div className="h-full flex items-center justify-center text-text-muted text-xs gap-2">
                    <div className="w-4 h-4 border-2 border-border-subtle border-t-accent rounded-full animate-spin" />
                    Loading editor…
                  </div>
                }
              >
                <CodeEditor
                  key={activeTab.fileId}
                  projectId={projectId}
                  fileId={activeTab.fileId}
                  language={activeFileMeta?.language || activeTab.language}
                  readOnly={!canEdit}
                />
              </Suspense>
              {historyOpen && (
                <VersionHistoryPanel
                  projectId={projectId}
                  fileId={activeTab.fileId}
                  fileName={activeTab.name}
                  canEdit={canEdit}
                  onClose={() => setHistoryOpen(false)}
                />
              )}
            </div>
          )}

          {bottomPanel && (
            <div className="h-56 shrink-0 border-t border-border flex flex-col">
              <div className="flex items-center border-b border-border bg-bg-panel px-1">
                <button
                  onClick={() => setBottomPanel("problems")}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-wide ${bottomPanel === "problems" ? "text-text-primary border-b-2 border-accent" : "text-text-muted"}`}
                >
                  Problems {problemCount > 0 && `(${problemCount})`}
                </button>
                <button
                  onClick={() => setBottomPanel("terminal")}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-wide ${bottomPanel === "terminal" ? "text-text-primary border-b-2 border-accent" : "text-text-muted"}`}
                >
                  Terminal
                </button>
                <button onClick={() => setBottomPanel(null)} className="ml-auto px-2 text-text-muted hover:text-text-primary text-xs">
                  ✕
                </button>
              </div>
              <div className="flex-1 min-h-0">
                {bottomPanel === "terminal" && <Terminal projectId={projectId} canEdit={canEdit} />}
                {bottomPanel === "problems" && <ProblemsPanel />}
              </div>
            </div>
          )}

          {/* --- Status bar --- */}
          <div className="h-6 shrink-0 flex items-center justify-between px-3 bg-accent text-white text-[11px]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Users size={11} />
                {participants.length}/{project.maxMembers}
              </span>
              <span>{role === "owner" ? "Owner" : role === "editor" ? "Editor" : "Viewer"}</span>
              {problemCount > 0 && (
                <button onClick={() => setBottomPanel("problems")} className="hover:underline">
                  ⚠ {problemCount}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeTab && (
                <button onClick={() => setHistoryOpen((v) => !v)} className="hover:underline">
                  History
                </button>
              )}
              <span>{activeFileMeta?.language || "plaintext"}</span>
              <span>UTF-8</span>
            </div>
          </div>
        </div>
      </div>

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        project={project}
        onCopy={handleCopyInvite}
      />

      <ProjectHealthDashboard
        projectId={projectId}
        onNavigateToTask={() => setActivePanel("tasks")}
        onOpenFile={(fileName) => {
          const target = files.find((f) => f.name === fileName || f.path?.endsWith(fileName));
          if (target) openFile(target);
          else toast.error(`File "${fileName}" not found in project`);
        }}
      />


      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </div>
  );
}
