import React, { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { api } from "./api.jsx";
import { ArrowLeft, Plus, Search, SlidersHorizontal, RefreshCw, X, MessageSquare, CalendarDays, CircleUserRound, ChevronDown, LoaderCircle, AlertCircle, GripVertical, Send, Users } from "lucide-react";

const STATES = ["Backlog", "To Do", "In Progress", "In Review", "Done"];
const NEXT = {"Backlog":["To Do"],"To Do":["Backlog","In Progress"],"In Progress":["To Do","In Review"],"In Review":["In Progress","Done"],"Done":["In Review"]};

function initials(name) {
  return (name || "?").split(" ").filter(Boolean).slice(0,2).map(part => part[0].toUpperCase()).join("");
}
function priorityLabel(value) {
  const v = (value || "medium").toLowerCase();
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function Board({ project, onBack }) {
  const [issues, setIssues] = useState([]);
  const [members, setMembers] = useState(project.members || []);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created");
  const [showCreate, setShowCreate] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignee, setAssignee] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState(null);

  async function load() {
    setLoading(true);
    try { setIssues(await api(`/projects/${project._id}/issues`)); setError(""); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [project._id]);

  const selected = issues.find(issue => issue._id === selectedId);
  const visibleIssues = useMemo(() => {
    let result = issues.filter(issue => {
      const matchesQuery = `${issue.key} ${issue.title} ${issue.description || ""}`.toLowerCase().includes(query.toLowerCase());
      const matchesAssignee = assigneeFilter === "all" || (assigneeFilter === "unassigned" ? !issue.assignee : issue.assignee?.id === assigneeFilter);
      const matchesPriority = priorityFilter === "all" || (issue.priority || "medium").toLowerCase() === priorityFilter;
      return matchesQuery && matchesAssignee && matchesPriority;
    });
    if (sortBy === "title") result = [...result].sort((a,b) => a.title.localeCompare(b.title));
    if (sortBy === "priority") {
      const order = { highest: 0, high: 1, medium: 2, low: 3, lowest: 4 };
      result = [...result].sort((a,b) => (order[(a.priority || "medium").toLowerCase()] ?? 2) - (order[(b.priority || "medium").toLowerCase()] ?? 2));
    }
    return result;
  }, [issues, query, assigneeFilter, priorityFilter, sortBy]);

  async function createIssue(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true); setError("");
    try {
      const created = await api(`/projects/${project._id}/issues`, "POST", { title: title.trim(), description: description.trim(), priority, assignee });
      setIssues(current => [...current, created]);
      setTitle(""); setDescription(""); setPriority("medium"); setAssignee(""); setShowCreate(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function moveIssue(issueId, destination) {
    const issue = issues.find(item => item._id === issueId);
    if (!issue || issue.state === destination) return;
    if (!(NEXT[issue.state] || []).includes(destination)) {
      setError(`This workflow does not allow moving ${issue.key} from ${issue.state} to ${destination}.`);
      return;
    }
    setError(""); setMovingId(issueId);
    const previous = issues;
    setIssues(current => current.map(item => item._id === issueId ? {...item, state: destination} : item));
    try {
      await api(`/issues/${issueId}/move`, "PUT", { state: destination });
      await load();
    } catch (e) {
      setIssues(previous);
      setError(e.message);
    } finally { setMovingId(null); }
  }

  function onDragEnd(result) {
    if (!result.destination) return;
    const issueId = result.draggableId;
    const destination = result.destination.droppableId;
    moveIssue(issueId, destination);
  }

  async function addComment(event) {
    event.preventDefault();
    if (!comment.trim() || !selected) return;
    setSaving(true);
    try {
      await api(`/issues/${selected._id}/comments`, "POST", { text: comment.trim() });
      setComment("");
      await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function addMember(event) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      await api(`/projects/${project._id}/members`, "POST", { email: email.trim() });
      setEmail("");
      setShowMembers(false);
      setError("Member added. Reopen this project to refresh its member list.");
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="board-page">
      <div className="board-page-top"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/> All projects</button><span className="top-divider">/</span><span className="current-project">{project.name}</span></div>
      <div className="board-title-row">
        <div><div className="project-title-line"><span className="project-badge">{project.key.slice(0,2)}</span><h1>{project.name}</h1></div><p className="page-subtitle">Plan, track, and ship work together.</p></div>
        <div className="board-title-actions"><button className="secondary-button" onClick={() => setShowMembers(true)}><Users size={16}/> Members</button><button className="primary-button" onClick={() => setShowCreate(true)}><Plus size={17}/> Create issue</button></div>
      </div>
      <div className="board-toolbar">
        <div className="search-field board-search"><Search size={16}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search issues…"/></div>
        <div className="toolbar-select"><SlidersHorizontal size={15}/><select aria-label="Filter by assignee" value={assigneeFilter} onChange={e => setAssigneeFilter(e.target.value)}><option value="all">All assignees</option><option value="unassigned">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select><ChevronDown size={13}/></div>
        <div className="toolbar-select"><select aria-label="Filter by priority" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}><option value="all">All priorities</option><option value="highest">Highest</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="lowest">Lowest</option></select><ChevronDown size={13}/></div>
        <div className="toolbar-select"><select aria-label="Sort issues" value={sortBy} onChange={e => setSortBy(e.target.value)}><option value="created">Default order</option><option value="title">Title A–Z</option><option value="priority">Priority</option></select><ChevronDown size={13}/></div>
        <button className="icon-button refresh-button" title="Refresh issues" onClick={load}><RefreshCw size={16}/></button>
      </div>
      {error && <div className="error-banner board-error"><AlertCircle size={16}/><span>{error}</span><button className="icon-button" onClick={() => setError("")} aria-label="Dismiss error"><X size={15}/></button></div>}
      <div className="board-summary"><span><span className="summary-dot"/> {visibleIssues.length} {visibleIssues.length === 1 ? "issue" : "issues"}</span><span>Drag cards to move them between workflow stages</span></div>
      {loading ? <div className="loading-state board-loading"><LoaderCircle className="spin" size={22}/> Loading board…</div> :
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {STATES.map((state, index) => {
            const columnIssues = visibleIssues.filter(issue => issue.state === state);
            return <section className={`kanban-column column-${index}`} key={state}>
              <div className="column-heading"><span className={`column-state-dot state-${index}`}/><h2>{state}</h2><span className="column-count">{columnIssues.length}</span><button className="column-add icon-button" onClick={() => {setShowCreate(true);setError("");}} aria-label={`Create issue in ${state}`}><Plus size={16}/></button></div>
              <Droppable droppableId={state}>
                {(provided, snapshot) => <div className={`column-dropzone ${snapshot.isDraggingOver ? "drag-over" : ""}`} ref={provided.innerRef} {...provided.droppableProps}>
                  {columnIssues.map((issue, cardIndex) => <Draggable key={issue._id} draggableId={issue._id} index={cardIndex}>
                    {(dragProvided, dragSnapshot) => <article className={`issue-card ${dragSnapshot.isDragging ? "is-dragging" : ""} ${movingId === issue._id ? "is-moving" : ""}`} ref={dragProvided.innerRef} {...dragProvided.draggableProps} role="button" tabIndex={0} aria-label={`Open issue ${issue.key}: ${issue.title}`} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(issue._id); } }} onClick={() => setSelectedId(issue._id)}>
                      <div className="issue-card-top"><span className="issue-key"><span className="issue-type-mark">◇</span>{issue.key}</span><button className="drag-handle icon-button" title="Drag issue" {...dragProvided.dragHandleProps} onClick={e => e.stopPropagation()}><GripVertical size={15}/></button></div>
                      <h3>{issue.title}</h3>
                      {issue.description && <p className="issue-description">{issue.description}</p>}
                      <div className="issue-card-bottom"><span className={`priority priority-${(issue.priority || "medium").toLowerCase()}`}><span className="priority-mark">{(issue.priority || "medium").toLowerCase() === "high" || (issue.priority || "").toLowerCase() === "highest" ? "↑" : (issue.priority || "").toLowerCase() === "low" || (issue.priority || "").toLowerCase() === "lowest" ? "↓" : "＝"}</span>{priorityLabel(issue.priority)}</span>{issue.assignee ? <span className="avatar mini-avatar" title={issue.assignee.name}>{initials(issue.assignee.name)}</span> : <span className="unassigned-avatar" title="Unassigned"><CircleUserRound size={18}/></span>}</div>
                      {(issue.comments || []).length > 0 && <div className="issue-card-foot"><MessageSquare size={13}/>{issue.comments.length} {issue.comments.length === 1 ? "comment" : "comments"}</div>}
                    </article>}</Draggable>)}
                  {provided.placeholder}
                  {columnIssues.length === 0 && <div className="column-empty"><span className="empty-dash">—</span><p>{query || assigneeFilter !== "all" || priorityFilter !== "all" ? "No matching issues" : "Drop issues here"}</p></div>}
                </div>}
              </Droppable>
              <button className="add-issue-inline" onClick={() => setShowCreate(true)}><Plus size={15}/> Create issue</button>
            </section>;
          })}
        </div>
      </DragDropContext>}
      {selected && <div className="detail-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) setSelectedId(null);}}><aside className="issue-detail-panel">
        <div className="detail-topline"><span className="issue-key"><span className="issue-type-mark">◇</span>{selected.key}</span><button className="icon-button" onClick={() => setSelectedId(null)} aria-label="Close issue details"><X size={18}/></button></div>
        <h2 className="detail-title">{selected.title}</h2>
        <p className="detail-description">{selected.description || "No description provided."}</p>
        <div className="detail-status-row"><span className="detail-label">Status</span><div className="status-picker"><select value={selected.state} onChange={e => moveIssue(selected._id, e.target.value)} aria-label="Change issue status">{STATES.map(state => <option key={state} value={state} disabled={state !== selected.state && !(NEXT[selected.state] || []).includes(state)}>{state}</option>)}</select><ChevronDown size={14}/></div></div>
        <div className="detail-property"><span className="detail-label">Priority</span><span className={`priority priority-${(selected.priority || "medium").toLowerCase()}`}>{priorityLabel(selected.priority)}</span></div>
        <div className="detail-property"><span className="detail-label">Assignee</span><span className="detail-person">{selected.assignee ? <><span className="avatar mini-avatar">{initials(selected.assignee.name)}</span>{selected.assignee.name}</> : "Unassigned"}</span></div>
        <div className="detail-property"><span className="detail-label">Reporter</span><span className="detail-person">{selected.reporter || "—"}</span></div>
        <div className="detail-property"><span className="detail-label">Created</span><span className="detail-person"><CalendarDays size={15}/>{selected.activity?.[0]?.at || "—"}</span></div>
        <div className="detail-divider"/>
        <div className="detail-section-title"><h3>Comments</h3><span>{(selected.comments || []).length}</span></div>
        <div className="comments-list">{(selected.comments || []).length ? selected.comments.map((c, i) => <div className="comment-item" key={`${c.at}-${i}`}><div className="avatar mini-avatar">{initials(c.by)}</div><div><div className="comment-meta"><strong>{c.by}</strong><span>{c.at}</span></div><p>{c.text}</p></div></div>) : <p className="muted-text">No comments yet. Start the conversation.</p>}</div>
        <form className="comment-form" onSubmit={addComment}><textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment…" rows="3" required/><button className="primary-button" disabled={saving || !comment.trim()}><Send size={15}/> Send</button></form>
        <div className="detail-divider"/>
        <div className="detail-section-title"><h3>Activity</h3><span>{(selected.activity || []).length}</span></div>
        <div className="activity-list">{(selected.activity || []).slice().reverse().map((a, i) => <div className="activity-item" key={`${a.at}-${i}`}><span className="activity-marker"/><div><p><strong>{a.by}</strong> {a.field === "created" ? "created this issue" : `changed ${a.field}`} {a.old && <><span>{a.old}</span> → </>}{a.new && <span>{a.new}</span>}</p><small>{a.at}</small></div></div>)}</div>
      </aside></div>}
      {showCreate && <div className="modal-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) setShowCreate(false);}}><form className="modal" onSubmit={createIssue}>
        <div className="modal-heading"><div><span className="form-kicker">NEW WORK ITEM</span><h2>Create issue</h2><p>Add a task to {project.name}.</p></div><button type="button" className="icon-button" onClick={() => setShowCreate(false)} aria-label="Close"><X size={18}/></button></div>
        <label>Issue title<input autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" required maxLength={180}/></label>
        <label>Description <span className="optional-label">Optional</span><textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add details to help your team…" rows="3"/></label>
        <div className="form-two-col"><label>Priority<select value={priority} onChange={e => setPriority(e.target.value)}><option value="lowest">Lowest</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="highest">Highest</option></select></label><label>Assignee<select value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Unassigned</option>{members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label></div>
        <p className="field-hint">New issues are added to Backlog, following your project's workflow.</p>
        {error && <div className="error-banner">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowCreate(false)}>Cancel</button><button className="primary-button" type="submit" disabled={saving}>{saving ? "Creating…" : <><Plus size={16}/> Create issue</>}</button></div>
      </form></div>}
      {showMembers && <div className="modal-backdrop" onMouseDown={e => {if(e.target === e.currentTarget) setShowMembers(false);}}><form className="modal" onSubmit={addMember}>
        <div className="modal-heading"><div><h2>Project members</h2><p>Invite an existing Trackspace user by email.</p></div><button type="button" className="icon-button" onClick={() => setShowMembers(false)} aria-label="Close"><X size={18}/></button></div>
        <div className="member-list">{members.map(m => <div className="member-row" key={m.id}><span className="avatar">{initials(m.name)}</span><span>{m.name}</span>{m.id === project.owner && <span className="owner-tag">Owner</span>}</div>)}</div>
        {project.owner === localStorage.getItem("id") ? <><label>Member email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" required/></label>{error && <div className="error-banner">{error}</div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowMembers(false)}>Close</button><button className="primary-button" disabled={saving}>{saving ? "Adding…" : "Add member"}</button></div></> : <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowMembers(false)}>Close</button></div>}
      </form></div>}
    </div>
  );
}
