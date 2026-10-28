import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";

function PropertyImageManager({ propertyId }) {
  const [images, setImages] = useState([]);
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchImages = useCallback(async () => {
    if (!propertyId) return;
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/properties/${propertyId}/images`
      );

      setImages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load property images."
      );
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cancelled && propertyId) {
        fetchImages();
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [propertyId, fetchImages]);

  const handleAddImage = async (event) => {
    event.preventDefault();

    if (!imageUrl.trim()) {
      setError("Please enter an image URL.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await api.post(`/properties/${propertyId}/images`, {
        image_url: imageUrl.trim(),
      });

      setImageUrl("");
      await fetchImages();
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to add the image."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this image?"
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(
        `/properties/${propertyId}/images/${imageId}`
      );

      setImages((previousImages) =>
        previousImages.filter((image) => image.id !== imageId)
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to delete the image."
      );
    }
  };

  if (loading) {
    return <p>Loading property images...</p>;
  }

  return (
    <section className="property-image-manager">
      <h2>Property Images</h2>

      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleAddImage}>
        <label htmlFor="imageUrl">Image URL</label>

        <input
          id="imageUrl"
          type="url"
          placeholder="https://example.com/property.jpg"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          required
        />

        <button type="submit" disabled={saving}>
          {saving ? "Adding..." : "Add Image"}
        </button>
      </form>

      <div className="property-image-grid">
        {images.map((image) => (
          <div key={image.id} className="property-image-item">
            <img
              src={image.image_url}
              alt="Property"
              onError={(event) => {
                event.currentTarget.alt = "Image could not be loaded";
              }}
            />

            <button
              type="button"
              onClick={() => handleDeleteImage(image.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <p>No images have been added to this property yet.</p>
      )}
    </section>
  );
}

export default PropertyImageManager;