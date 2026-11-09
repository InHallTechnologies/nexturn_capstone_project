import React, { useState, useEffect } from "react";
import { api } from "./api.jsx";
import { Plus, Search, ArrowUpRight, FolderKanban, Layers3, Users, LoaderCircle } from "lucide-react";

export default function Projects({ onOpen }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    setLoading(true);
    try { setProjects(await api("/projects")); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const project = await api("/projects", "POST", { name: name.trim(), key: key.trim().toUpperCase() });
      setProjects(current => [...current, project]);
      setName(""); setKey(""); setShowCreate(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  const filtered = projects.filter(p => `${p.name} ${p.key}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="content-page">
      <div className="page-heading">
        <div><div className="eyebrow muted-eyebrow">YOUR WORKSPACE</div><h1>Projects</h1><p className="page-subtitle">Keep your team's work moving forward.</p></div>
        <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17}/> New project</button>
      </div>
      <div className="stats-strip">
        <div className="stat-item"><span className="stat-icon blue"><FolderKanban size={19}/></span><div><span>Projects</span><strong>{projects.length}</strong></div></div>
        <div className="stat-item"><span className="stat-icon violet"><Layers3 size={19}/></span><div><span>Issue boards</span><strong>{projects.length}</strong></div></div>
        <div className="stat-item"><span className="stat-icon green"><Users size={19}/></span><div><span>Teams</span><strong>{projects.length ? "Active" : "—"}</strong></div></div>
      </div>
      <div className="section-heading"><div><h2>All projects</h2><p>Choose a project to open its Kanban board.</p></div><div className="search-field"><Search size={16}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects"/></div></div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <div className="loading-state"><LoaderCircle className="spin" size={22}/> Loading projects…</div> :
        filtered.length ? <div className="project-grid">{filtered.map((project, index) => (
          <button className="project-card" key={project._id} onClick={() => onOpen(project)}>
            <div className={`project-icon project-color-${index % 4}`}>{project.key.slice(0,2)}</div>
            <div className="project-card-main"><div className="project-card-title">{project.name}<ArrowUpRight size={16}/></div><span className="project-key">{project.key}</span></div>
            <div className="project-card-meta"><span><Users size={14}/>{(project.members || []).length} {(project.members || []).length === 1 ? "member" : "members"}</span><span className="board-link">Open board <ArrowUpRight size={14}/></span></div>
          </button>
        ))}</div> :
        <div className="empty-state"><div className="empty-icon"><FolderKanban size={25}/></div><h3>{search ? "No matching projects" : "Your workspace is ready"}</h3><p>{search ? "Try another project name or key." : "Create your first project and start organizing work on a Kanban board."}</p>{!search && <button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={16}/> Create a project</button>}</div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={e => {if (e.target === e.currentTarget) setShowCreate(false);}}><form className="modal" onSubmit={create}>
        <div className="modal-heading"><div><h2>Create a project</h2><p>Start a new space for your team's work.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close">×</button></div>
        <label>Project name<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Website redesign" required maxLength={80}/></label>
        <label>Project key<input value={key} onChange={e => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} placeholder="e.g. WEB" required maxLength={8}/><span className="field-hint">A short identifier used in issue keys, like WEB-12.</span></label>
        {error && <div className="error-banner">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : "Create project"}</button></div>
      </form></div>}
    </div>
  );
}
