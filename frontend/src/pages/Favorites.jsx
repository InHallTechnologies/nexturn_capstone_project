import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaArrowRight, FaHeart, FaMapMarkerAlt, FaSearch, FaTrash } from "react-icons/fa";
import api from "../api/axios";

function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState(null);

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/favorites/");
      setFavorites(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch favorites:", err);
      setError(
        err.response?.data?.message ||
          "Unable to load your saved favorites. Please make sure you are logged in as a seeker."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cancelled) {
        fetchFavorites();
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchFavorites]);

  async function handleRemoveFavorite(propertyId) {
    const confirmed = window.confirm(
      "Remove this property from your saved favorites?"
    );
    if (!confirmed) return;

    setRemovingId(propertyId);
    setError("");

    try {
      await api.delete(`/favorites/${propertyId}`);
      setFavorites((prev) =>
        prev.filter((fav) => fav.property_id !== propertyId)
      );
    } catch (err) {
      console.error("Remove favorite error:", err);
      setError(
        err.response?.data?.message || "Unable to remove this favorite."
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
              <FaHeart className="text-xs" /> Saved Units
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              My Saved Favorites
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Shortlist properties you love, track pricing, and reach out to owners.
            </p>
          </div>

          <Link
            to="/properties"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
          >
            <FaSearch className="text-xs" />
            <span>Browse More Listings</span>
          </Link>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-xs font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3"
              >
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-7 w-1/3 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-12 shadow-xs">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaHeart />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              No saved favorites yet
            </h3>
            <p className="text-slate-500 text-xs mb-6">
              Click the heart icon on any verified property to save it to your wishlist for later.
            </p>
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
            >
              <span>Explore Available Homes</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((fav) => (
              <article
                key={fav.favorite_id || fav.property_id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
                      ID #{fav.property_id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFavorite(fav.property_id)}
                      disabled={removingId === fav.property_id}
                      title="Remove from favorites"
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>

                  <Link to={`/properties/${fav.property_id}`}>
                    <h3 className="font-bold text-slate-900 text-base leading-snug hover:text-blue-600 transition-colors line-clamp-1 mb-1">
                      {fav.title}
                    </h3>
                  </Link>

                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-3">
                    <FaMapMarkerAlt className="text-slate-400 shrink-0 text-xs" />
                    <span>
                      {fav.locality || "Locality not set"}, {fav.city}
                    </span>
                  </p>

                  <div className="flex items-baseline gap-1 text-slate-900 font-extrabold text-xl mb-4">
                    <span>₹{Number(fav.rent ?? 0).toLocaleString("en-IN")}</span>
                    <span className="text-xs text-slate-400 font-semibold">/ month</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    to={`/properties/${fav.property_id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <span>View Listing Details</span>
                    <FaArrowRight className="text-[10px]" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleRemoveFavorite(fav.property_id)}
                    disabled={removingId === fav.property_id}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors"
                  >
                    {removingId === fav.property_id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Favorites;
