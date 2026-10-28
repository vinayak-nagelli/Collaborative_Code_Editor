import { useEffect, useState } from "react";
import { Plus, Link2 } from "lucide-react";
import Sidebar from "../components/Sidebar";
import ProjectCard from "../components/ProjectCard";
import CreateProjectModal from "../components/CreateProjectModal";
import JoinProjectModal from "../components/JoinProjectModal";
import useProjectStore from "../store/projectStore";
import useUIStore from "../store/uiStore";
import useAuthStore from "../store/authStore";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { projects, isLoading, fetchProjects } = useProjectStore();
  const { openCreateModal, openJoinModal } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    fetchProjects(activeFilter === "all" ? undefined : activeFilter);
  }, [activeFilter]);

  const displayedProjects =
    activeFilter === "recent" ? [...projects].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)) : projects;

  return (
    <div className="flex bg-bg-base min-h-screen">
      <Sidebar activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <main className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold text-text-primary">Dashboard</h1>
          <div className="flex gap-2">
            <button
              onClick={openJoinModal}
              className="flex items-center gap-1.5 border border-border-subtle hover:border-text-secondary text-text-primary text-xs font-medium px-3 py-1.5 rounded"
            >
              <Link2 size={13} />
              Join Project
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium px-3 py-1.5 rounded"
            >
              <Plus size={13} />
              New Project
            </button>
          </div>
        </div>

        <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
          {activeFilter === "all" && "Recent Projects"}
          {activeFilter === "owned" && "My Projects"}
          {activeFilter === "shared" && "Shared With Me"}
          {activeFilter === "recent" && "Recent"}
          {activeFilter === "starred" && "Starred"}
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-md bg-bg-elevated border border-border animate-pulse" />
            ))}
          </div>
        ) : displayedProjects.length === 0 ? (
          <div className="border border-dashed border-border-subtle rounded-md py-16 text-center">
            <p className="text-text-secondary text-sm mb-3">No projects here yet.</p>
            <button
              onClick={openCreateModal}
              className="text-accent hover:underline text-sm"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProjects.map((project) => (
              <ProjectCard key={project._id} project={project} currentUserId={user?.id} />
            ))}
          </div>
        )}
      </main>

      <CreateProjectModal />
      <JoinProjectModal />
    </div>
  );
}
