

import { Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import AdminDashboard from "./pages/AdminDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AddProperty from "./pages/AddProperty";
import EditProperty from "./pages/EditProperty";

import PropertyListing from "./pages/PropertyListing";
import PropertyDetails from "./pages/PropertyDetails";
import Favorites from "./pages/Favorites";
import AdminPropertyReview from "./pages/AdminPropertyReview";

import MyEnquiries from "./pages/MyEnquiries";
import OwnerEnquiries from "./pages/OwnerEnquiries";
import EnquiryConversation from "./pages/EnquiryConversation";


function App() {
  return (
    <>
      <Navbar />

      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/properties"
          element={<PropertyListing />}
        />

        <Route
          path="/properties/:propertyId"
          element={<PropertyDetails />}
        />

        {/* Seeker-only pages */}
        <Route element={<ProtectedRoute allowedRoles={["seeker"]} />}>
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/my-enquiries" element={<MyEnquiries />} />
        </Route>

        {/* Admin-only pages */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route
            path="/admin/dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/properties/:propertyId/review"
            element={<AdminPropertyReview />}
          />
        </Route>


        {/* Owner-only pages */}
        <Route element={<ProtectedRoute allowedRoles={["owner"]} />}>
          <Route
            path="/owner/dashboard"
            element={<OwnerDashboard />}
          />

          <Route
            path="/owner/properties/new"
            element={<AddProperty />}
          />

          <Route
            path="/owner/properties/:propertyId/edit"
            element={<EditProperty />}
          />

          <Route
            path="/owner/enquiries"
            element={<OwnerEnquiries />}
          />
        </Route>

        {/* Seeker and owner pages */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["seeker", "owner"]} />
          }
        >
          <Route
            path="/enquiries/:enquiryId"
            element={<EnquiryConversation />}
          />
        </Route>

        {/* Logged-in users */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/my-account"
            element={
              <div className="max-w-xl mx-auto py-12 px-4 text-center">
                <h1 className="text-2xl font-bold text-slate-800">My Account</h1>
                <p className="text-slate-500 text-sm mt-2">Manage your account preferences and settings.</p>
              </div>
            }
          />
        </Route>
      </Routes>
    </>
  );
}

export default App;

