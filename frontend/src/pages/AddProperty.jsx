
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import AmenitySelector from "../components/AmenitySelector";

function AddProperty() {
  const navigate = useNavigate();

  const [selectedAmenityIds, setSelectedAmenityIds] = useState([]);

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

  const [imageUrls, setImageUrls] = useState([""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleImageUrlChange(index, value) {
    setImageUrls((previous) =>
      previous.map((url, i) => (i === index ? value : url))
    );
  }

  function addImageField() {
    setImageUrls((previous) => [...previous, ""]);
  }

  function removeImageField(index) {
    setImageUrls((previous) => previous.filter((_, i) => i !== index));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const payload = {
      ...formData,
      rent: Number(formData.rent),
      deposit: formData.deposit ? Number(formData.deposit) : null,
      bhk: formData.bhk ? Number(formData.bhk) : null,
      area: formData.area ? Number(formData.area) : null,
    };

    const validImageUrls = imageUrls
      .map((url) => url.trim())
      .filter(Boolean);

    try {
      // 1. Create the property.
      const propertyResponse = await api.post("/properties", payload);

      const propertyId =
        propertyResponse.data.property?.id ??
        propertyResponse.data.property_id ??
        propertyResponse.data.id;

      if (!propertyId) {
        throw new Error(
          "Property was created, but its ID was not returned by the backend."
        );
      }

      // 2. Save selected amenities.
      if (selectedAmenityIds.length > 0) {
        await api.put(`/properties/${propertyId}/amenities`, {
          amenity_ids: selectedAmenityIds,
        });
      }

      // 3. Save property images.
      const imageResults = await Promise.allSettled(
        validImageUrls.map((image_url) =>
          api.post(`/properties/${propertyId}/images`, { image_url })
        )
      );

      const failedImages = imageResults.filter(
        (result) => result.status === "rejected"
      );

      if (failedImages.length > 0) {
        setError(
          `Property and amenities saved, but ${failedImages.length} image(s) could not be saved. You can try adding them later.`
        );
        return;
      }

      // 4. Navigate after all operations succeed.
      navigate("/owner/dashboard");
    } catch (err) {
      console.error(
        "Create property error:",
        err.response?.data || err
      );

      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to create the property. Please check the details."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="add-property-page">
      <div className="add-property-header">
        <div>
          <h1>Add Property</h1>
          <p>Enter the details of the property you want to list.</p>
        </div>

        <Link to="/owner/dashboard">Back to Dashboard</Link>
      </div>

      <form className="property-form" onSubmit={handleSubmit}>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="title">Property Title *</label>
          <input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Example: 2 BHK flat near bus stand"
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

        {/* Property Images */}
        <section className="property-images-form">
          <h2>Property Images</h2>
          <p>Enter direct image URLs. You can add more than one image.</p>

          {imageUrls.map((url, index) => (
            <div className="form-group" key={index}>
              <label htmlFor={`image-url-${index}`}>
                Image URL {index + 1}
              </label>

              <div className="image-url-row">
                <input
                  id={`image-url-${index}`}
                  type="url"
                  placeholder="https://example.com/property.jpg"
                  value={url}
                  onChange={(event) =>
                    handleImageUrlChange(index, event.target.value)
                  }
                />

                {imageUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                  >
                    Remove
                  </button>
                )}
              </div>

              {url.trim() && (
                <img
                  src={url}
                  alt={`Property preview ${index + 1}`}
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

        {/* Property Amenities */}
        <AmenitySelector
          selectedIds={selectedAmenityIds}
          onChange={setSelectedAmenityIds}
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating Property..." : "Create Property"}
        </button>
      </form>
    </main>
  );
}

export default AddProperty;

