import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCheckCircle,
  FaComments,
  FaHome,
  FaLock,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";

function Home() {
  const [searchTerm, setSearchTerm] = useState("");
  const [cityTerm, setCityTerm] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const navigate = useNavigate();

  function handleSearch(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    if (cityTerm.trim()) params.set("city", cityTerm.trim());
    if (propertyType) params.set("type", propertyType);
    navigate(`/properties?${params.toString()}`);
  }

  const categories = [
    {
      title: "Flats & Apartments",
      desc: "Modern residential flats in prime localities",
      type: "flat",
      icon: "🏢",
      badge: "Popular",
    },
    {
      title: "Independent Houses",
      desc: "Spacious individual villas and homes with private space",
      type: "house",
      icon: "🏡",
      badge: "Family",
    },
    {
      title: "PG & Co-Living",
      desc: "Furnished student and working professional rooms",
      type: "pg",
      icon: "🛏️",
      badge: "Affordable",
    },
    {
      title: "Luxury Villas",
      desc: "Premium properties with top-tier amenities",
      type: "villa",
      icon: "✨",
      badge: "Premium",
    },
  ];

  const features = [
    {
      icon: <FaShieldAlt className="text-blue-600 text-2xl" />,
      title: "100% Admin Verified",
      desc: "Every listing is manually verified by our team before publishing to eliminate fake listings.",
    },
    {
      icon: <FaComments className="text-indigo-600 text-2xl" />,
      title: "Direct Owner Contact",
      desc: "Communicate directly with verified owners through our secure real-time enquiry messenger.",
    },
    {
      icon: <FaLock className="text-emerald-600 text-2xl" />,
      title: "Transparent Pricing",
      desc: "Zero hidden brokerage charges. Transparent monthly rent and refundable deposit terms.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        {/* Hero Section */}
        <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/15 border border-blue-400/20 text-blue-300 text-xs font-bold tracking-wide uppercase mb-6">
              <FaStar className="text-amber-400 text-xs" />
              <span>Next-Gen Rental Property Platform</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
              Rent verified properties with{" "}
              <span className="bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                complete confidence.
              </span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
              Explore thousands of verified homes, flats, and PG accommodations with complete transparency and direct owner messaging.
            </p>

            {/* Hero Quick Search Box */}
            <form
              onSubmit={handleSearch}
              className="bg-white rounded-2xl shadow-2xl p-3 sm:p-4 max-w-4xl mx-auto text-left grid grid-cols-1 sm:grid-cols-12 gap-2.5 sm:gap-3 border border-slate-200/50"
            >
              <div className="sm:col-span-4 relative">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Locality, landmark..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                />
              </div>

              <div className="sm:col-span-3 relative">
                <FaMapMarkerAlt className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="City (e.g. Kurnool)"
                  value={cityTerm}
                  onChange={(e) => setCityTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-slate-50 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full py-3 px-3 bg-slate-50 rounded-xl text-slate-800 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all font-medium"
                >
                  <option value="">All Property Types</option>
                  <option value="flat">Flats / Apartments</option>
                  <option value="house">Independent House</option>
                  <option value="villa">Villas</option>
                  <option value="pg">PG / Co-Living</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full h-full min-h-[44px] bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl text-sm transition-all duration-150 flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 cursor-pointer"
                >
                  <FaSearch className="text-xs" />
                  <span>Search</span>
                </button>
              </div>
            </form>

            {/* Quick stats pills */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-400" /> 100% Verified Listings
              </span>
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-400" /> Direct Owner Contact
              </span>
              <span className="flex items-center gap-1.5">
                <FaCheckCircle className="text-emerald-400" /> Transparent Pricing
              </span>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Browse by Property Type
            </h2>
            <p className="text-slate-500 text-sm sm:text-base">
              Explore handpicked categories tailored for families, singles, and professionals.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.title}
                to={`/properties?type=${cat.type}`}
                className="group bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-3xl p-3 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">
                      {cat.icon}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                      {cat.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-blue-600 transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4">
                    {cat.desc}
                  </p>
                </div>
                <div className="flex items-center text-xs font-semibold text-blue-600 gap-1.5 group-hover:translate-x-1 transition-transform">
                  <span>Explore listings</span>
                  <FaArrowRight className="text-[10px]" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Why Choose RentEase */}
        <section className="bg-white border-y border-slate-200 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                Why Thousands Choose RentEase
              </h2>
              <p className="text-slate-500 text-sm sm:text-base">
                Built from the ground up for a safe, transparent, and seamless rental experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feat) => (
                <div
                  key={feat.title}
                  className="bg-slate-50/70 rounded-2xl p-8 border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow-xs flex items-center justify-center mb-5">
                    {feat.icon}
                  </div>
                  <h3 className="font-bold text-slate-900 text-lg mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Owner CTA Banner */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-blue-500/20 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl text-center md:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3">
                For Property Owners
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">
                List Your Property for Free
              </h2>
              <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
                Connect directly with thousands of verified tenants. Manage listings, track enquiries, and get verified quickly.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link
                to="/owner/properties/new"
                className="text-center px-6 py-3.5 rounded-xl font-bold text-sm bg-white text-blue-700 hover:bg-blue-50 shadow-md transition-all duration-150"
              >
                + Post Free Listing
              </Link>
              <Link
                to="/register"
                className="text-center px-6 py-3.5 rounded-xl font-bold text-sm bg-blue-700/60 hover:bg-blue-700 text-white border border-blue-400/40 transition-all duration-150"
              >
                Owner Registration
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 py-10 px-4 sm:px-6 lg:px-8 text-center text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">
              <FaHome />
            </div>
            <span className="font-bold text-white text-sm">RentEase Platform</span>
          </div>
          <p>© {new Date().getFullYear()} RentEase Rental Property Marketplace. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="/properties" className="hover:text-white transition-colors">
              Browse Listings
            </Link>
            <Link to="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;