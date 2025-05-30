import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Gamecard, { Game } from '../components/Gamecard'; // Assuming Gamecard can be reused
// You might want the Navbar here too
import '../styling/WishlistPage.css'; // We'll create this CSS file

// Define a more specific type for watchlist items if needed, based on what /api/watchlist returns
// For now, we'll adapt the existing Game interface.
// The backend /api/watchlist returns: ExternalGameId, Title, Platform, Price, Genre, GetNotified
// We need to map this to the Game interface for Gamecard or create a new component.
// Let's try to adapt. Gamecard expects: image, title, game_info { id, lowest_price, short_desc, platforms, age_ratings }

interface WatchlistItemFromApi {
    externalGameId: number;
    title: string;
    platform: string;
    price: number;
    genre: string;
    getNotified: boolean;
    // Add other fields if your API returns them and you need them
    // e.g., image (if available from backend watchlist endpoint)
}

// Function to adapt API data to Gamecard's Game prop
function adaptWatchlistItemToGame(item: WatchlistItemFromApi): Game {
    return {
        title: item.title,
        image: `/placeholder.jpg`, // Placeholder, backend watchlist doesn't send image currently
        game_info: {
            id: item.externalGameId, // Use externalGameId as the id for navigation
            lowest_price: item.price,
            short_desc: `Platform: ${item.platform}, Genre: ${item.genre}`, // Basic description
            platforms: [{ name: item.platform, slug: item.platform.toLowerCase(), icon: '' }], // Mock platform data
            age_ratings: [], // Mock age ratings
        },
    };
}


function WishlistPage() {
    const [watchlist, setWatchlist] = useState<WatchlistItemFromApi[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const navigate = useNavigate();

    
    useEffect(() => {
        const user = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!user) {
            setIsAuthenticated(false);
            // Store current path before redirecting to login
            sessionStorage.setItem('returnTo', window.location.pathname);
            navigate("/login");
        } else {
            setIsAuthenticated(true);
            fetchWatchlist();
        }
    }, [navigate]);

    const fetchWatchlist = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/watchlist", {
                credentials: "include", // Important for authorized requests
            });

            if (!response.ok) {
                if (response.status === 401) {
                    sessionStorage.setItem('returnTo', window.location.pathname);
                    navigate("/login"); // Redirect to login if not authorized
                    return;
                }
                throw new Error(`Failed to fetch watchlist: ${response.statusText}`);
            }

            const data = await response.json();
            setWatchlist(data);
        } catch (err) {
            console.error("Error fetching watchlist:", err);
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setLoading(false);
        }
    };

    if (!isAuthenticated) {
        return <div className="wishlist-container"><p>Redirecting to login...</p></div>; // Or a dedicated loading/redirect message
    }


    return (
        // Option 1: Full page with Navbar
        // <div className="App">
        //     <Navbar
        //         setSearchQuery={setSearchQuery}
        //         setIsSearching={setIsSearching}
        //         onReload={handleReloadDashboard}
        //     />
        //     <div className="wishlist-content-area">
        //        {/* Wishlist content below */}
        //     </div>
        // </div>

        // Option 2: Simpler page, assuming Navbar is global or not needed here
        <div className="main-content"> {/* Use existing class for consistent styling */}
            <div className="wishlist-container">
                <h1 className="wishlist-title">My Wishlist</h1>
                {loading && <p>Loading wishlist...</p>}
                {error && <p className="error-message">Error: {error}</p>}
                {!loading && !error && watchlist.length === 0 && (
                    <p>Your wishlist is empty. Add some games!</p>
                )}
                {!loading && !error && watchlist.length > 0 && (
                    <div className="wishlist-grid">
                        {watchlist.map((item) => (
                            <Gamecard key={`${item.externalGameId}-${item.platform}`} game={adaptWatchlistItemToGame(item)} />
                        ))}
                    </div>
                )}
                <button onClick={() => navigate('/')} className="back-to-home-button">Back to Home</button>
            </div>
        </div>
    );
}

export default WishlistPage;