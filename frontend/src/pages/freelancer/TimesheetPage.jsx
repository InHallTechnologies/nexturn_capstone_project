import { useState } from "react";
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

export default function TimesheetPage() {
  const projects = useLoad("/projects?per_page=100");
  const entries = useLoad(
    "/time-entries?per_page=100&sort=entry_date&order=desc",
  );
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const activeProjects = (projects.data?.items || []).filter(
    (project) => project.status !== "closed" && project.workflow_status !== "closed",
  );
  const [editing, setEditing] = useState(null);
  async function addEntry(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
      setMessageType("error");
      setMessage("Choose a valid work date.");
      return;
    }
    try {
      await api.post("/time-entries", {
        ...data,
        hours: Number(data.hours),
      });
      form.reset();
      setMessageType("success");
      setMessage("Time entry added.");
      entries.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(apiError(error, "Could not save this entry."));
    }
  }
  async function removeEntry(entry) {
    if (!window.confirm("Delete this unbilled entry?")) return;
    try {
      await api.delete(`/time-entries/${entry.id}`);
      setMessage("Time entry deleted.");
      entries.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(apiError(error, "Could not delete this entry."));
    }
  }

  async function updateEntry(event) {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await api.put(`/time-entries/${editing.id}`, {
        date: form.date,
        hours: Number(form.hours),
        description: form.description,
      });
      setEditing(null);
      setMessageType("success");
      setMessage("Time entry updated.");
      entries.refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(apiError(error, "Could not update this entry."));
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="TIME TRACKING"
        title="Timesheet"
        description="Capture the work while it is fresh. Billed entries lock automatically."
      />
      {message && <div className={`toast ${messageType}`}>{message}</div>}
      <Panel className="entry-panel">
        <div className="panel-top">
          <div>
            <span className="kicker">QUICK ENTRY</span>
            <h2>Log your latest work</h2>
          </div>
        </div>
        <form className="entry-form" onSubmit={addEntry}>
          <label>
            Project
            <select name="project_id" required defaultValue="">
              <option value="" disabled>
                Select a project
              </option>
              {activeProjects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            {!projects.loading && !activeProjects.length && (
              <small className="field-help">No active projects are available for new time entries.</small>
            )}
          </label>
          <label>
            Date
            <input
              name="date"
              type="date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label>
            Hours
            <input
              name="hours"
              type="number"
              min="0.25"
              max="24"
              step="0.25"
              required
              placeholder="2.5"
            />
          </label>
          <label className="wide-field">
            Description
            <input
              name="description"
              required
              placeholder="What did you work on?"
            />
          </label>
          <button className="button button-dark">Log time</button>
        </form>
      </Panel>
      <Panel className="table-panel">
        <div className="panel-top">
          <div>
            <span className="kicker">RECENT ACTIVITY</span>
            <h2>Your time entries</h2>
          </div>
        </div>
        {entries.loading ? (
          <LoadingState />
        ) : entries.error ? (
          <div className="toast error">{entries.error}</div>
        ) : entries.data?.items?.length ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>PROJECT</th>
                  <th>DESCRIPTION</th>
                  <th>HOURS</th>
                  <th>RATE</th>
                  <th>STATE</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.entry_date}</td>
                    <td>
                      {entry.project_title || `Project ${entry.project_id}`}
                    </td>
                    <td>{entry.description}</td>
                    <td>{entry.hours}h</td>
                    <td>{money(entry.rate_applied)}</td>
                    <td>
                      <StatusChip tone={entry.is_billed ? "blue" : "green"}>
                        {entry.is_billed ? "billed" : "unbilled"}
                      </StatusChip>
                    </td>
                    <td>
                      {!entry.is_billed && (
                        <div className="row-actions">
                          <button
                            className="text-button"
                            onClick={() => setEditing(entry)}
                          >
                            Edit
                          </button>
                          <button
                            className="text-button danger"
                            onClick={() => removeEntry(entry)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Your timesheet is clear"
            text="Log your first piece of work above."
          />
        )}
      </Panel>
      {editing && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-head">
              <div>
                <span className="kicker">TIME TRACKING</span>
                <h2>Edit time entry</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setEditing(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <form className="stack-form" onSubmit={updateEntry}>
              <label>
                Date
                <input
                  name="date"
                  type="date"
                  required
                  defaultValue={editing.entry_date}
                />
              </label>
              <label>
                Hours
                <input
                  name="hours"
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  required
                  defaultValue={editing.hours}
                />
              </label>
              <label>
                Description
                <textarea
                  name="description"
                  required
                  defaultValue={editing.description}
                />
              </label>
              <button className="button button-dark">Save entry</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
