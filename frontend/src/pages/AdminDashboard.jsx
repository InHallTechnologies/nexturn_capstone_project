import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaCheck,
  FaClock,
  FaEye,
  FaRedo,
  FaShieldAlt,
  FaTimes,
} from "react-icons/fa";
import api from "../api/axios";

function AdminDashboard() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  async function fetchPendingProperties() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/admin/properties/pending");
      const data = response.data;
      setProperties(Array.isArray(data) ? data : data.properties ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to load pending properties."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!cancelled) {
        fetchPendingProperties();
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function approveProperty(propertyId) {
    const confirmed = window.confirm(
      "Have you reviewed this property and confirmed its details? Approve it now?"
    );
    if (!confirmed) return;

    setError("");
    setActionMessage("");
    setActionLoading(true);

    try {
      await api.patch(`/admin/properties/${propertyId}/verify`);
      setProperties((current) =>
        current.filter((property) => property.id !== propertyId)
      );
      setActionMessage("Property verified and approved for public listing.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to approve property."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectProperty(propertyId) {
    if (!rejectionReason.trim()) {
      setError("Please enter a reason for rejecting this property.");
      return;
    }

    setError("");
    setActionMessage("");
    setActionLoading(true);

    try {
      await api.patch(`/admin/properties/${propertyId}/reject`, {
        rejection_reason: rejectionReason.trim(),
      });
      setProperties((current) =>
        current.filter((property) => property.id !== propertyId)
      );
      setRejectingId(null);
      setRejectionReason("");
      setActionMessage("Property rejected with reason provided to owner.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to reject property."
      );
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              <FaShieldAlt className="text-xs" /> Admin Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Property Verification Queue
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Audit owner submissions, verify property specs and photos, and maintain listing quality.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchPendingProperties}
            disabled={loading}
            className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <FaRedo className={`text-xs ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Refreshing..." : "Refresh Queue"}</span>
          </button>
        </div>

        {/* Stats card */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">
                Pending Verification
              </span>
              <FaClock className="text-lg" />
            </div>
            <p className="text-3xl font-black text-slate-900">
              {properties.length}
            </p>
            <span className="text-[11px] text-slate-400 font-medium">
              Listings awaiting review
            </span>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError("")}
              className="text-xs font-bold text-rose-600 hover:text-rose-800"
            >
              ✕
            </button>
          </div>
        )}

        {actionMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-sm flex items-center justify-between">
            <span>{actionMessage}</span>
            <button
              type="button"
              onClick={() => setActionMessage("")}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-800"
            >
              ✕
            </button>
          </div>
        )}

        {/* Pending Properties List */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Awaiting Verification ({properties.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm animate-pulse">
              Loading pending properties...
            </div>
          ) : properties.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3 text-xl">
                <FaCheck />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Queue is completely clear!
              </h3>
              <p className="text-slate-500 text-xs">
                All submitted properties have been reviewed. New submissions will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[11px]">
                    <th className="py-3.5 px-4">ID</th>
                    <th className="py-3.5 px-4">Title</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Rent</th>
                    <th className="py-3.5 px-4">Specs</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {properties.map((property) => (
                    <tr key={property.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-500">
                        #{property.id}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 max-w-xs truncate">
                        {property.title}
                      </td>
                      <td className="py-3.5 px-4 capitalize">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          {property.type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {property.locality}, {property.city}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">
                        ₹{Number(property.rent).toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {property.bhk ? `${property.bhk} BHK` : ""}
                        {property.area ? ` • ${property.area} sqft` : ""}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            to={`/admin/properties/${property.id}/review`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <FaEye className="text-[10px]" />
                            <span>Inspect</span>
                          </Link>

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => approveProperty(property.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            <FaCheck className="text-[10px]" />
                            <span>Approve</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => {
                              setRejectingId(property.id);
                              setRejectionReason("");
                              setError("");
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            <FaTimes className="text-[10px]" />
                            <span>Reject</span>
                          </button>
                        </div>

                        {/* Rejection reason inline popover */}
                        {rejectingId === property.id && (
                          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-left">
                            <p className="text-xs font-bold text-rose-800 mb-1.5">
                              Specify reason for rejection:
                            </p>
                            <textarea
                              rows={2}
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              placeholder="e.g. Incomplete address, unrealistic rent, or missing photos..."
                              className="w-full p-2 bg-white border border-rose-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => rejectProperty(property.id)}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                              >
                                {actionLoading ? "Rejecting..." : "Confirm Reject"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingId(null)}
                                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;