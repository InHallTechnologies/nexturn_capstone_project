import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import "./Enquiries.css";

function OwnerEnquiries() {
const [enquiries, setEnquiries] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

useEffect(() => {
const fetchEnquiries = async () => {
try {
const response = await api.get("/enquiries/received");
setEnquiries(response.data.enquiries || []);
} catch (err) {
setError(
err.response?.data?.message || "Failed to load received enquiries."
);
} finally {
setLoading(false);
}
};


fetchEnquiries();


}, []);

if (loading) {
return <p className="enquiries-message">Loading received enquiries...</p>;
}

if (error) {
return <p className="enquiries-error">{error}</p>;
}

return ( <main className="enquiries-page"> <header className="enquiries-header"> <h1>Property Enquiries</h1> <p>View messages from seekers interested in your properties.</p> </header>


  {enquiries.length === 0 ? (
    <div className="enquiries-empty">
      <h2>No enquiries received</h2>
      <p>New enquiries will appear here when seekers contact you.</p>
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

          <p>Enquiry #{enquiry.id}</p>
          <p>Seeker ID: {enquiry.seeker_id}</p>

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
            View Conversation & Reply
          </Link>
        </article>
      ))}
    </div>
  )}
</main>


);
}

export default OwnerEnquiries;
