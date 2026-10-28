import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import AmenitySelector from "../components/AmenitySelector";

function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: "",
    type: "flat",
    city: "",
    locality: "",
    rent: "",
    deposit: "",
    bhk: "",
    area: "",
    furnishing: "unfurnished",
    available_from: "",
  });

  const [existingImages, setExistingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newImageUrls, setNewImageUrls] = useState([""]);

  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  // Load property details, images, and amenities.
  useEffect(() => {
    let cancelled = false;

    async function fetchPropertyData() {
      setLoading(true);
      setError("");
      setImageError("");

      try {
        // 1. Fetch property details.
        const propertyResponse = await api.get(
          `/properties/${propertyId}`
        );

        if (cancelled) return;

        const property =
          propertyResponse.data.property ?? propertyResponse.data;

        setFormData({
          title: property.title ?? "",
          type: property.type ?? "flat",
          city: property.city ?? "",
          locality: property.locality ?? "",
          rent: property.rent ?? "",
          deposit: property.deposit ?? "",
          bhk: property.bhk ?? "",
          area: property.area ?? "",
          furnishing: property.furnishing ?? "unfurnished",
          available_from: property.available_from
            ? String(property.available_from).slice(0, 10)
            : "",
        });

        // 2. Fetch assigned amenities.
        try {
          const propertyAmenitiesResult = await api.get(
            `/properties/${propertyId}/amenities`
          );
          if (!cancelled) {
            const assignedAmenities =
              propertyAmenitiesResult.data.amenities ?? [];
            setSelectedAmenityIds(
              assignedAmenities.map((amenity) => amenity.id)
            );
          }
        } catch (amenityErr) {
          if (!cancelled) {
            console.error("Failed to fetch assigned amenities:", amenityErr);
          }
        }

        // 3. Fetch existing property images.
        try {
          const imagesResponse = await api.get(
            `/properties/${propertyId}/images`
          );

          if (cancelled) return;

          setExistingImages(
            Array.isArray(imagesResponse.data)
              ? imagesResponse.data
              : []
          );
        } catch (err) {
          if (cancelled) return;

          console.error(
            "Failed to fetch property images:",
            err.response?.data || err
          );

          setImageError(
            "Existing images could not be loaded. Check the backend image GET endpoint."
          );
        }
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load property:",
          err.response?.data || err
        );

        setError(
          err.response?.data?.message ||
            "Unable to load property details."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPropertyData();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Add another image URL field.
  function addImageField() {
    setNewImageUrls((previous) => [...previous, ""]);
  }

  function handleImageUrlChange(index, value) {
    setNewImageUrls((previous) =>
      previous.map((url, i) => (i === index ? value : url))
    );
  }

  function removeNewImageField(index) {
    setNewImageUrls((previous) =>
      previous.filter((_, i) => i !== index)
    );
  }

  // Mark an existing image for deletion.
  function removeExistingImage(imageId) {
    setExistingImages((previous) =>
      previous.filter((image) => image.id !== imageId)
    );

    setRemovedImageIds((previous) =>
      previous.includes(imageId)
        ? previous
        : [...previous, imageId]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSaving(true);

    const payload = {
      ...formData,
      rent: Number(formData.rent),
      deposit: formData.deposit === "" ? null : Number(formData.deposit),
      bhk: formData.bhk === "" ? null : Number(formData.bhk),
      area: formData.area === "" ? null : Number(formData.area),
    };

    const validImageUrls = newImageUrls
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      // 1. Update property details.
      await api.put(`/properties/${propertyId}`, payload);

      // 2. Replace the property's selected amenities.
      await api.put(`/properties/${propertyId}/amenities`, {
        amenity_ids: selectedAmenityIds,
      });

      // 3. Delete images marked for removal.
      const deleteResults = await Promise.allSettled(
        removedImageIds.map((imageId) =>
          api.delete(
            `/properties/${propertyId}/images/${imageId}`
          )
        )
      );

      const failedDeletes = deleteResults.filter(
        (result) => result.status === "rejected"
      ).length;

      // 4. Add new images.
      const addResults = await Promise.allSettled(
        validImageUrls.map((image_url) =>
          api.post(`/properties/${propertyId}/images`, {
            image_url,
          })
        )
      );

      const failedAdds = addResults.filter(
        (result) => result.status === "rejected"
      ).length;

      if (failedDeletes > 0 || failedAdds > 0) {
        setError(
          `Property details and amenities were saved, but ${failedDeletes} image deletion(s) and ${failedAdds} image addition(s) failed. Please check the image URLs and try again.`
        );

        return;
      }

      // 5. Return to the Owner Dashboard.
      navigate("/owner/dashboard");
    } catch (err) {
      console.error(
        "Update property error:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to update property. Please check the details."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="add-property-page">
        <p>Loading property details...</p>
      </main>
    );
  }

  return (
    <main className="add-property-page">
      <div className="add-property-header">
        <div>
          <h1>Edit Property</h1>
          <p>Update your property details, images, and amenities.</p>
        </div>

        <Link to="/owner/dashboard">Back to Dashboard</Link>
      </div>

      <form className="property-form" onSubmit={handleSubmit}>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {/* Property Details */}
        <h2>Property Details</h2>

        <div className="form-group">
          <label htmlFor="title">Property Title *</label>

          <input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="type">Property Type *</label>

            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="flat">Flat</option>
              <option value="house">House</option>
              <option value="PG">PG</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="city">City *</label>

            <input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="locality">Locality *</label>

          <input
            id="locality"
            name="locality"
            value={formData.locality}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="rent">Monthly Rent (₹) *</label>

            <input
              id="rent"
              name="rent"
              type="number"
              min="1"
              value={formData.rent}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="deposit">Deposit (₹)</label>

            <input
              id="deposit"
              name="deposit"
              type="number"
              min="0"
              value={formData.deposit}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="bhk">BHK</label>

            <select
              id="bhk"
              name="bhk"
              value={formData.bhk}
              onChange={handleChange}
            >
              <option value="">Not applicable</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="area">Area (sq. ft.)</label>

            <input
              id="area"
              name="area"
              type="number"
              min="1"
              value={formData.area}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="furnishing">Furnishing</label>

            <select
              id="furnishing"
              name="furnishing"
              value={formData.furnishing}
              onChange={handleChange}
            >
              <option value="unfurnished">Unfurnished</option>
              <option value="semi-furnished">Semi-furnished</option>
              <option value="furnished">Furnished</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="available_from">Available From *</label>

            <input
              id="available_from"
              name="available_from"
              type="date"
              value={formData.available_from}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <hr />

        {/* Existing Images */}
        <section className="property-images-form">
          <h2>Existing Property Images</h2>

          {imageError && (
            <p className="error-message" role="alert">
              {imageError}
            </p>
          )}

          {!imageError && existingImages.length === 0 && (
            <p>No existing images found.</p>
          )}

          <div className="existing-property-images">
            {existingImages.map((image) => (
              <div className="existing-image-card" key={image.id}>
                <img
                  src={image.image_url}
                  alt="Property"
                  className="property-image-preview"
                />

                <button
                  type="button"
                  onClick={() => removeExistingImage(image.id)}
                >
                  Remove Image
                </button>
              </div>
            ))}
          </div>
        </section>

        <hr />

        {/* Add New Images */}
        <section className="property-images-form">
          <h2>Add New Images</h2>

          <p>Enter direct image URLs.</p>

          {newImageUrls.map((url, index) => (
            <div className="form-group" key={index}>
              <label htmlFor={`new-image-${index}`}>
                Image URL {index + 1}
              </label>

              <div className="image-url-row">
                <input
                  id={`new-image-${index}`}
                  type="url"
                  placeholder="https://example.com/property.jpg"
                  value={url}
                  onChange={(event) =>
                    handleImageUrlChange(index, event.target.value)
                  }
                />

                {newImageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeNewImageField(index)}
                  >
                    Remove
                  </button>
                )}
              </div>

              {url.trim() && (
                <img
                  src={url}
                  alt={`New property preview ${index + 1}`}
                  className="property-image-preview"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.display = "block";
                  }}
                />
              )}
            </div>
          ))}

          <button type="button" onClick={addImageField}>
            + Add Another Image
          </button>
        </section>

        <hr />

        {/* Amenities */}
        <AmenitySelector
          selectedIds={selectedAmenityIds}
          onChange={setSelectedAmenityIds}
        />

        <div className="edit-property-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving Changes..." : "Save Changes"}
          </button>

          <Link to="/owner/dashboard">Cancel</Link>
        </div>
      </form>
    </main>
  );
}

export default EditProperty;