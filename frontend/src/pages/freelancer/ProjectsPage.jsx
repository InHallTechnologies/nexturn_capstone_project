import { useState } from "react";
import { Link } from "react-router-dom";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import { money } from "../../lib/format";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
  StatusChip,
} from "../../components/common/Primitives";

function ProjectDialog({ project, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api.put(`/projects/${project.id}`, {
        title: form.title,
        rate_override: form.rate_override ? Number(form.rate_override) : null,
        status: form.status,
      });
      onSaved("Project updated.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not update this project."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">PROJECT SETTINGS</span>
            <h2>Edit project</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={save}>
          <label>
            Project name
            <input name="title" required defaultValue={project.title} />
          </label>
          <label>
            Hourly rate override
            <input
              name="rate_override"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={project.rate_override ?? ""}
              placeholder="Use client default"
            />
          </label>
          <label>
            Project status
            <select name="status" defaultValue={project.status}>
              <option value="active">Active</option>
              <option value="on_hold">On hold</option>
              <option value="closed">Closed</option>
            </select>
          </label>
          <p className="dialog-copy">
            Changing the rate affects future time entries only. Existing work
            keeps its recorded rate.
          </p>
          <button className="button button-dark" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SubmissionDialog({ project, onClose, onSaved }) {
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      await api.post(`/projects/${project.id}/submit`, { notes });
      onSaved("Completed work sent to the client for review.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not submit this work."));
    } finally {
      setBusy(false);
    }
  }

  const resubmission = project.workflow_status === "revision_requested";

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">WORKFLOW</span>
            <h2>
              {resubmission ? "Resubmit revised work" : "Submit completed work"}
            </h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        <p className="dialog-copy">
          The client will review this submission in their Work review area.
          Approved work can then be invoiced.
        </p>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={submit}>
          <label>
            Completion notes
            <textarea
              required
              maxLength="5000"
              rows="6"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Describe the completed work and handoff details."
            />
          </label>
          <button className="button button-dark" disabled={busy}>
            {busy ? "Submitting…" : "Send to client for review"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const clients = useLoad("/clients?per_page=100");
  const projects = useLoad("/projects?per_page=100&sort=title");
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [message, setMessage] = useState("");

  async function remove(project) {
    if (!window.confirm(`Delete ${project.title}?`)) return;

    try {
      await api.delete(`/projects/${project.id}`);
      setMessage("Project deleted.");
      projects.refresh();
    } catch (error) {
      setMessage(apiError(error, "This project cannot be deleted."));
    }
  }

  async function createFinalInvoice(project) {
    try {
      const { data } = await api.post(`/projects/${project.id}/final-invoice`, {
        tax_rate: 0,
        due_days: 14,
      });
      setMessage(`Final invoice ${data.number} created.`);
      projects.refresh();
    } catch (error) {
      setMessage(apiError(error, "Could not create the final invoice."));
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="DELIVERY"
        title="Projects"
        description="See the work in motion, from first brief to final invoice."
      />
      {message && <div className="toast success">{message}</div>}
      <Panel className="table-panel">
        {projects.loading ? (
          <LoadingState />
        ) : projects.error ? (
          <div className="toast error">{projects.error}</div>
        ) : projects.data?.items?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>PROJECT</th>
                  <th>CLIENT</th>
                  <th>RATE</th>
                  <th>PROJECT STATUS</th>
                  <th>WORK REVIEW</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {projects.data.items.map((project) => {
                  const client = clients.data?.items?.find(
                    (item) => item.id === project.client_id,
                  );
                  const canSubmit = ["active", "revision_requested"].includes(
                    project.workflow_status,
                  );

                  return (
                    <tr key={project.id}>
                      <td>
                        <strong>{project.title}</strong>
                      </td>
                      <td>{client?.name || `Client #${project.client_id}`}</td>
                      <td>
                        {project.rate_override != null
                          ? `${money(project.rate_override)} / hr`
                          : "Client default"}
                      </td>
                      <td>
                        <StatusChip
                          tone={project.status === "active" ? "green" : "amber"}
                        >
                          {project.status?.replace("_", " ")}
                        </StatusChip>
                      </td>
                      <td>
                        <StatusChip tone="blue">
                          {project.workflow_status?.replace("_", " ")}
                        </StatusChip>
                        {project.revision_feedback && (
                          <small className="subline">
                            {project.revision_feedback}
                          </small>
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => setEditing(project)}
                          >
                            Edit
                          </button>
                          {canSubmit && (
                            <button
                              className="text-button"
                              onClick={() => setSubmitting(project)}
                            >
                              {project.workflow_status === "revision_requested"
                                ? "Resubmit"
                                : "Complete work"}
                            </button>
                          )}
                          {project.workflow_status === "completed" &&
                            !project.final_invoice_id && (
                              <button
                                className="text-button"
                                onClick={() => createFinalInvoice(project)}
                              >
                                Final invoice
                              </button>
                            )}
                          {project.final_invoice_id && (
                            <Link
                              className="table-link"
                              to={`/invoices/${project.final_invoice_id}`}
                            >
                              Open invoice
                            </Link>
                          )}
                          {project.workflow_status !== "closed" && (
                            <button
                              className="text-button danger"
                              onClick={() => remove(project)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No projects yet"
            text="Claim a project from the project board to begin."
          />
        )}
      </Panel>
      {editing && (
        <ProjectDialog
          project={editing}
          onClose={() => setEditing(null)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            projects.refresh();
          }}
        />
      )}
      {submitting && (
        <SubmissionDialog
          project={submitting}
          onClose={() => setSubmitting(null)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            projects.refresh();
          }}
        />
      )}
    </>
  );
}
