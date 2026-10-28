
import { useEffect, useState } from "react";
import api from "../api/axios";

function AmenitySelector({ selectedIds = [], onChange }) {
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function fetchAmenities() {
      try {
        const response = await api.get("/properties/amenities");

        console.log("Amenities response:", response.data);

        if (!cancelled) {
          setAmenities(response.data.amenities ?? []);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load amenities:", err);
        console.error("Response:", err.response?.data);

        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              "Unable to load amenities. Check the backend endpoints."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchAmenities();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleToggle(amenityId) {
    const updatedIds = selectedIds.includes(amenityId)
      ? selectedIds.filter((id) => id !== amenityId)
      : [...selectedIds, amenityId];

    onChange(updatedIds);
  }

  if (loading) {
    return <p>Loading amenities...</p>;
  }

  return (
    <section className="amenity-selector">
      <h2>Property Amenities</h2>
      <p>Select the amenities available at your property.</p>

      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}

      {!error && amenities.length === 0 && (
        <p>No amenities are available yet.</p>
      )}

      <div className="amenity-options">
        {amenities.map((amenity) => (
          <label key={amenity.id} className="amenity-option">
            <input
              type="checkbox"
              checked={selectedIds.includes(amenity.id)}
              onChange={() => handleToggle(amenity.id)}
            />

            <span>{amenity.name}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

export default AmenitySelector;

