import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../styling/WatchlistPage.css";

interface WatchlistGame {
    externalGameId: number;
    title: string;
    platform: string;
    price: number;
    genre: string;
    getNotified: boolean;
}

const WatchlistPage = () => {
    const [games, setGames] = useState<WatchlistGame[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchWatchlist = async () => {
        try {
            const response = await axios.get("/api/watchlist");
            setGames(response.data);
        } catch (error) {
            console.error("Error fetching watchlist:", error);
        } finally {
            setLoading(false);
        }
    };

    const removeGame = async (game: WatchlistGame) => {
        try {
            await axios.post(`/api/watchlist/remove/${game.externalGameId}`, {
                gameTitle: game.title,
                platform: game.platform,
                currentPrice: game.price,
                genre: game.genre,
                getNotified: game.getNotified,
            });
            setGames((prev) =>
                prev.filter((g) => g.externalGameId !== game.externalGameId || g.platform !== game.platform)
            );
        } catch (error) {
            console.error("Error removing game:", error);
        }
    };

    const toggleNotification = async (game: WatchlistGame) => {
        const updatedGame = { ...game, getNotified: !game.getNotified };

        try {
            await axios.put(`/api/watchlist/notify/${game.externalGameId}`, {
                gameTitle: updatedGame.title,
                platform: updatedGame.platform,
                currentPrice: updatedGame.price,
                genre: updatedGame.genre,
                getNotified: updatedGame.getNotified,
            });

            setGames((prev) =>
                prev.map((g) =>
                    g.externalGameId === updatedGame.externalGameId && g.platform === updatedGame.platform
                        ? updatedGame
                        : g
                )
            );
        } catch (error) {
            console.error("Error updating notification:", error);
        }
    };

    useEffect(() => {
        fetchWatchlist();
    }, []);

    if (loading) {
        return <div className="watchlist-loading">Loading watchlist...</div>;
    }

    if (games.length === 0) {
        return <div className="watchlist-empty">Your watchlist is empty.</div>;
    }

    return (
        <div className="watchlist-container">
            <h2 className="watchlist-title">My Watchlist</h2>
            <div className="watchlist-grid">
                {games.map((game) => (
                    <div key={`${game.externalGameId}-${game.platform}`} className="watchlist-card">
                        <div className="watchlist-game-title">{game.title}</div>
                        <div className="watchlist-game-meta">Platform: {game.platform}</div>
                        <div className="watchlist-game-meta">Genre: {game.genre}</div>
                        <div className="watchlist-game-meta">Price: ${game.price.toFixed(2)}</div>

                        <div className="watchlist-actions">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={game.getNotified}
                                    onChange={() => toggleNotification(game)}
                                />
                                <span className="slider"></span>
                            </label>
                            <button className="remove-button" onClick={() => removeGame(game)}>
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Return to Home
                </button>
            </div>
        </div>
    );
};

export default WatchlistPage;
