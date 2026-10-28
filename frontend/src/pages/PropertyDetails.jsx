import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBed,
  FaCalendarAlt,
  FaCheckCircle,
  FaComments,
  FaCouch,
  FaEye,
  FaHeart,
  FaMapMarkerAlt,
  FaPaperPlane,
  FaRegHeart,
  FaRulerCombined,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

function PropertyDetails() {
  const { propertyId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [property, setProperty] = useState(null);
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState("");

  const [amenities, setAmenities] = useState([]);
  const [amenitiesError, setAmenitiesError] = useState("");

  const [reviews, setReviews] = useState([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  const [favoriteMessage, setFavoriteMessage] = useState("");
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [enquiryFeedback, setEnquiryFeedback] = useState("");

  // Check if current property is in user's favorites
  useEffect(() => {
    let cancelled = false;
    async function checkFavorite() {
      if (user?.role !== "seeker") return;
      try {
        const response = await api.get("/favorites/");
        if (!cancelled && Array.isArray(response.data)) {
          const match = response.data.some(
            (fav) => Number(fav.property_id) === Number(propertyId)
          );
          setIsFavorite(match);
        }
      } catch {
        // Silently catch
      }
    }
    checkFavorite();
    return () => {
      cancelled = true;
    };
  }, [user, propertyId]);

  // Fetch property details, images, amenities, and reviews
  useEffect(() => {
    let cancelled = false;

    async function fetchProperty() {
      setLoading(true);
      setError("");
      setImageError("");
      setImages([]);
      setSelectedImage("");

      try {
        const response = await api.get(`/properties/${propertyId}`);
        if (cancelled) return;

        const propertyData = response.data.property ?? response.data;
        setProperty(propertyData);

        // Fetch property images
        try {
          const imageResponse = await api.get(`/properties/${propertyId}/images`);
          if (!cancelled) {
            const imageList = Array.isArray(imageResponse.data)
              ? imageResponse.data
              : [];
            setImages(imageList);
            if (imageList.length > 0) {
              setSelectedImage(imageList[0].image_url);
            }
          }
        } catch (err) {
          if (!cancelled) {
            console.error("Failed to load images:", err);
            setImageError(
              err.response?.status === 401
                ? "Log in to view property images."
                : "Property images could not be loaded."
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch property:", err);
          setError(err.response?.data?.message || "Unable to load property details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    // Fetch amenities
    async function fetchAmenities() {
      try {
        const response = await api.get(`/properties/${propertyId}/amenities`);
        if (!cancelled) {
          setAmenities(response.data.amenities ?? []);
          setAmenitiesError("");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch amenities:", err);
          setAmenitiesError(
            err.response?.data?.message || "Amenities could not be loaded."
          );
        }
      }
    }

    // Fetch reviews
    async function fetchReviews() {
      try {
        const response = await api.get(`/properties/${propertyId}/reviews`);
        if (!cancelled) {
          setReviews(response.data.reviews ?? []);
          setReviewError("");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch reviews:", err);
          setReviewError(
            err.response?.data?.message || "Reviews could not be loaded."
          );
        }
      }
    }

    fetchProperty();
    fetchAmenities();
    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, [propertyId]);

  // Submit Review
  async function handleAddReview(event) {
    event.preventDefault();
    setReviewFeedback("");

    if (
      !reviewRating ||
      isNaN(Number(reviewRating)) ||
      Number(reviewRating) < 1 ||
      Number(reviewRating) > 5
    ) {
      setReviewFeedback("Please select a rating from 1 to 5.");
      return;
    }

    if (reviewComment.trim().length > 1000) {
      setReviewFeedback("Your comment cannot exceed 1000 characters.");
      return;
    }

    setReviewLoading(true);

    try {
      const response = await api.post(`/properties/${propertyId}/reviews`, {
        rating: Number(reviewRating),
        comment: reviewComment.trim() || null,
      });

      setReviewFeedback(response.data.message || "Review submitted successfully.");
      setReviewComment("");
      setReviewRating(5);

      const reviewsResponse = await api.get(`/properties/${propertyId}/reviews`);
      setReviews(reviewsResponse.data.reviews ?? []);
    } catch (err) {
      console.error("Submit review error:", err);
      setReviewFeedback(
        err.response?.data?.message || "Unable to submit your review."
      );
    } finally {
      setReviewLoading(false);
    }
  }

  // Favorite toggle
  async function handleToggleFavorite() {
    if (!user) {
      alert("Please log in as a seeker to save properties.");
      return;
    }
    if (user.role !== "seeker") {
      alert("Only property seekers can add favorites.");
      return;
    }

    setFavoriteMessage("");
    setFavoriteLoading(true);

    try {
      if (isFavorite) {
        await api.delete(`/favorites/${propertyId}`);
        setIsFavorite(false);
        setFavoriteMessage("Removed from favorites.");
      } else {
        const response = await api.post(`/favorites/${propertyId}`);
        setIsFavorite(true);
        setFavoriteMessage(response.data.message || "Saved to favorites!");
      }
    } catch (err) {
      console.error("Toggle favorite error:", err);
      setFavoriteMessage(
        err.response?.data?.message || "Unable to update favorites."
      );
    } finally {
      setFavoriteLoading(false);
    }
  }

  // Send enquiry
  async function handleSendEnquiry(event) {
    event.preventDefault();

    if (!enquiryMessage.trim()) {
      setEnquiryFeedback("Please enter a message for the property owner.");
      return;
    }

    setEnquiryLoading(true);
    setEnquiryFeedback("");

    try {
      const response = await api.post("/enquiries", {
        property_id: Number(propertyId),
        message: enquiryMessage.trim(),
      });

      const enquiryId = response.data.enquiry?.id ?? response.data.enquiry_id;
      if (!enquiryId) {
        setEnquiryFeedback("Enquiry submitted, but conversation ID not returned.");
        return;
      }

      navigate(`/enquiries/${enquiryId}`);
    } catch (err) {
      console.error("Send enquiry error:", err);
      setEnquiryFeedback(
        err.response?.data?.message || "Failed to send enquiry. Please try again."
      );
    } finally {
      setEnquiryLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">
            Loading property details...
          </p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-50 py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 mb-2">
            Property Not Found
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {error || "The requested listing could not be found or has been removed."}
          </p>
          <Link
            to="/properties"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
          >
            <FaArrowLeft className="text-xs" />
            <span>Back to Listings</span>
          </Link>
        </div>
      </div>
    );
  }

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0) /
          reviews.length
        ).toFixed(1)
      : null;

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Top Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          <Link to="/" className="hover:text-blue-600">
            Home
          </Link>
          <span>/</span>
          <Link to="/properties" className="hover:text-blue-600">
            Properties
          </Link>
          <span>/</span>
          <span className="text-slate-900 truncate max-w-xs">{property.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                Verified Listing
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                {property.type}
              </span>
              {property.view_count > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <FaEye className="text-xs" /> {property.view_count} views
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {property.title}
            </h1>
            <p className="text-slate-500 text-sm flex items-center gap-1.5 mt-1">
              <FaMapMarkerAlt className="text-blue-600" />
              <span>
                {property.locality}, {property.city}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                isFavorite
                  ? "bg-rose-50 border border-rose-200 text-rose-600"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isFavorite ? <FaHeart className="text-rose-500" /> : <FaRegHeart />}
              <span>{isFavorite ? "Saved" : "Save Favorite"}</span>
            </button>
          </div>
        </div>

        {favoriteMessage && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-xl">
            {favoriteMessage}
          </div>
        )}

        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="relative aspect-[16/9] md:aspect-[21/9] bg-slate-900 rounded-3xl overflow-hidden shadow-sm">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={property.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80";
                }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <span className="text-4xl mb-2">🏡</span>
                <span className="text-sm font-semibold">
                  No high-resolution photos available
                </span>
              </div>
            )}
          </div>

          {/* Thumbnail list */}
          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(img.image_url)}
                  className={`w-24 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    selectedImage === img.image_url
                      ? "border-blue-600 shadow-sm"
                      : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                >
                  <img
                    src={img.image_url}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          {imageError && (
            <p className="text-xs text-rose-600 font-medium px-2">{imageError}</p>
          )}
        </div>

        {/* 2-Column Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (8 cols): Specs, Amenities, Reviews */}
          <div className="lg:col-span-8 space-y-8">
            {/* Key Specifications Grid */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Property Overview
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FaBed className="text-blue-600 text-lg mx-auto mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Bedrooms
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {property.bhk ? `${property.bhk} BHK` : "N/A"}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FaRulerCombined className="text-indigo-600 text-lg mx-auto mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Super Area
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {property.area ? `${property.area} sqft` : "N/A"}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FaCouch className="text-emerald-600 text-lg mx-auto mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Furnishing
                  </span>
                  <span className="text-base font-extrabold text-slate-900 capitalize truncate block">
                    {property.furnishing || "Unspecified"}
                  </span>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <FaCalendarAlt className="text-amber-600 text-lg mx-auto mb-1" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Available From
                  </span>
                  <span className="text-base font-extrabold text-slate-900">
                    {property.available_from || "Immediate"}
                  </span>
                </div>
              </div>
            </div>

            {/* Amenities Section */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Amenities & Features
              </h2>
              {amenitiesError && (
                <p className="text-xs text-rose-600 mb-3">{amenitiesError}</p>
              )}
              {amenities.length === 0 ? (
                <p className="text-xs text-slate-400">
                  No specific amenities listed for this property.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {amenities.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      <FaCheckCircle className="text-emerald-500 shrink-0" />
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ratings & Reviews */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Ratings & Reviews
                  </h2>
                  <p className="text-xs text-slate-400">
                    Feedback from verified seekers and tenants
                  </p>
                </div>

                {averageRating && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <FaStar className="text-amber-500 text-sm" />
                    <span className="text-sm font-extrabold text-amber-900">
                      {averageRating}
                    </span>
                    <span className="text-xs text-amber-700">
                      ({reviews.length})
                    </span>
                  </div>
                )}
              </div>

              {reviewError && (
                <p className="text-xs text-rose-600 font-medium">{reviewError}</p>
              )}

              {/* Review List */}
              {reviews.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No reviews submitted yet for this property.
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-800">
                          {rev.user_username || "Verified Seeker"}
                        </span>
                        <div className="flex text-amber-400 text-xs">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={
                                i < Number(rev.rating)
                                  ? "text-amber-400"
                                  : "text-slate-200"
                              }
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {rev.comment || "Rated without comment."}
                      </p>
                      {rev.created_at && (
                        <span className="text-[10px] text-slate-400 block pt-1">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Review Form */}
              {user?.role === "seeker" && (
                <form
                  onSubmit={handleAddReview}
                  className="pt-4 border-t border-slate-100 space-y-3"
                >
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Write a Review
                  </h3>
                  {reviewFeedback && (
                    <p className="text-xs font-semibold text-blue-600">
                      {reviewFeedback}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600">
                      Rating:
                    </label>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(e.target.value)}
                      className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      <option value="5">5 - Excellent</option>
                      <option value="4">4 - Good</option>
                      <option value="3">3 - Average</option>
                      <option value="2">2 - Below Average</option>
                      <option value="1">1 - Poor</option>
                    </select>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Share details about your inspection or thoughts on the property..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    disabled={reviewLoading}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {reviewLoading ? "Submitting..." : "Submit Review"}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Rent Card & Enquiry Form */}
          <div className="lg:col-span-4 space-y-6">
            {/* Rent Pricing Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-lg shadow-slate-200/50 space-y-5 sticky top-24">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Monthly Rent
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-black text-slate-900">
                    ₹{Number(property.rent).toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">
                    / month
                  </span>
                </div>
                {property.deposit && (
                  <p className="text-xs text-slate-500 mt-1 font-medium">
                    Security Deposit: ₹{Number(property.deposit).toLocaleString("en-IN")} (Refundable)
                  </p>
                )}
              </div>

              {/* Direct Enquiry Box */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <FaComments className="text-blue-600 text-sm" />
                  <h3 className="font-bold text-slate-900 text-sm">
                    Contact Property Owner
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Send a direct message to inquire about visits, lease duration, or negotiations.
                </p>

                {user?.role === "seeker" ? (
                  <form onSubmit={handleSendEnquiry} className="space-y-3">
                    <textarea
                      rows={4}
                      placeholder="Hi, I am interested in renting this property. Is it available for a visit this weekend?"
                      value={enquiryMessage}
                      onChange={(e) => setEnquiryMessage(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                    />

                    {enquiryFeedback && (
                      <p className="text-xs font-medium text-rose-600">
                        {enquiryFeedback}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={enquiryLoading}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                    >
                      <FaPaperPlane className="text-xs" />
                      <span>{enquiryLoading ? "Sending..." : "Send Enquiry"}</span>
                    </button>
                  </form>
                ) : user?.role === "owner" ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-800">
                    You are logged in as a <strong>property owner</strong>. Switch to a seeker account to contact other owners.
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <p className="text-xs text-slate-500">
                      Sign in as a property seeker to message this owner.
                    </p>
                    <Link
                      to="/login"
                      className="block w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Sign In to Inquire
                    </Link>
                  </div>
                )}
              </div>

              {/* Trust Badge */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3 text-xs text-slate-500">
                <FaShieldAlt className="text-emerald-500 text-lg shrink-0" />
                <span>
                  Admin-verified property with authentic landlord ownership.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetails;