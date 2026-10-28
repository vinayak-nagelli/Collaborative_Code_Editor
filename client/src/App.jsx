import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/authStore";
import ProtectedRoute from "./components/ProtectedRoute";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import InviteLanding from "./pages/InviteLanding";
import Workspace from "./pages/Workspace";
import MobileNotice from "./pages/MobileNotice";

export default function App() {
  const { user, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  // Desktop is the primary target (Section 40) — the IDE itself refuses to
  // render on narrow viewports, but auth/dashboard pages remain usable.
  const isNarrowViewport = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#252526",
            color: "#cccccc",
            border: "1px solid #3c3c3c",
            fontSize: "12px",
          },
        }}
      />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/join/:inviteCode"
          element={isLoading ? null : <InviteLanding />}
        />

        <Route
          path="/workspace/:projectId"
          element={
            <ProtectedRoute>
              {isNarrowViewport ? <MobileNotice /> : <Workspace />}
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}
