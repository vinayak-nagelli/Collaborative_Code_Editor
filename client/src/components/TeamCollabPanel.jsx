import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Video,
  Mic,
  MicOff,
  VideoOff,
  PhoneOff,
  PhoneCall,
  Share2,
  Send,
  Code2,
  FileCode,
  Users,
  Sparkles,
  Volume2,
} from "lucide-react";
import toast from "react-hot-toast";
import { getSocket } from "../services/socket";
import useAuthStore from "../store/authStore";

export default function TeamCollabPanel({ projectId, activeFile, onOpenFile }) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "call"

  // Chat State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [codeSnippet, setCodeSnippet] = useState("");
  const [showCodeInput, setShowCodeInput] = useState(false);
  const messagesEndRef = useRef(null);

  // Call State
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callParticipants, setCallParticipants] = useState([]);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  // --- Chat Socket Listeners ---
  useEffect(() => {
    if (!projectId) return;
    const socket = getSocket();

    socket.emit("chat:join", { projectId }, (res) => {
      if (res?.ok && res.history) {
        setMessages(res.history);
      }
    });

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    const handleCallState = ({ projectId: pid, participants }) => {
      if (pid === projectId) {
        setCallParticipants(participants || []);
      }
    };

    socket.on("chat:message", handleMessage);
    socket.on("call:state", handleCallState);

    return () => {
      socket.off("chat:message", handleMessage);
      socket.off("call:state", handleCallState);
    };
  }, [projectId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeTab]);

  // Clean up media on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleSendMessage = (e) => {
    e?.preventDefault();
    if (!inputText.trim() && !codeSnippet.trim()) return;

    const socket = getSocket();
    const payload = {
      projectId,
      text: inputText.trim(),
      codeSnippet: codeSnippet.trim() || null,
      fileMention: activeFile?.name || null,
    };

    socket.emit("chat:send", payload, (res) => {
      if (!res?.ok) {
        toast.error(res?.error || "Failed to send message");
      } else {
        setInputText("");
        setCodeSnippet("");
        setShowCodeInput(false);
      }
    });
  };

  // --- Voice / Video Call Handlers ---
  const handleToggleCall = async () => {
    const socket = getSocket();
    if (isInCall) {
      // Leave call
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      socket.emit("call:leave", { projectId });
      setIsInCall(false);
      toast.success("Disconnected from voice/video call");
    } else {
      // Join call
      setIsInCall(true);
      toast.success("Joined team voice/video room!");

      // Attempt to acquire real media streams gracefully
      try {
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: !isVideoOff,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn("Using simulated audio/video room (device access denied or unavailable):", err);
      }

      socket.emit("call:join", {
        projectId,
        isMuted,
        isVideoOff,
        isScreenSharing,
      });
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = !nextMuted));
    }
    getSocket().emit("call:toggle-media", { projectId, isMuted: nextMuted, isVideoOff, isScreenSharing });
  };

  const toggleVideo = async () => {
    const nextVideoOff = !isVideoOff;
    setIsVideoOff(nextVideoOff);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = !nextVideoOff));
    }
    getSocket().emit("call:toggle-media", { projectId, isMuted, isVideoOff: nextVideoOff, isScreenSharing });
  };

  const toggleScreenShare = async () => {
    const nextScreen = !isScreenSharing;
    setIsScreenSharing(nextScreen);
    if (nextScreen && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          getSocket().emit("call:toggle-media", { projectId, isMuted, isVideoOff, isScreenSharing: false });
        };
      } catch (err) {
        console.warn("Screen share cancelled:", err);
      }
    }
    getSocket().emit("call:toggle-media", { projectId, isMuted, isVideoOff, isScreenSharing: nextScreen });
  };

  return (
    <div className="h-full flex flex-col bg-bg-panel text-text-primary select-none">
      {/* Top Header & Tab Navigation */}
      <div className="border-b border-border bg-bg-surface/50 p-2 flex items-center justify-between">
        <div className="flex items-center gap-1 bg-bg-elevated/60 p-0.5 rounded-lg border border-border">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "chat" ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare size={13} />
            <span>Team Chat</span>
            {messages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                {messages.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("call")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all ${
              activeTab === "call" ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Video size={13} />
            <span>Voice & Video</span>
            {callParticipants.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500 text-white font-mono animate-pulse">
                {callParticipants.length} Live
              </span>
            )}
          </button>
        </div>

        {isInCall && activeTab === "chat" && (
          <button
            onClick={() => setActiveTab("call")}
            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse font-medium"
            title="Active call in progress — click to open video room"
          >
            <PhoneCall size={11} /> Call in Progress
          </button>
        )}
      </div>

      {/* --- TAB 1: TEAM CHAT --- */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active file tag helper */}
          {activeFile && (
            <div className="px-3 py-1.5 border-b border-border bg-bg-elevated/30 flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1 truncate">
                <FileCode size={12} className="text-accent" /> Active Context: <span className="text-text-primary font-mono">{activeFile.name}</span>
              </span>
              <button
                onClick={() => setInputText((prev) => `${prev} @${activeFile.name} `)}
                className="text-[10px] text-accent hover:underline"
              >
                + Mention in Chat
              </button>
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-text-muted p-4 space-y-2">
                <MessageSquare size={28} className="text-text-muted/40" />
                <p className="text-xs font-medium text-text-secondary">Project Room Chat</p>
                <p className="text-[11px] text-text-muted/80 max-w-xs">
                  Discuss bugs, share code snippets, and coordinate tasks with your team in real time!
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = m.user?.id === user?.id;
                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-semibold" style={{ color: m.user?.color || "#38bdf8" }}>
                        {m.user?.name || "Collaborator"}
                      </span>
                      <span className="text-[9px] text-text-muted">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs shadow-sm ${
                        isMe
                          ? "bg-accent text-white rounded-br-xs"
                          : "bg-bg-elevated/80 border border-border text-text-primary rounded-bl-xs"
                      }`}
                    >
                      {m.fileMention && (
                        <button
                          onClick={() => onOpenFile?.(m.fileMention)}
                          className={`flex items-center gap-1 text-[10px] mb-1 font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                            isMe ? "bg-white/20 text-white hover:bg-white/30" : "bg-accent/10 text-accent hover:bg-accent/20"
                          }`}
                        >
                          <FileCode size={10} />
                          <span>@{m.fileMention}</span>
                        </button>
                      )}

                      {m.text && <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>}

                      {m.codeSnippet && (
                        <div
                          className={`mt-1.5 p-2 rounded text-[10px] font-mono overflow-x-auto whitespace-pre ${
                            isMe ? "bg-black/30 text-white/95" : "bg-bg-surface border border-border text-text-secondary"
                          }`}
                        >
                          {m.codeSnippet}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Code Snippet Drawer Input (Collapsible) */}
          {showCodeInput && (
            <div className="p-2 border-t border-border bg-bg-surface animate-in fade-in">
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                <span className="font-medium text-accent flex items-center gap-1">
                  <Code2 size={12} /> Share Code Snippet
                </span>
                <button onClick={() => setShowCodeInput(false)} className="text-[10px] hover:text-text-primary">
                  Cancel
                </button>
              </div>
              <textarea
                value={codeSnippet}
                onChange={(e) => setCodeSnippet(e.target.value)}
                placeholder="Paste code snippet here..."
                rows={3}
                className="w-full text-xs font-mono p-2 rounded bg-bg-elevated border border-border focus:border-accent text-text-primary outline-none"
              />
            </div>
          )}

          {/* Chat Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 border-t border-border bg-bg-surface/80 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCodeInput((v) => !v)}
              className={`p-2 rounded-lg border transition-colors ${
                showCodeInput ? "bg-accent/20 border-accent text-accent" : "bg-bg-elevated border-border text-text-muted hover:text-text-primary"
              }`}
              title="Attach Code Snippet"
            >
              <Code2 size={15} />
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message your team... (Press Enter)"
              className="flex-1 text-xs px-3 py-2 rounded-lg bg-bg-elevated border border-border focus:border-accent text-text-primary outline-none transition-colors"
            />

            <button
              type="submit"
              disabled={!inputText.trim() && !codeSnippet.trim()}
              className="p-2 rounded-lg bg-accent hover:bg-accent-hover text-white disabled:opacity-40 transition-all shadow-sm"
              title="Send Message"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      )}

      {/* --- TAB 2: VOICE & VIDEO CALL --- */}
      {activeTab === "call" && (
        <div className="flex-1 flex flex-col p-3 overflow-hidden">
          {/* Call Controls Strip */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-surface border border-border shadow-sm mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isInCall ? "bg-emerald-500 animate-ping" : "bg-text-muted"}`} />
              <div>
                <div className="text-xs font-semibold text-text-primary">
                  {isInCall ? "Connected to Room" : "Voice & Video Room"}
                </div>
                <div className="text-[10px] text-text-muted">
                  {callParticipants.length} member{callParticipants.length === 1 ? "" : "s"} present
                </div>
              </div>
            </div>

            <button
              onClick={handleToggleCall}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md transition-all ${
                isInCall
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {isInCall ? (
                <>
                  <PhoneOff size={14} /> Leave Call
                </>
              ) : (
                <>
                  <PhoneCall size={14} /> Join Meeting
                </>
              )}
            </button>
          </div>

          {/* Participant Video Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Self Video / Audio Tile */}
            {isInCall && (
              <div className="relative rounded-xl border border-border bg-bg-elevated/70 aspect-video flex flex-col items-center justify-center overflow-hidden group">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
                />

                {isVideoOff && (
                  <div className="flex flex-col items-center gap-1.5 animate-in fade-in">
                    <div className="w-12 h-12 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-accent text-lg font-bold">
                      {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <span className="text-xs font-medium text-text-secondary">{user?.name || "You"}</span>
                  </div>
                )}

                {/* Bottom Overlay Info */}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                  <span className="font-medium truncate">{user?.name || "You"} (You)</span>
                  <div className="flex items-center gap-1.5">
                    {isMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-emerald-400" />}
                    {isScreenSharing && <Share2 size={12} className="text-accent" />}
                  </div>
                </div>
              </div>
            )}

            {/* Peer Participants */}
            {callParticipants
              .filter((p) => p.userId !== user?.id)
              .map((peer) => (
                <div
                  key={peer.socketId}
                  className="relative rounded-xl border border-border bg-bg-elevated/70 aspect-video flex flex-col items-center justify-center overflow-hidden"
                >
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-12 h-12 rounded-full border-2 flex items-center justify-center text-white text-lg font-bold shadow-md ring-2 ring-emerald-500/40 animate-pulse"
                      style={{ backgroundColor: peer.color || "#6366f1", borderColor: peer.color || "#6366f1" }}
                    >
                      {peer.name?.[0]?.toUpperCase() || "P"}
                    </div>
                    <span className="text-xs font-medium text-text-primary">{peer.name}</span>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                      <Volume2 size={11} /> Speaking
                    </div>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm text-white">
                    <span className="font-medium truncate">{peer.name}</span>
                    {peer.isMuted ? <MicOff size={12} className="text-red-400" /> : <Mic size={12} className="text-emerald-400" />}
                  </div>
                </div>
              ))}

            {/* Waiting Tile if user is alone */}
            {isInCall && callParticipants.length <= 1 && (
              <div className="rounded-xl border border-dashed border-border/70 flex flex-col items-center justify-center p-4 text-center text-text-muted space-y-1.5 aspect-video">
                <Users size={24} className="text-text-muted/60" />
                <p className="text-xs font-medium text-text-secondary">Waiting for teammates...</p>
                <p className="text-[10px] text-text-muted/80">
                  Share this project's invite link to pair program with voice & video!
                </p>
              </div>
            )}

            {!isInCall && (
              <div className="col-span-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                  <Video size={32} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">Instant Voice & Video Calling</h4>
                  <p className="text-xs text-text-muted max-w-sm mt-1">
                    Hold standups, conduct pair programming reviews, and talk with your team right inside your IDE without leaving your code.
                  </p>
                </div>
                <button
                  onClick={handleToggleCall}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-lg shadow-accent/20 transition-all cursor-pointer"
                >
                  <PhoneCall size={14} /> Start / Join Meeting
                </button>
              </div>
            )}
          </div>

          {/* Interactive Floating Media Bar (When in Call) */}
          {isInCall && (
            <div className="mt-3 p-2 rounded-xl bg-bg-surface border border-border flex items-center justify-center gap-3">
              <button
                onClick={toggleMute}
                className={`p-2.5 rounded-xl border transition-all ${
                  isMuted ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-bg-elevated border-border text-text-primary hover:bg-bg-hover"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-xl border transition-all ${
                  isVideoOff ? "bg-red-500/20 border-red-500/40 text-red-400" : "bg-bg-elevated border-border text-text-primary hover:bg-bg-hover"
                }`}
                title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`p-2.5 rounded-xl border transition-all ${
                  isScreenSharing ? "bg-accent text-white" : "bg-bg-elevated border-border text-text-primary hover:bg-bg-hover"
                }`}
                title="Share Screen"
              >
                <Share2 size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
