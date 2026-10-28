import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "./AdminPropertyReview.css";

function AdminPropertyReview() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [owner, setOwner] = useState(null);
  const [images, setImages] = useState([]);
  const [amenities, setAmenities] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchReviewDetails() {
      try {
        setLoading(true);
        setError("");

        const response = await api.get(
          `/admin/properties/${propertyId}/review`
        );

        if (cancelled) return;

        setProperty(response.data.property);
        setOwner(response.data.owner);
        setImages(response.data.images ?? []);
        setAmenities(response.data.amenities ?? []);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Failed to load property review details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReviewDetails();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  async function handleApprove() {
    if (
      !window.confirm(
        "Have you reviewed all property details and images? Approve this property?"
      )
    ) {
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `/admin/properties/${propertyId}/verify`
      );

      setMessage("Property approved successfully.");

      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to approve property."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(event) {
    event.preventDefault();

    if (!rejectionReason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }

    setActionLoading(true);
    setError("");
    setMessage("");

    try {
      await api.patch(
        `/admin/properties/${propertyId}/reject`,
        {
          rejection_reason: rejectionReason.trim(),
        }
      );

      setMessage("Property rejected successfully.");

      setTimeout(() => {
        navigate("/admin/dashboard");
      }, 1000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to reject property."
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-review-page">
        <p>Loading property details...</p>
      </main>
    );
  }

  if (error && !property) {
    return (
      <main className="admin-review-page">
        <p className="error-message">{error}</p>
        <Link to="/admin/dashboard">Back to Dashboard</Link>
      </main>
    );
  }

  if (!property) return null;

  return (
    <main className="admin-review-page">
      <Link
        to="/admin/dashboard"
        className="admin-review-back-link"
      >
        ← Back to Dashboard
      </Link>

      <header className="admin-review-header">
        <div>
          <h1>Property Verification</h1>
          <p>Review the property and owner information before deciding.</p>
        </div>

        <span
          className={`review-status status-${property.status}`}
        >
          {property.status}
        </span>
      </header>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="success-message" role="status">
          {message}
        </p>
      )}

      {/* Property details */}
      <section className="admin-review-card">
        <h2>Property Details</h2>

        <div className="admin-review-grid">
          <Detail label="Property ID" value={property.id} />
          <Detail label="Title" value={property.title} />
          <Detail label="Property Type" value={property.type} />
          <Detail label="City" value={property.city} />
          <Detail label="Locality" value={property.locality} />

          <Detail
            label="Monthly Rent"
            value={
              property.rent != null
                ? `₹${Number(property.rent).toLocaleString("en-IN")}`
                : "Not specified"
            }
          />

          <Detail
            label="Security Deposit"
            value={
              property.deposit != null
                ? `₹${Number(property.deposit).toLocaleString("en-IN")}`
                : "Not specified"
            }
          />

          <Detail label="BHK" value={property.bhk ?? "Not specified"} />

          <Detail
            label="Area"
            value={
              property.area != null
                ? `${property.area} sq. ft.`
                : "Not specified"
            }
          />

          <Detail
            label="Furnishing"
            value={property.furnishing || "Not specified"}
          />

          <Detail
            label="Available From"
            value={property.available_from || "Not specified"}
          />

          

          <Detail
            label="Submitted At"
            value={
              property.created_at
                ? new Date(property.created_at).toLocaleString("en-IN")
                : "Not available"
            }
          />
        </div>

        {property.rejection_reason && (
          <div className="admin-rejection-reason">
            <strong>Previous rejection reason:</strong>
            <p>{property.rejection_reason}</p>
          </div>
        )}
      </section>

      {/* Owner details */}
      <section className="admin-review-card">
        <h2>Owner Information</h2>

        {owner ? (
          <div className="admin-review-grid">
            <Detail label="Owner ID" value={owner.id} />
            <Detail label="Username" value={owner.username} />
            <Detail label="Email" value={owner.email} />
            <Detail label="Phone Number" value={owner.phone || "Not provided"} />
            <Detail label="Role" value={owner.role} />
          </div>
        ) : (
          <p>Owner information is unavailable.</p>
        )}
      </section>

      {/* Property images */}
      <section className="admin-review-card">
        <h2>Property Images ({images.length})</h2>

        {images.length === 0 ? (
          <p>No images uploaded for this property.</p>
        ) : (
          <div className="admin-review-images">
            {images.map((image) => (
              <a
                key={image.id}
                href={image.image_url}
                target="_blank"
                rel="noreferrer"
                className="admin-review-image-link"
              >
                <img
                  src={image.image_url}
                  alt={`Property ${property.id} image ${image.id}`}
                  loading="lazy"
                />
                <span>Open full image ↗</span>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Amenities */}
      <section className="admin-review-card">
        <h2>Property Amenities ({amenities.length})</h2>

        {amenities.length === 0 ? (
          <p>No amenities assigned.</p>
        ) : (
          <div className="admin-review-amenities">
            {amenities.map((amenity) => (
              <span key={amenity.id}>
                ✓ {amenity.name}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Decision actions */}
      {property.status === "pending" && (
        <section className="admin-review-card admin-decision-card">
          <h2>Verification Decision</h2>

          <p>
            Review the available details and images before approving or
            rejecting this property.
          </p>

          <button
            type="button"
            className="approve-button"
            disabled={actionLoading}
            onClick={handleApprove}
          >
            {actionLoading ? "Processing..." : "Approve Property"}
          </button>

          <form onSubmit={handleReject}>
            <label htmlFor="rejectionReason">
              Rejection Reason
            </label>

            <textarea
              id="rejectionReason"
              rows={4}
              maxLength={1000}
              value={rejectionReason}
              onChange={(event) =>
                setRejectionReason(event.target.value)
              }
              placeholder="Explain why this property cannot be approved..."
            />

            <button
              type="submit"
              className="reject-button"
              disabled={actionLoading}
            >
              {actionLoading ? "Processing..." : "Reject Property"}
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function Detail({ label, value }) {
  return (
    <div className="admin-review-detail">
      <span>{label}</span>
      <strong>{value ?? "Not specified"}</strong>
    </div>
  );
}

export default AdminPropertyReview;