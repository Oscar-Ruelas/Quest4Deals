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
import "./styling/Main.css";
import { useState } from "react";
import WatchlistContentPage from "./pages/WatchlistContentPage.tsx";
import VerifyEmail from "./pages/VerifyEmail.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";

function AppRoutes() {
  const location = useLocation();
  const state = location.state as { backgroundLocation?: Location };

  // State for filters to be applied to games
  const [filters, setFilters] = useState({
    platform: "all",
    genre: "Genre",
    price: "PriceOrder",
  });
  // State for if the filters are applied to display the games or not
  const [isFiltered, setIsFiltered] = useState(false);
  // State for reload key
  const [reloadKey, setReloadKey] = useState(0);
  // state for the search input and whether the user is searching or not
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleReloadDashboard = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <>
      {/* Background content */}
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
        <Route path={"/watchlist"} element={<WatchlistContentPage />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {/* fallback if user visits details directly */}
        <Route
          path="/details/:id/:title"
          element={<GameDetails isModal={false} />}
        />
      </Routes>

      {/* Modal route on top of background */}
      {state?.backgroundLocation && (
        <Routes>
          <Route path="/details/:id/:title" element={<GameDetails isModal />} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <Router>
      <AppRoutes /> {/* ✅ Hook now called inside Router */}
    </Router>
  );
}
