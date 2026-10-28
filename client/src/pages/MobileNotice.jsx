import { Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function MobileNotice() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center px-6 text-center">
      <div className="max-w-xs">
        <Monitor className="mx-auto text-text-muted mb-4" size={36} />
        <p className="text-text-primary text-sm font-medium mb-1">
          The collaborative IDE is optimized for desktop.
        </p>
        <p className="text-text-secondary text-xs mb-5">
          Please use a larger screen for the full editing experience.
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          className="text-accent text-xs hover:underline"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
