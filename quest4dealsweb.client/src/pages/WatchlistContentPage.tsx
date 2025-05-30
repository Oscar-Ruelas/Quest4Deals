import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useNavigate, useLocation } from "react-router-dom";
import "../styling/WatchlistPage.css";
import "../styling/WatchlistButton.css"; // For notification settings styling

// Interface for data expected from /api/watchlist
interface WatchlistApiResponseItem {
    externalGameId: number;
    title: string;
    platform: string;
    price: number;
    genre: string;
    getNotified: boolean;
    notificationType: "AnyChange" | "Threshold" | "" | null;
    priceThreshold: number | null;
    // image?: string; // Backend does not send this yet
}

// Extended interface for UI state
interface WatchlistGame extends WatchlistApiResponseItem {
    uiPriceThreshold: string; // For the input field
}

const WatchlistContentPage = () => {
    const [games, setGames] = useState<WatchlistGame[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [itemLoading, setItemLoading] = useState<{ [key: string]: boolean }>({});
    const [error, setError] = useState<string | null>(null);
    const [itemErrors, setItemErrors] = useState<{ [key: string]: string | null }>({});

    const navigate = useNavigate();
    const location = useLocation();

    const fetchWatchlist = useCallback(async () => {
        setPageLoading(true);
        setError(null);
        setGames([]);
        try {
            const response = await axios.get<WatchlistApiResponseItem[]>("/api/watchlist", { withCredentials: true });
            setGames(response.data.map(game => ({
                ...game,
                uiPriceThreshold: game.priceThreshold?.toString() ?? "",
                notificationType: game.notificationType || "AnyChange",
            })));
        } catch (err: any) {
            console.error("WatchlistContentPage: Error fetching watchlist:", err);
            if (err.response?.status === 401) {
                sessionStorage.setItem('returnTo', window.location.pathname);
                navigate("/login");
            } else {
                setError(err.response?.data?.message || err.message || "Failed to fetch watchlist.");
            }
        } finally {
            setPageLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const user = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!user) {
            sessionStorage.setItem('returnTo', window.location.pathname);
            navigate("/login");
        } else {
            fetchWatchlist();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]); // fetchWatchlist is memoized, so this effect runs once on mount or if navigate changes


    const handleGameSettingChange = useCallback((
        externalGameId: number,
        platform: string,
        field: keyof WatchlistGame,
        value: any
    ) => {
        setGames(prevGames =>
            prevGames.map(game =>
                game.externalGameId === externalGameId && game.platform === platform
                    ? { ...game, [field]: value }
                    : game
            )
        );
        setItemErrors(prev => ({ ...prev, [`${externalGameId}-${platform}`]: null }));
    }, []);

    const handleSaveSettings = useCallback(async (gameToSave: WatchlistGame) => {
        const itemKey = `${gameToSave.externalGameId}-${gameToSave.platform}`;
        setItemErrors(prev => ({ ...prev, [itemKey]: null }));
        setItemLoading(prev => ({ ...prev, [itemKey]: true }));

        const thresholdValue = gameToSave.notificationType === "Threshold" && gameToSave.uiPriceThreshold
            ? parseFloat(gameToSave.uiPriceThreshold)
            : null;

        if (gameToSave.notificationType === "Threshold" && (thresholdValue === null || isNaN(thresholdValue) || thresholdValue < 0)) {
            setItemErrors(prev => ({ ...prev, [itemKey]: "Please enter a valid price for the threshold." }));
            setItemLoading(prev => ({ ...prev, [itemKey]: false }));
            return;
        }

        try {
            await axios.put(`/api/watchlist/settings/${gameToSave.externalGameId}`, {
                gameTitle: gameToSave.title,
                platform: gameToSave.platform,
                currentPrice: gameToSave.price, // This is the price from watchlist, backend might re-verify
                genre: gameToSave.genre,
                getNotified: gameToSave.getNotified,
                notificationType: gameToSave.notificationType,
                priceThreshold: thresholdValue,
            }, { withCredentials: true });

            // Optimistic update or refetch
            setGames(prevGames => prevGames.map(g =>
                (g.externalGameId === gameToSave.externalGameId && g.platform === gameToSave.platform)
                    ? { ...gameToSave, priceThreshold: thresholdValue }
                    : g
            ));
        } catch (err: any) {
            console.error("WatchlistContentPage: Error saving settings:", err);
            setItemErrors(prev => ({ ...prev, [itemKey]: err.response?.data?.message || err.message || "Failed to save settings." }));
        } finally {
            setItemLoading(prev => ({ ...prev, [itemKey]: false }));
        }
    }, []);

    const removeGame = useCallback(async (gameToRemove: WatchlistGame) => {
        const itemKey = `${gameToRemove.externalGameId}-${gameToRemove.platform}`;
        setItemErrors(prev => ({ ...prev, [itemKey]: null }));
        setItemLoading(prev => ({ ...prev, [itemKey]: true }));

        try {
            await axios.post(`/api/watchlist/remove/${gameToRemove.externalGameId}`, {
                // Backend WatchlistController expects WatchlistGameDto
                gameTitle: gameToRemove.title,
                platform: gameToRemove.platform,
                currentPrice: gameToRemove.price,
                genre: gameToRemove.genre,
                getNotified: gameToRemove.getNotified,
                notificationType: gameToRemove.notificationType,
                priceThreshold: gameToRemove.priceThreshold,
            }, { withCredentials: true });
            setGames(prev =>
                prev.filter(g => !(g.externalGameId === gameToRemove.externalGameId && g.platform === gameToRemove.platform))
            );
        } catch (err: any) {
            console.error("WatchlistContentPage: Error removing game:", err);
            setItemErrors(prev => ({ ...prev, [itemKey]: err.response?.data?.message || err.message || "Failed to remove game." }));
        } finally {
            setItemLoading(prev => ({ ...prev, [itemKey]: false }));
        }
    }, []);

    const handleGameClick = useCallback((game: WatchlistGame) => {
        const cleanTitle = game.title.replace(/\s*\(.*?\)\s*/g, "").trim();
        navigate(`/details/${game.externalGameId}/${encodeURIComponent(cleanTitle)}`, {
            state: { backgroundLocation: location },
        });
    }, [navigate, location]);

    if (pageLoading) {
        return <div className="watchlist-loading">Loading watchlist...</div>;
    }
    if (error) {
        return (
            <div className="watchlist-empty styled-empty">
                <div className="empty-icon">😕</div>
                <h2>Oops! Something went wrong.</h2>
                <p>{error}</p>
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Return to Home
                </button>
            </div>
        );
    }
    if (games.length === 0 && !pageLoading) {
        return (
            <div className="watchlist-empty styled-empty">
                <div className="empty-icon">🎮</div>
                <h2>Your Watchlist is Empty!</h2>
                <p>Looks like you haven't added any games yet. Start exploring and add your favorites to track deals!</p>
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Discover Games
                </button>
            </div>
        );
    }

    return (
        <div className="watchlist-container">
            <h2 className="watchlist-title">My Watchlist</h2>
            <div className="watchlist-grid">
                {games.map((game) => {
                    const itemKey = `${game.externalGameId}-${game.platform}`;
                    const gameSpecificError = itemErrors[itemKey];
                    const isItemCurrentlyLoading = itemLoading[itemKey] || false;

                    return (
                        <div key={itemKey} className={`watchlist-card ${isItemCurrentlyLoading ? 'loading-item' : ''}`}>
                            <div style={{ cursor: 'pointer' }} onClick={() => !isItemCurrentlyLoading && handleGameClick(game)}>
                                {/* Image display is intentionally omitted as per request */}
                                <div className="watchlist-game-title">{game.title}</div>
                                <div className="watchlist-game-meta">Platform: {game.platform}</div>
                                <div className="watchlist-game-meta">Genre: {game.genre}</div>
                                <div className="watchlist-game-meta">Current Price: ${game.price.toFixed(2)}</div>
                            </div>

                            <div className="notification-settings watchlist-card-settings">
                                <h4>Notification Preferences:</h4>
                                <div className="notification-toggle">
                                    <label className="notification-label">
                                        <input
                                            type="checkbox"
                                            checked={game.getNotified}
                                            onChange={(e) => handleGameSettingChange(game.externalGameId, game.platform, 'getNotified', e.target.checked)}
                                            disabled={isItemCurrentlyLoading}
                                        />
                                        <span className="notification-text">
                                            {game.getNotified ? 'Receive Notifications' : 'Notifications Off'}
                                        </span>
                                    </label>
                                </div>

                                {game.getNotified && (
                                    <>
                                        <div className="notification-type-selector">
                                            <label htmlFor={`notification-type-${itemKey}`}>Notify me on: </label>
                                            <select
                                                id={`notification-type-${itemKey}`}
                                                value={game.notificationType || "AnyChange"}
                                                onChange={(e) => handleGameSettingChange(game.externalGameId, game.platform, 'notificationType', e.target.value as "AnyChange" | "Threshold")}
                                                disabled={isItemCurrentlyLoading}
                                            >
                                                <option value="AnyChange">Any Price Change</option>
                                                <option value="Threshold">Price Drops To/Below Threshold</option>
                                            </select>
                                        </div>

                                        {game.notificationType === "Threshold" && (
                                            <div className="price-threshold-input">
                                                <label htmlFor={`price-threshold-${itemKey}`}>Price Threshold ($): </label>
                                                <input
                                                    type="number"
                                                    id={`price-threshold-${itemKey}`}
                                                    value={game.uiPriceThreshold}
                                                    onChange={(e) => handleGameSettingChange(game.externalGameId, game.platform, 'uiPriceThreshold', e.target.value)}
                                                    placeholder="e.g., 19.99"
                                                    min="0"
                                                    step="0.01"
                                                    disabled={isItemCurrentlyLoading}
                                                />
                                            </div>
                                        )}
                                    </>
                                )}
                                {gameSpecificError && <div className="error-message item-error-message">{gameSpecificError}</div>}
                                <div className="watchlist-actions">
                                    <button
                                        className="save-settings-button"
                                        onClick={() => handleSaveSettings(game)}
                                        disabled={isItemCurrentlyLoading}
                                    >
                                        {isItemCurrentlyLoading ? "Saving..." : "Save Settings"}
                                    </button>
                                    <button
                                        className="remove-button"
                                        onClick={() => removeGame(game)}
                                        disabled={isItemCurrentlyLoading}
                                    >
                                        {isItemCurrentlyLoading ? "Removing..." : "Remove"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            <div style={{ textAlign: "center", marginTop: "2rem" }}>
                <button className="back-button" onClick={() => navigate("/")}>
                    ← Return to Home
                </button>
            </div>
        </div>
    );
};

export default WatchlistContentPage;