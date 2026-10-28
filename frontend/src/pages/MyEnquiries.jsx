import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Enquiries.css";

function MyEnquiries() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEnquiries = async () => {
      try {
        const response = await api.get("/enquiries/sent");
        setEnquiries(response.data.enquiries || []);
      } catch (err) {
        setError(
          err.response?.data?.message || "Failed to load your enquiries."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchEnquiries();
  }, []);

  if (loading) {
    return <p>Loading enquiries...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main className="enquiries-container">
      <h1>My Enquiries</h1>
      <p>View your property enquiries and continue conversations.</p>

      {enquiries.length === 0 ? (
        <div className="enquiries-empty">
          <h2>No enquiries yet</h2>
          <p>
            Explore properties and contact an owner to get started.
          </p>

          <Link
            to="/properties"
            className="enquiry-primary-button"
          >
            Browse Properties
          </Link>
        </div>
      ) : (
        <div className="enquiries-list">
          {enquiries.map((enquiry) => (
            <article className="enquiry-card" key={enquiry.id}>
              <div className="enquiry-card-header">
                <h2>{enquiry.property_title}</h2>

                <span className={`enquiry-status ${enquiry.status}`}>
                  {enquiry.status}
                </span>
              </div>

              <p>
                Enquiry #{enquiry.id} · Property #{enquiry.property_id}
              </p>

              <p>
                Created:{" "}
                {enquiry.created_at
                  ? new Date(enquiry.created_at).toLocaleString("en-IN")
                  : "N/A"}
              </p>

              <Link
                to={`/enquiries/${enquiry.id}`}
                className="enquiry-primary-button"
              >
                Open Conversation
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default MyEnquiries;

