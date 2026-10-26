import { useState } from "react";
import { api, apiError } from "../../app/api";
import { useLoad } from "../../hooks/useLoad";
import {
  EmptyState,
  LoadingState,
  PageHeading,
  Panel,
} from "../../components/common/Primitives";

export default function ProjectBoardPage() {
  const { data, loading, error, refresh } = useLoad(
    "/project-posts?per_page=100&sort=created_at&order=desc",
  );
  const [query, setQuery] = useState("");
  const [codeOpen, setCodeOpen] = useState(false);
  const [message, setMessage] = useState("");
  async function claim(event) {
    event.preventDefault();
    try {
      const { data: result } = await api.post("/projects/claim-code", {
        code: new FormData(event.currentTarget).get("code"),
      });
      setCodeOpen(false);
      setMessage(`${result.project.title} was added to your projects.`);
      refresh();
    } catch (error) {
      setMessage(apiError(error, "That project code could not be used."));
    }
  }
  const posts = (data?.items || []).filter((post) =>
    `${post.title} ${post.description} ${post.client_name}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        eyebrow="OPPORTUNITIES"
        title="Project board"
        description="Discover client requests, then claim the work when you have agreed on the details."
        action={
          <button
            className="button button-dark"
            onClick={() => setCodeOpen(true)}
          >
            Claim a project
          </button>
        }
      />
      {message && <div className="toast success">{message}</div>}
      <div className="board-tools">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search opportunities"
        />
        <span>{data?.total || 0} live posts</span>
      </div>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="toast error">{error}</div>
      ) : posts.length ? (
        <div className="opportunity-grid">
          {posts.map((post) => (
            <Panel className="opportunity-card" key={post.id}>
              <span className="post-tag">OPEN REQUEST</span>
              <small>{post.created_at?.slice(0, 10)}</small>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              <div className="contact-strip">
                <span>CONTACT</span>
                {post.contact_details}
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel>
          <EmptyState
            title="No matching opportunities"
            text="Try another search or check back later."
          />
        </Panel>
      )}
      {codeOpen && (
        <div className="dialog-backdrop">
          <div className="dialog">
            <div className="dialog-head">
              <div>
                <span className="kicker">PROJECT CODE</span>
                <h2>Claim client work</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setCodeOpen(false)}
              >
                ×
              </button>
            </div>
            <p className="dialog-copy">
              Ask the client for the one-time code they received when they
              posted the request.
            </p>
            <form className="stack-form" onSubmit={claim}>
              <label>
                One-time code
                <input name="code" required placeholder="ABCD-EFGH-IJKL" />
              </label>
              <button className="button button-dark">Add to my projects</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
