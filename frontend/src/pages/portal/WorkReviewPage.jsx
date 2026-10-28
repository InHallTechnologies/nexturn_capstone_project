import { useState } from "react";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
  StatusChip,
} from "../../components/common/Primitives";
import "../../styles/workflows.css";

export default function WorkReviewPage() {
  const { data, loading, error, refresh } = useLoad(
    "/portal/projects?per_page=100",
  );
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("");
  const [feedback, setFeedback] = useState("");
  const [message, setMessage] = useState("");
  function beginReview(project, nextAction) {
    setSelected(project);
    setAction(nextAction);
    setFeedback("");
  }
  async function submitReview(event) {
    event.preventDefault();
    try {
      await api.post(`/portal/projects/${selected.id}/review`, {
        action,
        feedback,
      });
      setSelected(null);
      setMessage(
        action === "approve" ? "Work approved." : "Revision request sent.",
      );
      refresh();
    } catch (requestError) {
      setMessage(apiError(requestError, "Could not submit review."));
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="CLIENT SPACE"
        title="Work review"
        description="Approve completed work or send clear feedback before the final invoice."
      />
      {message && <div className="toast success">{message}</div>}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="toast error">{error}</div>
      ) : data?.items?.length ? (
        <div className="review-grid">
          {data.items.map((project) => (
            <Panel className="review-card" key={project.id}>
              <div className="post-card-meta">
                <div className="status-pair">
                  <StatusChip tone={project.workflow_status === "submitted" ? "amber" : "blue"}>
                    Work: {project.workflow_status?.replaceAll("_", " ")}
                  </StatusChip>
                  <StatusChip tone={project.project_status === "closed" ? "green" : project.project_status === "on_hold" ? "amber" : "blue"}>
                    Project: {project.project_status?.replaceAll("_", " ")}
                  </StatusChip>
                </div>
                <small>{project.title}</small>
              </div>
              <h2>{project.title}</h2>
              {project.completion_notes ? (
                <>
                  <span className="kicker">FREELANCER NOTES</span>
                  <p>{project.completion_notes}</p>
                </>
              ) : (
                <p className="muted-copy">
                  The freelancer has not submitted completion notes yet.
                </p>
              )}
              {project.git_link && (
                <p>
                  <a href={project.git_link} target="_blank" rel="noreferrer">
                    Open Git repository ↗
                  </a>
                </p>
              )}
              {project.revision_feedback && (
                <div className="review-feedback">
                  Revision requested: {project.revision_feedback}
                </div>
              )}
              {project.workflow_status === "submitted" && (
                <div className="review-actions">
                  <button
                    className="button button-dark"
                    onClick={() => beginReview(project, "approve")}
                  >
                    Approve work
                  </button>
                  <button
                    className="button button-light"
                    onClick={() => beginReview(project, "request_revision")}
                  >
                    Request revision
                  </button>
                </div>
              )}
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="Nothing waiting for review"
            text="Submitted work will appear here when your freelancer is ready."
          />
        </Panel>
      )}
      {selected && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-head">
              <div>
                <span className="kicker">
                  {action === "approve" ? "APPROVAL" : "REVISION REQUEST"}
                </span>
                <h2>
                  {action === "approve"
                    ? "Approve completed work"
                    : "Request revisions"}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>
            <form className="stack-form" onSubmit={submitReview}>
              <label>
                {action === "approve"
                  ? "Feedback (optional)"
                  : "What needs to change?"}
                <textarea
                  required={action === "request_revision"}
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder="Write a clear note for the freelancer"
                />
              </label>
              <button className="button button-dark">
                {action === "approve"
                  ? "Approve work"
                  : "Send revision request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
