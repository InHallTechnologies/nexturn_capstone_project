import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import "./Enquiries.css";

function EnquiryConversation() {
const { enquiryId } = useParams();
const { user } = useAuth();

const [enquiry, setEnquiry] = useState(null);
const [messages, setMessages] = useState([]);
const [messageText, setMessageText] = useState("");
const [loading, setLoading] = useState(true);
const [sending, setSending] = useState(false);
const [error, setError] = useState("");

const fetchConversation = useCallback(async () => {
try {
const response = await api.get(
`/enquiries/${enquiryId}/messages`
);


  setEnquiry(response.data.enquiry);
  setMessages(response.data.messages || []);
  setError("");
} catch (err) {
  setError(
    err.response?.data?.message || "Failed to load conversation."
  );
} finally {
  setLoading(false);
}


}, [enquiryId]);

useEffect(() => {
  let cancelled = false;
  async function load() {
    if (!cancelled) {
      await fetchConversation();
    }
  }
  load();
  return () => {
    cancelled = true;
  };
}, [fetchConversation]);

const handleSendMessage = async (e) => {
e.preventDefault();


if (!messageText.trim()) {
  return;
}

setSending(true);
setError("");

try {
  await api.post(`/enquiries/${enquiryId}/messages`, {
    message: messageText.trim(),
  });

  setMessageText("");
  await fetchConversation();
} catch (err) {
  setError(
    err.response?.data?.message || "Failed to send message."
  );
} finally {
  setSending(false);
}

};

const handleStatusChange = async () => {
const nextStatus = enquiry.status === "open" ? "closed" : "open";


try {
  const response = await api.patch(
    `/enquiries/${enquiryId}/status`,
    { status: nextStatus }
  );

  setEnquiry(response.data.enquiry);
  setError("");
} catch (err) {
  setError(
    err.response?.data?.message || "Failed to update enquiry status."
  );
}


};

if (loading) {
return <p className="enquiries-message">Loading conversation...</p>;
}

if (!enquiry) {
return ( <main className="enquiries-page"> <p className="enquiries-error">
{error || "Conversation not found."} </p> <Link to="/properties">Back to properties</Link> </main>
);
}

const isClosed = enquiry.status === "closed";

return ( <main className="enquiries-page"> <section className="conversation-card"> <header className="conversation-header"> <div> <h1>{enquiry.property_title}</h1> <p>Enquiry #{enquiry.id}</p>
<span className={`enquiry-status ${enquiry.status}`}>
{enquiry.status} </span> </div>


      <button
        type="button"
        className="enquiry-secondary-button"
        onClick={handleStatusChange}
      >
        {isClosed ? "Reopen Enquiry" : "Close Enquiry"}
      </button>
    </header>

    {error && <p className="enquiries-error">{error}</p>}

    <div className="conversation-messages">
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        messages.map((message) => {
          const isMine =
            String(message.sender_id) === String(user?.id);

          return (
            <article
              key={message.id}
              className={`conversation-message ${
                isMine ? "mine" : "theirs"
              }`}
            >
              <div className="message-meta">
                <strong>
                  {isMine
                    ? "You"
                    : message.sender_username || "Participant"}
                </strong>
                <time>
                  {message.created_at
                    ? new Date(message.created_at).toLocaleString("en-IN")
                    : ""}
                </time>
              </div>

              <p>{message.message}</p>
            </article>
          );
        })
      )}
    </div>

    {isClosed ? (
      <p className="conversation-closed">
        This enquiry is closed. Reopen it to send more messages.
      </p>
    ) : (
      <form className="conversation-reply-form" onSubmit={handleSendMessage}>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Write your message..."
          rows={3}
          required
        />

        <button type="submit" disabled={sending || !messageText.trim()}>
          {sending ? "Sending..." : "Send Message"}
        </button>
      </form>
    )}
  </section>
</main>


);
}

export default EnquiryConversation;
