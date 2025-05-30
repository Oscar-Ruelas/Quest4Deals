// src/App.tsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Filter from "./components/Filter";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EditProfilePage from "./pages/EditProfile";
import GameDetails from "./components/GameDetails";
import WishlistPage from "./pages/WishlistPage";
import WatchlistContentPage from "./pages/WatchlistContentPage";
import VerifyEmail from "./pages/VerifyEmail";
import ResetPassword from "./pages/ResetPassword";

import "./styling/Main.css";
import { useState } from "react";

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  const [filters, setFilters] = useState({
    platform: "all",
    genre: "Genre",
    price: "PriceOrder",
  });
  const [isFiltered, setIsFiltered] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleReloadDashboard = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <>
      {/* Main (or “background”) routes */}
      <Routes location={state?.backgroundLocation || location}>
        <Route
          path="/"
          element={
            <div className="App">
              <Navbar
                setSearchQuery={setSearchQuery}
                setIsSearching={setIsSearching}
                onReload={handleReloadDashboard}
              />
              <Filter
                filters={filters}
                setFilters={setFilters}
                setIsFiltered={setIsFiltered}
                onReload={handleReloadDashboard}
              />
              <Dashboard
                isFiltered={isFiltered}
                filters={filters}
                key={reloadKey}
                isSearching={isSearching}
                searchQuery={searchQuery}
              />
            </div>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/edit-profile/:userId" element={<EditProfilePage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/watchlist" element={<WatchlistContentPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* Fallback if user visits details directly */}
        <Route
          path="/details/:id/:title"
          element={<GameDetails isModal={false} />}
        />
      </Routes>

      {/* Modal route for details when navigated from within the app */}
      {state?.backgroundLocation && (
        <Routes>
          <Route
            path="/details/:id/:title"
            element={<GameDetails isModal />}
          />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}
