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

function PostDialog({ post, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const title = String(form.title || "").trim();
    const description = String(form.description || "").trim();
    const contactDetails = String(form.contact_details || "").trim();
    const hourlyRate = Number(form.hourly_rate);
    if (!title || !description || !contactDetails) {
      setMessage("Title, description, and contact details are required.");
      setSaving(false);
      return;
    }
    if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
      setMessage("Enter a valid hourly rate greater than ₹0.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        ...form,
        title,
        description,
        contact_details: contactDetails,
        hourly_rate: hourlyRate,
      };
      if (post) await api.put(`/portal/project-posts/${post.id}`, payload);
      else await api.post("/portal/project-posts", payload);
      onSaved(post ? "Project post updated." : "Your project post is live.");
      onClose();
    } catch (error) {
      setMessage(apiError(error, "Could not save this project post."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog">
        <div className="dialog-head">
          <div>
            <span className="kicker">CLIENT SPACE</span>
            <h2>{post ? "Edit project post" : "Post a project"}</h2>
          </div>
          <button className="close-button" onClick={onClose} type="button">
            ×
          </button>
        </div>
        {message && <div className="toast error">{message}</div>}
        <form className="stack-form" onSubmit={save}>
          <label>
            Project title
            <input
              name="title"
              required
              defaultValue={post?.title || ""}
              placeholder="Build a booking website"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              defaultValue={post?.description || ""}
              placeholder="Describe the outcome, scope, and context."
            />
          </label>
          <label>
            Hourly rate
            <input
              name="hourly_rate"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={post?.hourly_rate || ""}
              placeholder="75"
            />
          </label>
          <label>
            Contact details
            <textarea
              name="contact_details"
              required
              defaultValue={post?.contact_details || ""}
              placeholder="Email or phone number"
            />
          </label>
          <button className="button button-dark" disabled={saving}>
            {saving ? "Saving…" : post ? "Save changes" : "Publish project"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ProjectPostsPage() {
  const posts = useLoad(
    "/portal/project-posts?per_page=100&sort=created_at&order=desc",
  );
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  async function regenerate(post) {
    try {
      const { data } = await api.post(
        `/portal/project-posts/${post.id}/regenerate-code`,
      );
      setCode(data.project_code);
      setMessage("A new one-time code is ready.");
    } catch (error) {
      setMessage(apiError(error, "Could not generate a new code."));
    }
  }

  async function remove(post) {
    if (!window.confirm(`Delete “${post.title}”?`)) return;

    try {
      await api.delete(`/portal/project-posts/${post.id}`);
      setMessage("Project post deleted.");
      posts.refresh();
    } catch (error) {
      setMessage(apiError(error, "Could not delete this post."));
    }
  }

  async function copyCode() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setMessage("Project code copied to your clipboard.");
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.setAttribute("readonly", "");
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand("copy");
      textArea.remove();
      setMessage(
        copied
          ? "Project code copied to your clipboard."
          : "Copy was blocked by your browser. Select the code and copy it manually.",
      );
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="CLIENT SPACE"
        title="Post Projects"
        description="Tell skilled freelancers what you need and share the one-time code only when you agree to work together."
        action={
          <button
            className="button button-dark"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            + Post a project
          </button>
        }
      />
      {message && <div className="toast success">{message}</div>}
      {code && (
        <div className="code-banner">
          <span>Share this one-time code with your chosen freelancer</span>
          <strong>{code}</strong>
          <button onClick={copyCode}>Copy code</button>
        </div>
      )}
      {posts.loading ? (
        <LoadingState />
      ) : posts.error ? (
        <div className="toast error">{posts.error}</div>
      ) : posts.data?.items?.length ? (
        <div className="post-grid-new">
          {posts.data.items.map((post) => (
            <Panel className="post-card-new" key={post.id}>
              <div className="post-card-meta">
                <StatusChip tone={post.claimed ? "blue" : "green"}>
                  {post.claimed ? "Claimed" : "Open"}
                </StatusChip>
                <small>{post.created_at?.slice(0, 10)}</small>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className="contact-strip">
                <span>CONTACT DETAILS</span>
                {post.contact_details}
              </div>
              <div className="row-actions post-actions">
                {!post.claimed && (
                  <>
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing(post);
                        setOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-button"
                      onClick={() => regenerate(post)}
                    >
                      Code
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => remove(post)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="Your first brief starts here"
            text="Publish a clear project request and let the right people find you."
            action={
              <button
                className="button button-dark"
                onClick={() => {
                  setEditing(null);
                  setOpen(true);
                }}
              >
                Post a project
              </button>
            }
          />
        </Panel>
      )}
      {open && (
        <PostDialog
          post={editing}
          onClose={() => setOpen(false)}
          onSaved={(nextMessage) => {
            setMessage(nextMessage);
            posts.refresh();
          }}
        />
      )}
    </>
  );
}
