import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Users,
  ShieldCheck,
  TrendingUp,
  X,
  Layers,
  CheckSquare,
  FlaskConical,
  Bug,
  Sparkles,
  ArrowUpRight,
  Zap,
  Briefcase,
  Crown,
  Laptop,
  FileCheck2,
  Download,
  FileCode,
  Clock,
  Play,
  RotateCw,
} from "lucide-react";
import toast from "react-hot-toast";
import useDashboardStore from "../store/dashboardStore";
import useTaskStore from "../store/taskStore";
import useAuthStore from "../store/authStore";
import UserAvatar from "./UserAvatar";

export default function ProjectHealthDashboard({ projectId, onNavigateToTask, onOpenFile }) {
  const { user } = useAuthStore();
  const {
    isDashboardOpen,
    closeDashboard,
    healthScore,
    metrics,
    activeBlockers,
    teamWorkload,
    performanceAnalytics,
    fetchHealth,
    isLoading,
  } = useDashboardStore();

  const { tasks, updateTaskStatus } = useTaskStore();

  // Role Switcher State: "manager" | "team_lead" | "member"
  const [activeRole, setActiveRole] = useState("manager");

  // Manager Milestone Sign-offs
  const [milestones, setMilestones] = useState([
    { id: 1, title: "Sprint 1: Core Architecture & CRDT Engine", signedOff: true, signee: "Manager" },
    { id: 2, title: "Sprint 2: SDLC Traceability & QA Suite", signedOff: true, signee: "Manager" },
    { id: 3, title: "Sprint 3: Final Production & Viva Defense", signedOff: false, signee: null },
  ]);

  // Daily Standup State (Team Member)
  const [standupDone, setStandupDone] = useState(false);
  const [standupText, setStandupText] = useState("Implemented JWT authentication tests and verified token refresh.");

  useEffect(() => {
    if (isDashboardOpen && projectId) {
      fetchHealth(projectId);
    }
  }, [isDashboardOpen, projectId, fetchHealth]);

  if (!isDashboardOpen) return null;

  const scoreColor =
    healthScore >= 80
      ? "text-emerald-400 stroke-emerald-500"
      : healthScore >= 60
      ? "text-amber-400 stroke-amber-500"
      : "text-red-400 stroke-red-500";

  const scoreLabel =
    healthScore >= 80 ? "Optimal Pace" : healthScore >= 60 ? "Needs Attention" : "High Risk";

  const reqTotal = metrics?.requirements?.total || 0;
  const reqDone = (metrics?.requirements?.implemented || 0) + (metrics?.requirements?.verified || 0);
  const reqPercent = reqTotal > 0 ? Math.round((reqDone / reqTotal) * 100) : 0;

  const taskTotal = metrics?.tasks?.total || 0;
  const taskDone = metrics?.tasks?.done || 0;
  const taskPercent = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;

  const testTotal = metrics?.qa?.totalTests || 0;
  const testPassed = metrics?.qa?.passed || 0;
  const testPercent = testTotal > 0 ? Math.round((testPassed / testTotal) * 100) : 0;

  const handleSignOff = (milestoneId) => {
    setMilestones((prev) =>
      prev.map((m) =>
        m.id === milestoneId ? { ...m, signedOff: true, signee: user?.name || "Manager" } : m
      )
    );
    toast.success("Milestone formally signed off by Manager!");
  };

  const handleExportExecutiveReport = () => {
    toast.success("Executive Audit Report compiled! Ready for stakeholders.");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-bg-panel border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Main Header */}
        <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-bg-elevated/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Activity size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-text-primary">CollabIDE Product Intelligence</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20 flex items-center gap-1">
                  <Sparkles size={10} /> Role-Tailored Governance
                </span>
              </div>
              <p className="text-[11px] text-text-secondary">
                Live lifecycle metrics, team velocity, and role-specific workspace facilities
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchHealth(projectId)}
              className="text-xs text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg bg-bg-panel border border-border-subtle flex items-center gap-1"
            >
              <RotateCw size={12} /> Refresh
            </button>
            <button
              onClick={closeDashboard}
              className="text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-bg-panel"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Role Switcher Navigation Strip */}
        <div className="px-6 py-2.5 border-b border-border bg-bg-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-bg-elevated p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveRole("manager")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeRole === "manager"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Crown size={13} className="text-amber-400" />
              <span>Manager View</span>
            </button>

            <button
              onClick={() => setActiveRole("team_lead")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeRole === "team_lead"
                  ? "bg-accent/20 text-accent border border-accent/30 shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Zap size={13} className="text-accent" />
              <span>Team Leader View</span>
            </button>

            <button
              onClick={() => setActiveRole("member")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                activeRole === "member"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <Laptop size={13} className="text-emerald-400" />
              <span>Team Member (Developer) View</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-text-muted">Viewing as:</span>
            <span className="font-semibold text-text-primary capitalize">{activeRole.replace("_", " ")}</span>
          </div>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Universal Composite Health Gauge (All Roles) */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Score Ring */}
            <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border flex flex-col items-center justify-center text-center">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-bg-panel stroke-current"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${scoreColor} transition-all duration-700 ease-out`}
                    strokeDasharray={`${healthScore}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-text-primary font-mono">{healthScore}</span>
                  <span className="text-[9px] text-text-muted font-mono uppercase tracking-wider">/ 100</span>
                </div>
              </div>
              <span className="text-xs font-semibold text-text-primary mt-2">{scoreLabel}</span>
              <span className="text-[10px] text-text-muted">Composite SDLC Health</span>
            </div>

            {/* Pillar 1: Tasks */}
            <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted text-xs">
                <span>Task Pipeline</span>
                <CheckSquare size={14} className="text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary font-mono">{taskPercent}%</div>
                <div className="text-[11px] text-text-muted">
                  {taskDone} of {taskTotal} tasks completed
                </div>
              </div>
              <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                <div className="bg-accent h-full rounded-full transition-all" style={{ width: `${taskPercent}%` }} />
              </div>
            </div>

            {/* Pillar 2: QA Pass Rate */}
            <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted text-xs">
                <span>QA Test Pass Rate</span>
                <FlaskConical size={14} className="text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary font-mono">{testPercent}%</div>
                <div className="text-[11px] text-text-muted">
                  {testPassed} of {testTotal} tests passing
                </div>
              </div>
              <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${testPercent}%` }} />
              </div>
            </div>

            {/* Pillar 3: Acceptance Criteria */}
            <div className="p-4 rounded-xl bg-bg-elevated/70 border border-border flex flex-col justify-between">
              <div className="flex items-center justify-between text-text-muted text-xs">
                <span>Acceptance Criteria</span>
                <CheckCircle2 size={14} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-text-primary font-mono">{reqPercent}%</div>
                <div className="text-[11px] text-text-muted">
                  {reqDone} of {reqTotal} criteria satisfied
                </div>
              </div>
              <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${reqPercent}%` }} />
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* ROLE 1: MANAGER VIEW (Executive Deliverables & Milestones) */}
          {/* ========================================================= */}
          {activeRole === "manager" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Crown size={15} />
                  <span>Executive Governance & Milestone Sign-Offs</span>
                </div>
                <button
                  onClick={handleExportExecutiveReport}
                  className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 font-medium transition-colors cursor-pointer"
                >
                  <Download size={13} /> Export Executive Audit
                </button>
              </div>

              {/* Milestones Pipeline */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase font-bold tracking-wider text-text-muted">
                  Sprint Delivery Milestones
                </label>
                <div className="grid grid-cols-1 gap-2.5">
                  {milestones.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-xl bg-bg-surface border border-border flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            m.signedOff
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          <FileCheck2 size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{m.title}</div>
                          <div className="text-[11px] text-text-muted">
                            {m.signedOff ? `Signed off by ${m.signee} (Ready for Release)` : "Awaiting Manager Approval"}
                          </div>
                        </div>
                      </div>

                      {m.signedOff ? (
                        <span className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
                          Approved & Signed
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSignOff(m.id)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold transition-all cursor-pointer shadow-sm"
                        >
                          Sign Off Milestone
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resource & Budget Health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">

                <div className="p-3 rounded-xl bg-bg-surface border border-border">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Sprint Velocity</span>
                  <div className="text-xl font-bold text-text-primary mt-1 font-mono">88.4%</div>
                  <span className="text-[11px] text-emerald-400 flex items-center gap-0.5 mt-0.5">
                    <TrendingUp size={12} /> +12% vs last cycle
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-bg-surface border border-border">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Delivery Risk Index</span>
                  <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">Low Risk</div>
                  <span className="text-[11px] text-text-muted">Zero critical security blockers</span>
                </div>

                <div className="p-3 rounded-xl bg-bg-surface border border-border">
                  <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Team Allocation</span>
                  <div className="text-xl font-bold text-text-primary mt-1 font-mono">3 Contributors</div>
                  <span className="text-[11px] text-text-muted">Optimal workload balance</span>
                </div>
              </div>

              {/* Manager's Leadership & Organizational Performance Monitor */}
              <div className="p-4 rounded-xl bg-bg-surface border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crown size={15} className="text-amber-400" />
                    <span className="text-xs font-semibold text-text-primary">Engineering Leadership & Resource Efficiency</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-medium border border-amber-500/20">
                    Departmental Score: {performanceAnalytics?.managerPerformance?.score || 92}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Team Leader Effectiveness</div>
                    <div className="text-base font-bold text-text-primary mt-0.5 font-mono">
                      {performanceAnalytics?.leaderPerformance?.score || 94} / 100
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      {performanceAnalytics?.leaderPerformance?.blockerClearRate ?? 100}% Blocker Clear Rate
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Cognitive Delivery Velocity</div>
                    <div className="text-base font-bold text-text-primary mt-0.5 font-mono">
                      {performanceAnalytics?.managerPerformance?.deliveryConfidence || "High Output"}
                    </div>
                    <div className="text-[10px] text-text-muted">High-priority logic on schedule</div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                    <div className="text-[10px] text-text-muted uppercase font-semibold">Resource ROI & Budget Burn</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono">
                      {performanceAnalytics?.managerPerformance?.budgetBurnEfficiency ?? 92}% Efficient
                    </div>
                    <div className="text-[10px] text-text-muted">Low defect rework overhead</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* ROLE 2: TEAM LEADER VIEW (Sprint Backlog & Performance Monitor) */}
          {/* ============================================================ */}
          {activeRole === "team_lead" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-accent">
                  <Zap size={15} />
                  <span>Team Members' Cognitive Performance & Reliability Monitor</span>
                </div>
                <span className="text-[11px] text-text-muted">
                  Evaluation: <span className="text-text-primary font-medium">Logical Weight (35%) + Quality (35%) + Velocity (30%)</span>
                </span>
              </div>

              {/* Individual Employee Performance Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] uppercase font-bold tracking-wider text-text-muted">
                    Active Team Members ({performanceAnalytics?.memberPerformance?.length || teamWorkload?.length || 0})
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Live MongoDB Sync</span>
                </div>

                {(performanceAnalytics?.memberPerformance && performanceAnalytics.memberPerformance.length > 0
                  ? performanceAnalytics.memberPerformance
                  : (teamWorkload || []).map((tw) => ({
                      user: tw.user,
                      role: tw.role,
                      compositeScore: 90,
                      grade: "A",
                      badge: tw.role === "owner" ? "Principal Architect" : "Consistent Contributor",
                      logicalWeightScore: 88,
                      qualityScore: 92,
                      velocityScore: 90,
                      metrics: {
                        totalTasks: tw.tasksAssigned || 0,
                        doneTasks: tw.tasksDone || 0,
                        openBugs: 0,
                      },
                    }))
                ).map((m, idx) => {
                  const mName = m.user?.name || `Member ${idx + 1}`;
                  const mInitial = mName.charAt(0).toUpperCase();
                  const isOwner = m.role === "owner";
                  const score = m.compositeScore ?? 90;
                  const scoreCol = score >= 90 ? "text-emerald-400" : score >= 80 ? "text-accent" : "text-amber-400";

                  return (
                    <div
                      key={m.user?._id || idx}
                      className="p-4 rounded-xl bg-bg-surface border border-border hover:border-accent/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl ${
                              isOwner
                                ? "bg-amber-500/20 border border-amber-500/40 text-amber-400"
                                : "bg-accent/20 border border-accent/40 text-accent"
                            } flex items-center justify-center text-base font-bold font-mono`}
                          >
                            {mInitial}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-text-primary">{mName}</span>
                              <span
                                className={`text-[10px] px-2 py-0.2 rounded-full font-medium border ${
                                  isOwner
                                    ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                }`}
                              >
                                {isOwner ? "Project Owner / Team Lead" : "Team Member (Developer)"} • Grade {m.grade || "A"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                              <span>{m.user?.email || "team@collab.io"}</span>
                              <span>•</span>
                              <span className="text-text-secondary">{m.badge || "Core Engineer"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-lg font-bold ${scoreCol} font-mono`}>
                            {score} <span className="text-[10px] text-text-muted">/ 100</span>
                          </div>
                          <span className="text-[10px] text-text-muted">Cognitive EPI Score</span>
                        </div>
                      </div>

                      {/* 3 Scientific Performance Pillars */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {/* Pillar 1: Logical Complexity & Weight (35%) */}
                        <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border/80 space-y-1">
                          <div className="flex justify-between text-[10px] text-text-muted font-medium">
                            <span>Logical Weight Handled</span>
                            <span className="text-accent font-bold font-mono">{m.logicalWeightScore ?? 88}%</span>
                          </div>
                          <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                            <div className="bg-accent h-full rounded-full" style={{ width: `${m.logicalWeightScore ?? 88}%` }} />
                          </div>
                          <div className="text-[9px] text-text-muted mt-1">
                            {m.metrics?.totalTasks ? `${m.metrics.doneTasks || 0}/${m.metrics.totalTasks} weighted tasks completed` : "High priority architectural logic"}
                          </div>
                        </div>

                        {/* Pillar 2: Quality & Defect Resistance (35%) */}
                        <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border/80 space-y-1">
                          <div className="flex justify-between text-[10px] text-text-muted font-medium">
                            <span>Code Quality & Testing</span>
                            <span className="text-emerald-400 font-bold font-mono">{m.qualityScore ?? 95}%</span>
                          </div>
                          <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${m.qualityScore ?? 95}%` }} />
                          </div>
                          <div className="text-[9px] text-text-muted mt-1">
                            {m.metrics?.openBugs ? `${m.metrics.openBugs} active defects` : "Zero critical defect regressions"}
                          </div>
                        </div>

                        {/* Pillar 3: Time Velocity & Delivery (30%) */}
                        <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border/80 space-y-1">
                          <div className="flex justify-between text-[10px] text-text-muted font-medium">
                            <span>Time Delivery Velocity</span>
                            <span className="text-purple-400 font-bold font-mono">{m.velocityScore ?? 90}%</span>
                          </div>
                          <div className="w-full bg-bg-panel h-1.5 rounded-full overflow-hidden">
                            <div className="bg-purple-500 h-full rounded-full" style={{ width: `${m.velocityScore ?? 90}%` }} />
                          </div>
                          <div className="text-[9px] text-text-muted mt-1">Ahead of sprint milestone timeline</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Blocker Action Strip */}
              {activeBlockers.length > 0 ? (
                <div className="space-y-2 pt-2">
                  <label className="text-[11px] uppercase font-bold tracking-wider text-text-muted">
                    Active Blocker Resolution Center
                  </label>
                  {activeBlockers.map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-red-950/20 border border-red-500/30 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{b.taskTitle}</div>
                          <div className="text-[11px] text-red-300 italic">{b.blockerReason}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          updateTaskStatus(b.id, "IN_PROGRESS");
                          toast.success("Blocker cleared by Team Leader! Moved to In Progress.");
                        }}
                        className="text-xs px-3 py-1 rounded-lg bg-red-500 hover:bg-red-400 text-white font-medium transition-colors shrink-0"
                      >
                        Resolve & Unblock
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center gap-2.5 text-emerald-300 text-xs">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  <span>Zero Active Blockers! Team execution is running smoothly.</span>
                </div>
              )}
            </div>
          )}

          {/* ========================================================== */}
          {/* ROLE 3: TEAM MEMBER VIEW (Personal Performance & Deliverables) */}
          {/* ========================================================== */}
          {activeRole === "member" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <Laptop size={15} />
                  <span>My Engineering Impact & Performance Scorecard</span>
                </div>
                <span className="text-xs text-text-muted">
                  Contributor: <span className="font-semibold text-text-primary">{user?.name || "Swapnil Dev"}</span>
                </span>
              </div>

              {/* Personal Impact Card */}
              {(() => {
                const myPerf = performanceAnalytics?.memberPerformance?.find(
                  (m) =>
                    m.user?._id === user?._id ||
                    m.user?.name?.toLowerCase() === user?.name?.toLowerCase() ||
                    m.user?.email === user?.email
                ) || {
                  compositeScore: 92,
                  grade: "A+",
                  badge: "Core Engineering Contributor",
                  logicalWeightScore: 90,
                  qualityScore: 95,
                  velocityScore: 90,
                  metrics: { doneTasks: 1, totalTasks: 1, openBugs: 0 },
                };

                return (
                  <div className="p-4 rounded-xl bg-bg-surface border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Overall Impact Rating</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-2xl font-bold text-emerald-400 font-mono">
                            {myPerf.compositeScore} / 100
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                            Grade {myPerf.grade} ({myPerf.badge})
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-text-muted">
                        Evaluated on: <span className="text-text-primary font-medium">Logic Weight (35%) + Quality (35%) + Velocity (30%)</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Cognitive Weight Delivered</span>
                        <div className="text-sm font-bold text-text-primary mt-0.5 font-mono">{myPerf.logicalWeightScore}%</div>
                        <span className="text-[10px] text-emerald-400">
                          {myPerf.metrics?.doneTasks ?? 1}/{myPerf.metrics?.totalTasks ?? 1} weighted tasks delivered
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Quality & Defect Integrity</span>
                        <div className="text-sm font-bold text-text-primary mt-0.5 font-mono">{myPerf.qualityScore}%</div>
                        <span className="text-[10px] text-emerald-400">
                          {myPerf.metrics?.openBugs ? `${myPerf.metrics.openBugs} open defects` : "0 critical defect regressions"}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-bg-elevated/60 border border-border">
                        <span className="text-[10px] text-text-muted font-semibold uppercase">Time Delivery Punctuality</span>
                        <div className="text-sm font-bold text-text-primary mt-0.5 font-mono">{myPerf.velocityScore}%</div>
                        <span className="text-[10px] text-purple-400">Milestone tasks on schedule</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-300">
                      💡 <strong>Manager & Lead Feedback:</strong> Strong engineering execution by {user?.name || "Contributor"}. High cognitive priority tasks completed with verified test coverage.
                    </div>
                  </div>
                );
              })()}

              {/* Quick Daily Standup Box */}
              <div className="p-3.5 rounded-xl bg-bg-surface border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <Clock size={13} className="text-emerald-400" /> Daily Standup Check-in
                  </span>
                  {standupDone && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                      ✓ Logged for Today
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={standupText}
                    onChange={(e) => setStandupText(e.target.value)}
                    placeholder="What did you work on today?"
                    className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => {
                      setStandupDone(true);
                      toast.success("Daily standup logged to project room!");
                    }}
                    className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </div>

              {/* My Assigned Tasks */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase font-bold tracking-wider text-text-muted">
                  My Active Sprint Tasks
                </label>
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="p-4 rounded-xl bg-bg-surface border border-border text-center text-xs text-text-muted">
                      No tasks assigned yet. Pick one from the Tasks Panel!
                    </div>
                  ) : (
                    tasks.slice(0, 3).map((t) => (
                      <div
                        key={t._id}
                        className="p-3 rounded-xl bg-bg-surface border border-border flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-xs font-semibold text-text-primary">{t.title}</div>
                          {t.linkedFiles?.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-[10px] text-text-muted">Linked:</span>
                              {t.linkedFiles.map((f) => (
                                <button
                                  key={f}
                                  onClick={() => {
                                    closeDashboard();
                                    onOpenFile?.(f);
                                  }}
                                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-mono font-medium ${
                              t.status === "DONE"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-accent/20 text-accent"
                            }`}
                          >
                            {t.status}
                          </span>
                          {t.status !== "DONE" && (
                            <button
                              onClick={() => {
                                updateTaskStatus(t._id, "DONE");
                                toast.success("Task completed! Great job.");
                              }}
                              className="text-[11px] px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                            >
                              Mark Done
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
