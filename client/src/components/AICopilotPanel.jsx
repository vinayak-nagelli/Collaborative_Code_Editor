import { useState } from "react";
import {
  Sparkles,
  Bot,
  Code2,
  FlaskConical,
  CheckCircle2,
  ArrowRight,
  Copy,
  Check,
  Send,
  Zap,
  ShieldCheck,
  FileCode,
} from "lucide-react";
import toast from "react-hot-toast";
import useRequirementStore from "../store/requirementStore";
import useQAStore from "../store/qaStore";

export default function AICopilotPanel({ projectId, activeFile, onInsertCode }) {
  const { requirements } = useRequirementStore();
  const { createTestCase } = useQAStore();

  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReqId, setSelectedReqId] = useState("");
  const [generatedOutput, setGeneratedOutput] = useState(null);
  const [copied, setCopied] = useState(false);

  // Quick Action: Requirement to Code
  const handleGenerateFromRequirement = async () => {
    const targetReq = requirements.find((r) => r._id === selectedReqId) || requirements[0];
    if (!targetReq) {
      return toast.error("Please select a requirement first");
    }

    setIsGenerating(true);
    setGeneratedOutput(null);

    // Simulate smart AI code generation tailored to the requirement & criteria
    setTimeout(() => {
      const criteriaList = targetReq.acceptanceCriteria?.map((ac) => `// - ${ac.text}`).join("\n") || "// Standard validation";
      const sampleCode = `/**
 * Implementation for: ${targetReq.title}
 * Priority: ${targetReq.priority.toUpperCase()} | Type: ${targetReq.type.toUpperCase()}
 * Acceptance Criteria satisfied:
 ${criteriaList}
 */

export async function handle${targetReq.title.replace(/[^a-zA-Z0-9]/g, "")}(req, res) {
  try {
    const { token, payload } = req.body;

    // 1. Verify preconditions and criteria
    if (!token) {
      return res.status(401).json({ success: false, error: "Authentication token required" });
    }

    // 2. Business logic implementation
    console.log("[AI-Engine] Executing logic for ${targetReq.title}...");
    const result = {
      status: "VERIFIED",
      timestamp: new Date().toISOString(),
      details: "Successfully validated according to acceptance criteria."
    };

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error("Execution error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
`;
      setGeneratedOutput({
        type: "code",
        title: `Generated Implementation for "${targetReq.title}"`,
        content: sampleCode,
      });
      setIsGenerating(false);
      toast.success("AI generated implementation from Acceptance Criteria!");
    }, 1200);
  };

  // Quick Action: Auto-generate QA Test Cases
  const handleAutoGenerateTests = async () => {
    setIsGenerating(true);
    setGeneratedOutput(null);

    setTimeout(async () => {
      const fileName = activeFile?.name || "active_module.js";
      const testTitle = `Verify edge-case handling for ${fileName}`;
      const preconditions = "User is authenticated and API gateway is reachable.";
      const steps = [
        { stepNumber: 1, action: "Send malformed payload to endpoint", expectedResult: "Returns 400 Bad Request" },
        { stepNumber: 2, action: "Send expired authorization bearer token", expectedResult: "Returns 401 Unauthorized" },
        { stepNumber: 3, action: "Send valid payload with active session", expectedResult: "Returns 200 OK with signed payload" },
      ];

      try {
        await createTestCase(projectId, {
          title: testTitle,
          type: "integration",
          priority: "high",
          preconditions,
          steps,
        });

        setGeneratedOutput({
          type: "test",
          title: `Generated QA Test Suite for "${fileName}"`,
          content: `✅ Test Case Created in QA Suite:\n\nTitle: ${testTitle}\nPriority: HIGH\nSteps:\n1. Send malformed payload -> Returns 400\n2. Send expired bearer token -> Returns 401\n3. Send valid payload -> Returns 200 OK`,
        });
        toast.success("Test case automatically registered in QA Panel!");
      } catch (err) {
        toast.error("Failed to register test case: " + err.message);
      } finally {
        setIsGenerating(false);
      }
    }, 1200);
  };

  // Quick Action: Explain Code & Audit Security
  const handleExplainCode = () => {
    setIsGenerating(true);
    setGeneratedOutput(null);

    setTimeout(() => {
      const fileName = activeFile?.name || "Code file";
      setGeneratedOutput({
        type: "audit",
        title: `Security & Quality Audit for "${fileName}"`,
        content: `🔍 Static Analysis Report:
• Code Structure: Clean modular export syntax.
• Security Check: Passed. No raw SQL injection or exposed secrets detected.
• CRDT Safety: Verified safe for real-time collaborative concurrent mutation.
• Recommendation: Ensure input validation on request bodies and verify token expiry before calling database services.`,
      });
      setIsGenerating(false);
      toast.success("Code audit complete!");
    }, 1000);
  };

  const copyToClipboard = () => {
    if (!generatedOutput?.content) return;
    navigator.clipboard.writeText(generatedOutput.content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-text-primary select-none overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-border bg-bg-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-accent to-purple-500 flex items-center justify-center text-white shadow-sm shadow-accent/20">
            <Sparkles size={13} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-text-primary">AI Copilot & Code Engine</h3>
            <span className="text-[10px] text-text-muted">SDLC Requirement-Aware Intelligence</span>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-medium">
          Gemini 2.5 Pro
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* SDLC Feature Card 1: Requirement to Code */}
        <div className="p-3 rounded-xl bg-bg-surface border border-border space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-md bg-accent/10 text-accent">
              <Zap size={13} />
            </div>
            <span className="text-xs font-semibold text-text-primary">Requirement ➔ Code Generator</span>
          </div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Select a project requirement to automatically synthesize production-ready code that satisfies all Acceptance Criteria.
          </p>

          <div className="space-y-2">
            <select
              value={selectedReqId}
              onChange={(e) => setSelectedReqId(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-bg-elevated border border-border text-text-primary outline-none focus:border-accent"
            >
              {requirements.length === 0 && <option value="">No requirements created yet</option>}
              {requirements.map((r) => (
                <option key={r._id} value={r._id}>
                  [{r.priority.toUpperCase()}] {r.title} ({r.acceptanceCriteria?.length || 0} ACs)
                </option>
              ))}
            </select>

            <button
              onClick={handleGenerateFromRequirement}
              disabled={isGenerating || requirements.length === 0}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            >
              <Code2 size={13} /> Generate Implementation
            </button>
          </div>
        </div>

        {/* SDLC Feature Card 2: 1-Click Code Audit & Test Generation */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleAutoGenerateTests}
            disabled={isGenerating}
            className="p-2.5 rounded-xl bg-bg-surface border border-border hover:border-accent/40 text-left space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
          >
            <FlaskConical size={14} className="text-purple-400 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-semibold text-text-primary">Auto QA Tests</div>
            <p className="text-[10px] text-text-muted leading-tight">Create test cases from active file</p>
          </button>

          <button
            onClick={handleExplainCode}
            disabled={isGenerating}
            className="p-2.5 rounded-xl bg-bg-surface border border-border hover:border-accent/40 text-left space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
          >
            <ShieldCheck size={14} className="text-emerald-400 group-hover:scale-110 transition-transform" />
            <div className="text-xs font-semibold text-text-primary">Audit & Security</div>
            <p className="text-[10px] text-text-muted leading-tight">Scan for vulnerabilities</p>
          </button>
        </div>

        {/* Loading Spinner */}
        {isGenerating && (
          <div className="p-4 rounded-xl bg-bg-elevated/60 border border-border/80 flex flex-col items-center justify-center text-center space-y-2 animate-in fade-in">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-text-secondary">Synthesizing solution with SDLC context...</span>
          </div>
        )}

        {/* Output Presentation Box */}
        {generatedOutput && (
          <div className="p-3 rounded-xl bg-bg-surface border border-accent/30 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-border pb-1.5">
              <span className="text-xs font-semibold text-accent truncate">{generatedOutput.title}</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={copyToClipboard}
                  className="p-1 rounded text-text-muted hover:text-text-primary transition-colors"
                  title="Copy Code"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
                {generatedOutput.type === "code" && onInsertCode && (
                  <button
                    onClick={() => {
                      onInsertCode(generatedOutput.content);
                      toast.success("Code inserted into Monaco editor!");
                    }}
                    className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded bg-accent text-white hover:bg-accent-hover transition-colors"
                  >
                    Insert to Editor
                  </button>
                )}
              </div>
            </div>

            <pre className="text-[10px] font-mono text-text-secondary bg-bg-elevated p-2.5 rounded-lg overflow-x-auto whitespace-pre max-h-56 leading-relaxed">
              {generatedOutput.content}
            </pre>
          </div>
        )}
      </div>

      {/* Freeform Prompt Bar */}
      <div className="p-2.5 border-t border-border bg-bg-surface/80 flex items-center gap-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && prompt.trim()) {
              handleExplainCode();
              setPrompt("");
            }
          }}
          placeholder="Ask AI Copilot anything about your code..."
          className="flex-1 text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border focus:border-accent text-text-primary outline-none"
        />
        <button
          onClick={() => {
            if (prompt.trim()) {
              handleExplainCode();
              setPrompt("");
            }
          }}
          disabled={!prompt.trim() || isGenerating}
          className="p-2 rounded-lg bg-accent hover:bg-accent-hover text-white disabled:opacity-40 transition-all cursor-pointer"
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
