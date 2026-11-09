import React, { useState } from "react";
import { LayoutGrid, LogOut, ChevronLeft, CircleHelp } from "lucide-react";
import { api } from "./api.jsx";
import Login from "./Login.jsx";
import Projects from "./Projects.jsx";
import Board from "./Board.jsx";

export default function App() {
  const [name, setName] = useState(localStorage.getItem("name"));
  const [project, setProject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [globalError, setGlobalError] = useState("");

  async function logout() {
    try { await api("/logout", "POST"); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("name");
    localStorage.removeItem("id");
    setName(null);
    setProject(null);
  }

  if (!name) return <Login onLogin={setName} />;

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"}`}>
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><LayoutGrid size={19} /></div>
          {sidebarOpen && <div className="brand-copy"><strong>Trackspace</strong><span>Issue workspace</span></div>}
          <button className="icon-button sidebar-toggle" title="Collapse sidebar" onClick={() => setSidebarOpen(!sidebarOpen)}><ChevronLeft size={17} /></button>
        </div>
        <div className="workspace-label">{sidebarOpen ? "WORKSPACE" : "WS"}</div>
        <button className={`nav-item ${!project ? "active" : ""}`} onClick={() => setProject(null)} title="Projects">
          <LayoutGrid size={17} />{sidebarOpen && <span>Projects</span>}
        </button>
        {project && <button className="nav-item active" onClick={() => setProject(project)} title="Current board"><span className="nav-dot" />{sidebarOpen && <span>Board</span>}</button>}
        <div className="sidebar-bottom">
          <div className="help-row"><CircleHelp size={17}/>{sidebarOpen && <span>Help & support</span>}</div>
          <div className="profile-row">
            <div className="avatar">{name.slice(0,1).toUpperCase()}</div>
            {sidebarOpen && <div className="profile-info"><strong>{name}</strong><span>Workspace member</span></div>}
            <button className="icon-button logout-button" title="Sign out" onClick={logout}><LogOut size={16}/></button>
          </div>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="crumb-sep">/</span><strong>{project ? project.name : "Projects"}</strong></div>
          <div className="topbar-right"><span className="online-dot"/> Connected workspace</div>
        </header>
        {globalError && <p className="error-banner">{globalError}</p>}
        {project ? <Board project={project} onBack={() => setProject(null)} /> : <Projects onOpen={setProject} />}
      </main>
    </div>
  );
}
