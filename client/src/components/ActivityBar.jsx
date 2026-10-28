import {
  Files,
  Search,
  GitBranch,
  Play,
  Blocks,
  ListChecks,
  CheckSquare,
  FlaskConical,
  MessageSquare,
  Sparkles,
} from "lucide-react";

const ITEMS = [
  { key: "explorer", icon: Files, label: "Explorer" },
  { key: "requirements", icon: ListChecks, label: "Requirements" },
  { key: "tasks", icon: CheckSquare, label: "Tasks & Traceability" },
  { key: "qa", icon: FlaskConical, label: "Testing & QA" },
  { key: "team", icon: MessageSquare, label: "Team Hub (Chat & Call)" },
  { key: "ai", icon: Sparkles, label: "AI Copilot & Code Engine" },
  { key: "search", icon: Search, label: "Search" },
  { key: "source-control", icon: GitBranch, label: "Source Control" },
  { key: "run", icon: Play, label: "Run & Debug" },
  { key: "extensions", icon: Blocks, label: "Extensions" },
];


export default function ActivityBar({ active, onChange }) {
  return (
    <div className="w-11 shrink-0 bg-bg-panel border-r border-border flex flex-col items-center py-2 gap-1">
      {ITEMS.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          title={label}
          onClick={() => onChange(key)}
          className={`relative w-9 h-9 flex items-center justify-center rounded ${
            active === key ? "text-text-primary" : "text-text-muted hover:text-text-secondary"
          }`}
        >
          {active === key && <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-accent rounded" />}
          <Icon size={19} />
        </button>
      ))}
    </div>
  );
}
