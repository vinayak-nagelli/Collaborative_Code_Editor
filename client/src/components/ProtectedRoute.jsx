import { Navigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg-base text-text-secondary">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
