import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styling/Navbar.css";

interface NavbarProps {
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  onReload: () => void;
}

const Navbar = ({ setIsSearching, setSearchQuery, onReload }: NavbarProps) => {
  const [user, setUser] = useState<{ id: string; userName: string } | null>(
    null
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ Check for logged-in user
  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // ✅ Redirect to homepage when logged out
  useEffect(() => {
    if (!user) {
      navigate("/");
    }
  }, [user, navigate]);

  // ✅ Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
    setUser(null);
  };

  // ✅ Scroll to top on logo click/touch
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchButton = () => {
    setIsSearching(true);
    onReload();
  };

  const handleClearSearchButton = () => {
    setIsSearching(false);
    setSearchQuery("");
    onReload();
  };

  return (
    <div className="navbar">
      <input
        type="search"
        placeholder="Search Games"
        className="search-bar"
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      <button type="submit" onClick={handleSearchButton}>
        Search
      </button>
      <button onClick={handleClearSearchButton}>Clear Search</button>
      <img
        src="/logo.png"
        alt="Quest4Deals Logo"
        className="logo"
        onClick={scrollToTop}
        onTouchStart={scrollToTop}
      />

      {user ? (
        <div className="user-menu">
          <button onClick={() => setMenuOpen(!menuOpen)} className="user-btn">
            {user.userName} ⌄
          </button>

          {menuOpen && (
            <div className="dropdown-menu">
              <Link to="/wishlist" className="dropdown-item">
                View Wishlist
              </Link>
              <Link to={`/edit-profile/${user?.id}`} className="dropdown-item">
                Edit Profile
              </Link>
              <button
                onClick={handleLogout}
                className="dropdown-item logout-btn"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      ) : (
        <Link to="/login" className="sign-in">
          Sign In
        </Link>
      )}
    </div>
  );
};

export default Navbar;
