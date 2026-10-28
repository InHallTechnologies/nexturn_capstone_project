import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FaArrowRight,
  FaBed,
  FaChevronLeft,
  FaChevronRight,
  FaCouch,
  FaFilter,
  FaHeart,
  FaMapMarkerAlt,
  FaRedo,
  FaRegHeart,
  FaRulerCombined,
  FaSearch,
  FaTimes,
} from "react-icons/fa";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

const PER_PAGE = 9;

const SORT_OPTIONS = [
  { label: "Newest First", sortBy: "created_at", order: "desc" },
  { label: "Oldest First", sortBy: "created_at", order: "asc" },
  { label: "Rent: Low to High", sortBy: "rent", order: "asc" },
  { label: "Rent: High to Low", sortBy: "rent", order: "desc" },
  { label: "Area: Largest First", sortBy: "area", order: "desc" },
  { label: "Area: Smallest First", sortBy: "area", order: "asc" },
  { label: "Title: A to Z", sortBy: "title", order: "asc" },
  { label: "Title: Z to A", sortBy: "title", order: "desc" },
];

function PropertyListing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const resultsRef = useRef(null);

  // Read URL query params
  const pageParam = parseInt(searchParams.get("page") || "1", 10);
  const currentPage = isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  const searchQuery = searchParams.get("search") || "";
  const cityQuery = searchParams.get("city") || "";
  const typeQuery = searchParams.get("type") || "";
  const minRentQuery = searchParams.get("min_rent") || "";
  const maxRentQuery = searchParams.get("max_rent") || "";
  const bhkQuery = searchParams.get("bhk") || "";
  const furnishingQuery = searchParams.get("furnishing") || "";
  const sortByQuery = searchParams.get("sort_by") || "created_at";
  const orderQuery = searchParams.get("order") || "desc";

  // Local state for instant inputs
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [cityInput, setCityInput] = useState(cityQuery);
  const [minRentInput, setMinRentInput] = useState(minRentQuery);
  const [maxRentInput, setMaxRentInput] = useState(maxRentQuery);

  // Synchronize input fields when URL params change
  const [prevQueries, setPrevQueries] = useState({
    search: searchQuery,
    city: cityQuery,
    minRent: minRentQuery,
    maxRent: maxRentQuery,
  });

  if (
    prevQueries.search !== searchQuery ||
    prevQueries.city !== cityQuery ||
    prevQueries.minRent !== minRentQuery ||
    prevQueries.maxRent !== maxRentQuery
  ) {
    setPrevQueries({
      search: searchQuery,
      city: cityQuery,
      minRent: minRentQuery,
      maxRent: maxRentQuery,
    });
    setSearchInput(searchQuery);
    setCityInput(cityQuery);
    setMinRentInput(minRentQuery);
    setMaxRentInput(maxRentQuery);
  }

  const [properties, setProperties] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: PER_PAGE,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [favoritesMap, setFavoritesMap] = useState({});
  const [favLoadingId, setFavLoadingId] = useState(null);

  // Fetch seeker favorites to show active heart icons
  useEffect(() => {
    let cancelled = false;
    async function loadFavorites() {
      if (user?.role !== "seeker") return;
      try {
        const response = await api.get("/favorites/");
        if (!cancelled && Array.isArray(response.data)) {
          const map = {};
          response.data.forEach((fav) => {
            map[fav.property_id] = fav.favorite_id;
          });
          setFavoritesMap(map);
        }
      } catch {
        // Silently catch favorite load failure
      }
    }
    loadFavorites();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Main data fetching effect (server-side pagination, sorting, filters)
  useEffect(() => {
    let cancelled = false;

    async function fetchProperties() {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: currentPage,
          per_page: PER_PAGE,
          sort_by: sortByQuery,
          order: orderQuery,
        };

        if (searchQuery.trim()) params.search = searchQuery.trim();
        if (cityQuery.trim()) params.city = cityQuery.trim();
        if (typeQuery.trim()) params.type = typeQuery.trim();
        if (minRentQuery.trim()) params.min_rent = minRentQuery.trim();
        if (maxRentQuery.trim()) params.max_rent = maxRentQuery.trim();
        if (bhkQuery.trim()) params.bhk = bhkQuery.trim();
        if (furnishingQuery.trim()) params.furnishing = furnishingQuery.trim();

        const response = await api.get("/properties/public", { params });
        const data = response.data;

        if (cancelled) return;

        setProperties(data.properties || []);
        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            page: currentPage,
            per_page: PER_PAGE,
            total_items: data.count || data.properties?.length || 0,
            total_pages: Math.max(1, Math.ceil((data.count || 1) / PER_PAGE)),
            has_next: false,
            has_previous: false,
          });
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load properties:", err);
          setError(
            err.response?.data?.message ||
              "Failed to load properties. Please check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProperties();

    return () => {
      cancelled = true;
    };
  }, [
    currentPage,
    searchQuery,
    cityQuery,
    typeQuery,
    minRentQuery,
    maxRentQuery,
    bhkQuery,
    furnishingQuery,
    sortByQuery,
    orderQuery,
  ]);

  // Helper to update URL search parameters and reset to page 1
  function updateFilters(updates) {
    const newParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });

    // Reset to page 1 unless page itself was explicitly updated
    if (!("page" in updates)) {
      newParams.set("page", "1");
    }

    setSearchParams(newParams);
  }

  // Handle page change
  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > pagination.total_pages || newPage === currentPage) {
      return;
    }
    updateFilters({ page: newPage });
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  // Handle Search Submission
  function handleSearchSubmit(e) {
    e.preventDefault();
    updateFilters({
      search: searchInput.trim(),
      city: cityInput.trim(),
      min_rent: minRentInput.trim(),
      max_rent: maxRentInput.trim(),
    });
  }

  // Clear all filters
  function handleClearFilters() {
    setSearchInput("");
    setCityInput("");
    setMinRentInput("");
    setMaxRentInput("");
    setSearchParams(new URLSearchParams());
  }

  // Handle sorting dropdown change
  function handleSortChange(e) {
    const selectedIndex = parseInt(e.target.value, 10);
    const selected = SORT_OPTIONS[selectedIndex] || SORT_OPTIONS[0];
    updateFilters({
      sort_by: selected.sortBy,
      order: selected.order,
      page: 1,
    });
  }

  // Toggle favorite
  async function handleToggleFavorite(e, propertyId) {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      alert("Please log in as a seeker to save properties.");
      return;
    }
    if (user.role !== "seeker") {
      alert("Only property seekers can add favorites.");
      return;
    }

    setFavLoadingId(propertyId);
    try {
      if (favoritesMap[propertyId]) {
        await api.delete(`/favorites/${propertyId}`);
        setFavoritesMap((prev) => {
          const next = { ...prev };
          delete next[propertyId];
          return next;
        });
      } else {
        await api.post(`/favorites/${propertyId}`);
        setFavoritesMap((prev) => ({
          ...prev,
          [propertyId]: true,
        }));
      }
    } catch (favErr) {
      console.error("Favorite toggle error:", favErr);
    } finally {
      setFavLoadingId(null);
    }
  }

  // Calculate current sort index
  const currentSortIndex = SORT_OPTIONS.findIndex(
    (opt) => opt.sortBy === sortByQuery && opt.order === orderQuery
  );
  const activeSortIndex = currentSortIndex >= 0 ? currentSortIndex : 0;

  // Active filter count
  const activeFilterCount = [
    searchQuery,
    cityQuery,
    typeQuery,
    minRentQuery,
    maxRentQuery,
    bhkQuery,
    furnishingQuery,
  ].filter(Boolean).length;

  // Generate numbered pagination items with ellipsis
  const paginationPages = useMemo(() => {
    const pages = [];
    const total = pagination.total_pages;
    const current = pagination.page;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("...");

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (current < total - 2) pages.push("...");
      pages.push(total);
    }

    return pages;
  }, [pagination.total_pages, pagination.page]);

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16">
      {/* Header Banner */}
      <section className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-400/20">
            Verified Rental Marketplace
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
            Find Your Next Home
          </h1>
          <p className="text-slate-300 max-w-2xl text-base sm:text-lg">
            Discover verified apartments, independent houses, and flats with transparent pricing and direct owner contacts.
          </p>
        </div>
      </section>

      {/* Main Filter & Discovery Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200/80 p-5 sm:p-6 mb-8 transition-shadow">
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            {/* Top row: search & city inputs */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
              <div className="md:col-span-5 relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Search title, locality, landmark..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      updateFilters({ search: "" });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>

              <div className="md:col-span-4 relative">
                <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="City (e.g. Hyderabad, Kurnool)"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  className="w-full pl-10 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
                {cityInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCityInput("");
                      updateFilters({ city: "" });
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <FaTimes className="text-xs" />
                  </button>
                )}
              </div>

              <div className="md:col-span-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm shadow-blue-500/20"
                >
                  <FaSearch className="text-xs" />
                  <span>Search</span>
                </button>
                {activeFilterCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    title="Clear All Filters"
                    className="px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-sm flex items-center justify-center transition-colors"
                  >
                    <FaRedo className="text-xs" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter pills & dropdowns row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t border-slate-100">
              {/* Type Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Property Type
                </label>
                <select
                  value={typeQuery}
                  onChange={(e) => updateFilters({ type: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">All Types</option>
                  <option value="flat">Flat / Apartment</option>
                  <option value="house">Independent House</option>
                  <option value="villa">Villa</option>
                  <option value="pg">PG / Co-Living</option>
                  <option value="studio">Studio Apartment</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              {/* BHK Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Bedrooms (BHK)
                </label>
                <select
                  value={bhkQuery}
                  onChange={(e) => updateFilters({ bhk: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Any BHK</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4 BHK</option>
                  <option value="5">5+ BHK</option>
                </select>
              </div>

              {/* Furnishing Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Furnishing
                </label>
                <select
                  value={furnishingQuery}
                  onChange={(e) => updateFilters({ furnishing: e.target.value })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Any Furnishing</option>
                  <option value="furnished">Furnished</option>
                  <option value="semi-furnished">Semi-Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>

              {/* Min Rent Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Min Rent (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="Min ₹"
                  value={minRentInput}
                  onChange={(e) => setMinRentInput(e.target.value)}
                  onBlur={() => updateFilters({ min_rent: minRentInput.trim() })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Max Rent Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Max Rent (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  placeholder="Max ₹"
                  value={maxRentInput}
                  onChange={(e) => setMaxRentInput(e.target.value)}
                  onBlur={() => updateFilters({ max_rent: maxRentInput.trim() })}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* Reset Action */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={activeFilterCount === 0}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    activeFilterCount > 0
                      ? "bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                      : "bg-slate-50 text-slate-300 cursor-not-allowed"
                  }`}
                >
                  <FaFilter className="text-[10px]" />
                  <span>Reset Filters</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Results Bar: Count & Sorting */}
        <div
          ref={resultsRef}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-2"
        >
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Verified Properties
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              {loading ? (
                "Searching listings..."
              ) : pagination.total_items > 0 ? (
                <>
                  Showing{" "}
                  <span className="font-semibold text-slate-800">
                    {(currentPage - 1) * PER_PAGE + 1}–
                    {Math.min(currentPage * PER_PAGE, pagination.total_items)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-slate-800">
                    {pagination.total_items}
                  </span>{" "}
                  properties
                </>
              ) : (
                "0 properties found"
              )}
            </p>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <label
              htmlFor="sort-by"
              className="text-xs font-semibold text-slate-500 whitespace-nowrap"
            >
              Sort by:
            </label>
            <div className="relative">
              <select
                id="sort-by"
                value={activeSortIndex}
                onChange={handleSortChange}
                className="appearance-none bg-white border border-slate-200 text-slate-800 py-2 pl-3 pr-8 rounded-xl text-xs sm:text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent cursor-pointer"
              >
                {SORT_OPTIONS.map((opt, idx) => (
                  <option key={opt.label} value={idx}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm animate-pulse"
              >
                <div className="w-full aspect-[16/10] bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-5 w-20 bg-slate-200 rounded-full" />
                    <div className="h-5 w-16 bg-slate-200 rounded-full" />
                  </div>
                  <div className="h-6 w-3/4 bg-slate-200 rounded" />
                  <div className="h-4 w-1/2 bg-slate-200 rounded" />
                  <div className="h-7 w-1/3 bg-slate-200 rounded pt-2" />
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="h-8 bg-slate-100 rounded-lg" />
                    <div className="h-8 bg-slate-100 rounded-lg" />
                    <div className="h-8 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-xl mx-auto my-8">
            <p className="text-red-700 font-medium text-sm mb-4">{error}</p>
            <button
              type="button"
              onClick={() => updateFilters({})}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <FaRedo className="text-xs" />
              <span>Retry Search</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && properties.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-sm">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaSearch />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              No matching properties found
            </h3>
            <p className="text-slate-500 text-sm mb-6">
              We couldn't find any verified properties matching your selected filters. Try broadening your criteria or reset filters.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-blue-500/20"
            >
              <span>Clear All Filters</span>
            </button>
          </div>
        )}

        {/* Property Grid */}
        {!loading && !error && properties.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((property) => {
                const isFavorite = Boolean(favoritesMap[property.id]);
                const isFavPending = favLoadingId === property.id;

                return (
                  <article
                    key={property.id}
                    className="group bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Header */}
                      <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                        <Link
                          to={`/properties/${property.id}`}
                          className="block w-full h-full"
                        >
                          {property.primary_image ? (
                            <img
                              src={property.primary_image}
                              alt={property.title}
                              loading="lazy"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src =
                                  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                              <span className="text-3xl mb-1">🏡</span>
                              <span className="text-xs font-medium">
                                Verified Property
                              </span>
                            </div>
                          )}
                        </Link>

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-600/90 text-white shadow-sm backdrop-blur-xs">
                            Verified
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide capitalize bg-slate-900/80 text-white shadow-sm backdrop-blur-xs">
                            {property.type}
                          </span>
                        </div>

                        {/* Favorite Button */}
                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, property.id)}
                          disabled={isFavPending}
                          title={isFavorite ? "Remove from favorites" : "Save to favorites"}
                          className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md ${
                            isFavorite
                              ? "bg-rose-500 text-white hover:bg-rose-600"
                              : "bg-white/90 text-slate-600 hover:text-rose-500 hover:bg-white"
                          }`}
                        >
                          {isFavorite ? (
                            <FaHeart className="text-sm" />
                          ) : (
                            <FaRegHeart className="text-sm" />
                          )}
                        </button>
                      </div>

                      {/* Card Content */}
                      <div className="p-5">
                        {/* Price */}
                        <div className="flex items-baseline gap-1 mb-1.5">
                          <span className="text-2xl font-extrabold text-slate-900">
                            ₹{Number(property.rent).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            / month
                          </span>
                          {property.deposit && (
                            <span className="ml-auto text-[11px] font-medium text-slate-400">
                              Dep: ₹{Number(property.deposit).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <Link to={`/properties/${property.id}`}>
                          <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-blue-600 transition-colors mb-1.5">
                            {property.title}
                          </h3>
                        </Link>

                        {/* Location */}
                        <p className="flex items-center gap-1.5 text-xs text-slate-500 mb-4 line-clamp-1">
                          <FaMapMarkerAlt className="text-slate-400 shrink-0" />
                          <span>
                            {property.locality}, {property.city}
                          </span>
                        </p>

                        {/* Spec Pills */}
                        <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs">
                          <div className="flex flex-col items-center justify-center">
                            <span className="flex items-center gap-1 text-slate-400 mb-0.5">
                              <FaBed className="text-[11px]" />
                              <span className="text-[10px] uppercase font-semibold">BHK</span>
                            </span>
                            <span className="font-bold text-slate-800">
                              {property.bhk ?? "—"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center border-x border-slate-200">
                            <span className="flex items-center gap-1 text-slate-400 mb-0.5">
                              <FaRulerCombined className="text-[11px]" />
                              <span className="text-[10px] uppercase font-semibold">Area</span>
                            </span>
                            <span className="font-bold text-slate-800 truncate px-1">
                              {property.area ? `${property.area} sqft` : "—"}
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center">
                            <span className="flex items-center gap-1 text-slate-400 mb-0.5">
                              <FaCouch className="text-[11px]" />
                              <span className="text-[10px] uppercase font-semibold">Furnish</span>
                            </span>
                            <span className="font-bold text-slate-800 capitalize truncate px-1">
                              {property.furnishing ? property.furnishing.replace("-", " ") : "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-5 pb-5 pt-0">
                      <Link
                        to={`/properties/${property.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-600 hover:text-white transition-all duration-200"
                      >
                        <span>View Details</span>
                        <FaArrowRight className="text-xs" />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <nav
                className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 pt-6"
                aria-label="Pagination Navigation"
              >
                <div className="text-xs sm:text-sm text-slate-500 font-medium order-2 sm:order-1">
                  Page <span className="font-bold text-slate-800">{pagination.page}</span> of{" "}
                  <span className="font-bold text-slate-800">{pagination.total_pages}</span> (
                  {pagination.total_items} total listings)
                </div>

                <div className="flex items-center gap-1.5 order-1 sm:order-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.has_previous}
                    className={`h-10 px-3.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                      pagination.has_previous
                        ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs cursor-pointer"
                        : "bg-slate-100 text-slate-300 border border-transparent cursor-not-allowed"
                    }`}
                  >
                    <FaChevronLeft className="text-xs" />
                    <span className="hidden sm:inline">Previous</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {paginationPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <span
                            key={`dots-${index}`}
                            className="px-3 py-2 text-slate-400 select-none font-medium"
                          >
                            ...
                          </span>
                        );
                      }
                      const isActive = item === pagination.page;
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => handlePageChange(item)}
                          className={`min-w-[40px] h-10 px-3 rounded-lg text-sm font-semibold transition-all duration-150 ${
                            isActive
                              ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                              : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          {item}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.has_next}
                    className={`h-10 px-3.5 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all ${
                      pagination.has_next
                        ? "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs cursor-pointer"
                        : "bg-slate-100 text-slate-300 border border-transparent cursor-not-allowed"
                    }`}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PropertyListing;
