import { Link } from "react-router-dom";
import { Code2, Users, MousePointer2, FolderGit2, Link2, Globe2, ShieldCheck } from "lucide-react";

const FEATURES = [
  { icon: Users, title: "Real-time collaboration", desc: "Up to 4 people editing the same project, the same file, the same line — simultaneously." },
  { icon: Code2, title: "VS Code-like editor", desc: "Monaco-powered editing with IntelliSense, multi-cursor, folding, and syntax highlighting." },
  { icon: MousePointer2, title: "Live cursors", desc: "See exactly where your teammates are typing, with named, colored cursors." },
  { icon: FolderGit2, title: "Shared workspace", desc: "One file tree, one source of truth, synced instantly across every collaborator." },
  { icon: Link2, title: "Instant invite links", desc: "Generate a link, send it, and your team is coding with you in seconds." },
  { icon: Globe2, title: "Multi-language support", desc: "JavaScript, TypeScript, Python, HTML/CSS, JSON, Markdown, and more." },
  { icon: ShieldCheck, title: "Secure workspaces", desc: "JWT auth, role-based permissions, and server-validated room access." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <nav className="border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="text-accent" size={22} />
          <span className="font-semibold">CollabIDE</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="text-text-secondary hover:text-text-primary">
            Sign in
          </Link>
          <Link
            to="/register"
            className="bg-accent hover:bg-accent-hover text-white px-3 py-1.5 rounded"
          >
            Get started
          </Link>
        </div>
      </nav>

      <header className="max-w-3xl mx-auto text-center px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Code Together.
          <br />
          Build Together.
        </h1>
        <p className="text-text-secondary text-base max-w-xl mx-auto mb-8">
          A real-time collaborative development environment for teams that want to build software together.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            to="/register"
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded"
          >
            Start Coding
          </Link>
          <Link
            to="/login"
            className="border border-border-subtle hover:border-text-secondary text-sm font-medium px-5 py-2.5 rounded"
          >
            Join Workspace
          </Link>
        </div>
      </header>

      {/* Simplified animated IDE preview */}
      <div className="max-w-4xl mx-auto px-6 mb-24">
        <div className="rounded-md border border-border bg-bg-elevated overflow-hidden shadow-2xl">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-bg-panel">
            <span className="h-2.5 w-2.5 rounded-full bg-status-error/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-status-success/70" />
            <span className="ml-3 text-xs text-text-muted mono">App.jsx — AI Chat Application</span>
          </div>
          <div className="mono text-xs p-4 text-text-secondary leading-relaxed">
            <div><span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-orange-300">"react"</span>;</div>
            <div className="h-2" />
            <div><span className="text-blue-400">function</span> <span className="text-yellow-300">App</span>() {"{"}</div>
            <div className="pl-4 relative">
              <span className="text-purple-400">return</span> (
              <span className="ml-2 bg-accent/20 border-l-2 border-accent pl-1">
                &lt;div&gt;Hello, team!&lt;/div&gt;
              </span>
              <span className="absolute -top-4 left-24 text-[10px] bg-accent text-white px-1 rounded">
                Aaqil
              </span>
            </div>
            <div className="pl-4">)</div>
            <div>{"}"}</div>
          </div>
        </div>
      </div>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="border border-border rounded-md p-4 bg-bg-elevated">
            <Icon className="text-accent mb-2" size={20} />
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-xs text-text-secondary leading-relaxed">{desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t border-border px-6 py-8 text-center">
        <Link
          to="/register"
          className="inline-block bg-accent hover:bg-accent-hover text-white text-sm font-medium px-5 py-2.5 rounded"
        >
          Start Coding Together
        </Link>
      </footer>
    </div>
  );
}
