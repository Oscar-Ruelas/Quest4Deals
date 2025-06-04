import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styling/Navbar.css";

interface NavbarProps {
  setIsSearching: (isSearching: boolean) => void;
  setSearchQuery: (query: string) => void;
  onReload: () => void;
}

const Navbar = ({ setIsSearching, setSearchQuery, onReload }: NavbarProps) => {
  const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(""); // ✅ Local state for input
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

  // ✅ Prevent empty search queries
  const handleSearchButton = () => {
    if (localQuery.trim() === "") {
      return; // Do nothing if input is empty or just whitespace
    }

    setSearchQuery(localQuery);
    setIsSearching(true);
    onReload();
  };

  const handleClearSearchButton = () => {
    setIsSearching(false);
    setSearchQuery("");
    setLocalQuery(""); // ✅ Clear local input too
    onReload();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSearchButton();
    }
  };

    return (
        <div className="navbar">
            {/* Search Bar and Buttons */}
            <input
                type="search"
                placeholder="Search Games"
                className="search-bar"
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <button type="submit" onClick={handleSearchButton}>
                Search
            </button>
            <button onClick={handleClearSearchButton}>Clear Search</button>

            {/* Logo */}
            <img
                src="/logo.png"
                alt="Quest4Deals Logo"
                className="logo"
                onClick={scrollToTop}
                onTouchStart={scrollToTop}
            />

            {/* Budget Calculator Link - Placed near logo or other general links */}
            <Link to="/budget-calculator" className="navbar-link-button"> {/* Added a class for potential styling */}
                Budget Calculator
            </Link>

            {/* User Menu or Sign In */}
            {user ? (
                <div className="user-menu">
                    <button onClick={() => setMenuOpen(!menuOpen)} className="user-btn">
                        {user.userName} ⌄
                    </button>

                    {menuOpen && (
                        <div className="dropdown-menu">
                            <Link to="/watchlist" className="dropdown-item">
                                View Watchlist
                            </Link>
                            {/* Link to Budget Calculator can also be here if preferred */}
                            {/* <Link to="/budget-calculator" className="dropdown-item">
                      Budget Calculator
                    </Link> */}
                            <Link to={`/edit-profile/${user?.id}`} className="dropdown-item">
                                Edit Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="dropdown-item logout-btn"
                                id="logout-btn"
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
