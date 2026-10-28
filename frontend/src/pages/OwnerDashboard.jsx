import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBuilding,
  FaCheckCircle,
  FaClock,
  FaEdit,
  FaExclamationTriangle,
  FaEye,
  FaPlus,
  FaRedo,
  FaSearch,
  FaTimesCircle,
  FaTrash,
} from "react-icons/fa";
import api from "../api/axios";

const OWNER_PER_PAGE = 8;

function OwnerDashboard() {
  const [properties, setProperties] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: OWNER_PER_PAGE,
    total_items: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  // Filters & Page State
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch properties belonging to the logged-in owner
  const fetchProperties = useCallback(
    async (pageToFetch = currentPage, status = statusFilter, search = searchTerm) => {
      setLoading(true);
      setError("");

      try {
        const params = {
          page: pageToFetch,
          per_page: OWNER_PER_PAGE,
          sort_by: "created_at",
          order: "desc",
        };

        if (status) params.status = status;
        if (search.trim()) params.search = search.trim();

        const response = await api.get("/properties", { params });
        const data = response.data;

        const propertyList = Array.isArray(data)
          ? data
          : data?.properties ?? [];

        setProperties(propertyList);

        if (data.stats) {
          setStats(data.stats);
        } else {
          // Fallback calculation if backend stats not returned
          const pending = propertyList.filter((p) => p.status === "pending").length;
          const verified = propertyList.filter((p) => p.status === "verified").length;
          const rejected = propertyList.filter((p) => p.status === "rejected").length;
          setStats({
            total: data.count || propertyList.length,
            pending,
            verified,
            rejected,
          });
        }

        if (data.pagination) {
          setPagination(data.pagination);
        } else {
          setPagination({
            page: pageToFetch,
            per_page: OWNER_PER_PAGE,
            total_items: data.count || propertyList.length,
            total_pages: Math.max(1, Math.ceil((data.count || propertyList.length) / OWNER_PER_PAGE)),
            has_next: false,
            has_previous: false,
          });
        }
      } catch (err) {
        console.error("Failed to fetch properties:", err.response?.data || err);
        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to load your properties. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [currentPage, statusFilter, searchTerm]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cancelled) {
        fetchProperties();
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchProperties]);

  // Handle status tab click
  function handleStatusTab(newStatus) {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchProperties(1, newStatus, searchTerm);
  }

  // Handle search submit
  function handleSearchSubmit(e) {
    e.preventDefault();
    setCurrentPage(1);
    fetchProperties(1, statusFilter, searchTerm);
  }

  // Delete a property
  async function handleDelete(propertyId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this property? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeletingId(propertyId);
    setError("");

    try {
      await api.delete(`/properties/${propertyId}`);
      // Refresh list to maintain correct pagination and stats
      fetchProperties(currentPage, statusFilter, searchTerm);
    } catch (err) {
      console.error("Delete property error:", err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to delete the property. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
              <FaBuilding className="text-xs" /> Owner Workspace
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Owner Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage your rental properties, monitor verification status, and review tenant enquiries.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => fetchProperties(currentPage, statusFilter, searchTerm)}
              disabled={loading}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
            >
              <FaRedo className={`text-xs ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/owner/properties/new"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 transition-all"
            >
              <FaPlus className="text-xs" />
              <span>Add Property</span>
            </Link>
          </div>
        </div>

        {/* Statistics Cards - ALWAYS reflects all owner properties */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Total */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Total Properties
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-sm">
                <FaBuilding />
              </div>
            </div>
            <p className="text-3xl font-black text-slate-900">{stats.total}</p>
            <span className="text-[11px] text-slate-400 font-medium">All listed units</span>
          </div>

          {/* Verified */}
          <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-emerald-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Verified & Live
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm">
                <FaCheckCircle />
              </div>
            </div>
            <p className="text-3xl font-black text-emerald-700">{stats.verified}</p>
            <span className="text-[11px] text-emerald-600/70 font-medium">Visible to public</span>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-amber-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Pending Review
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-sm">
                <FaClock />
              </div>
            </div>
            <p className="text-3xl font-black text-amber-700">{stats.pending}</p>
            <span className="text-[11px] text-amber-600/70 font-medium">Awaiting admin review</span>
          </div>

          {/* Rejected */}
          <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-xs hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between text-rose-600 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">
                Action Required
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
                <FaTimesCircle />
              </div>
            </div>
            <p className="text-3xl font-black text-rose-700">{stats.rejected}</p>
            <span className="text-[11px] text-rose-600/70 font-medium">Rejected submissions</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => fetchProperties()}
              className="text-xs font-bold text-rose-700 underline ml-4 cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {[
              { label: "All Properties", value: "", count: stats.total },
              { label: "Verified", value: "verified", count: stats.verified },
              { label: "Pending", value: "pending", count: stats.pending },
              { label: "Rejected", value: "rejected", count: stats.rejected },
            ].map((tab) => {
              const isActive = statusFilter === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => handleStatusTab(tab.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full sm:w-72 relative"
          >
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            <input
              type="text"
              placeholder="Search by title, locality..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  fetchProperties(1, statusFilter, "");
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* Listings Section */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs animate-pulse space-y-3"
              >
                <div className="h-4 w-24 bg-slate-200 rounded-full" />
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-8 bg-slate-100 rounded-lg pt-4" />
              </div>
            ))}
          </div>
        ) : properties.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-md mx-auto my-8 shadow-xs">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
              <FaBuilding />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              No properties listed here
            </h3>
            <p className="text-slate-500 text-xs mb-6">
              {statusFilter
                ? `You have no properties matching the "${statusFilter}" status filter.`
                : "You haven't added any properties yet. List your first property now to start receiving enquiries."}
            </p>
            <Link
              to="/owner/properties/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-blue-500/20"
            >
              <FaPlus className="text-xs" />
              <span>+ Add Your First Property</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {properties.map((property) => {
                const status = property.status || "pending";
                return (
                  <article
                    key={property.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Bar: Status Badge & ID */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                            status === "verified"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : status === "rejected"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {status === "verified" && <FaCheckCircle className="text-[10px]" />}
                          {status === "pending" && <FaClock className="text-[10px]" />}
                          {status === "rejected" && <FaTimesCircle className="text-[10px]" />}
                          <span>{status}</span>
                        </span>

                        <span className="text-xs font-semibold text-slate-400">
                          ID: #{property.id}
                        </span>
                      </div>

                      {/* Title & Rent */}
                      <h3 className="font-bold text-slate-900 text-lg mb-1 leading-snug line-clamp-1">
                        {property.title}
                      </h3>
                      <div className="flex items-baseline gap-1 text-slate-900 font-extrabold text-xl mb-3">
                        <span>₹{Number(property.rent ?? 0).toLocaleString("en-IN")}</span>
                        <span className="text-xs text-slate-400 font-semibold">/ month</span>
                      </div>

                      {/* Location & Specs */}
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
                        <span className="font-medium text-slate-700">
                          {property.locality || "Locality not set"}, {property.city}
                        </span>
                      </p>

                      <div className="flex flex-wrap gap-2 text-xs text-slate-600 mb-4">
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg font-medium capitalize">
                          Type: {property.type}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg font-medium">
                          {property.bhk ? `${property.bhk} BHK` : "BHK N/A"}
                        </span>
                        {property.area && (
                          <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg font-medium">
                            {property.area} sqft
                          </span>
                        )}
                        <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg font-medium capitalize">
                          {property.furnishing || "Unfurnished"}
                        </span>
                      </div>

                      {/* Status Alerts */}
                      {status === "pending" && (
                        <div className="mb-4 p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                          <FaClock className="text-amber-500 mt-0.5 shrink-0" />
                          <span>
                            This property is currently awaiting admin verification. It will become visible on the public marketplace once approved.
                          </span>
                        </div>
                      )}

                      {status === "rejected" && (
                        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                          <FaExclamationTriangle className="text-rose-500 mt-0.5 shrink-0" />
                          <div>
                            <strong className="block font-bold mb-0.5">
                              Rejected by Administrator
                            </strong>
                            <span>
                              {property.rejection_reason ||
                                "No rejection reason provided. Please update your details and contact support."}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {status === "verified" && (
                          <Link
                            to={`/properties/${property.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                          >
                            <FaEye className="text-xs" />
                            <span>View Public</span>
                          </Link>
                        )}
                        <Link
                          to={`/owner/properties/${property.id}/edit`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors"
                        >
                          <FaEdit className="text-xs" />
                          <span>Edit</span>
                        </Link>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(property.id)}
                        disabled={deletingId === property.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <FaTrash className="text-xs" />
                        <span>{deletingId === property.id ? "Deleting..." : "Delete"}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">
                  Showing page {pagination.page} of {pagination.total_pages} (
                  {pagination.total_items} matching properties)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const nextP = currentPage - 1;
                      setCurrentPage(nextP);
                      fetchProperties(nextP, statusFilter, searchTerm);
                    }}
                    disabled={!pagination.has_previous}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const nextP = currentPage + 1;
                      setCurrentPage(nextP);
                      fetchProperties(nextP, statusFilter, searchTerm);
                    }}
                    disabled={!pagination.has_next}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default OwnerDashboard;
