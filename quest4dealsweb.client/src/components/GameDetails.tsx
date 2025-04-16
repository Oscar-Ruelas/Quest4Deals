// src/components/GameDetails.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styling/GameDetails.css";

interface Platform {
    name: string;
    slug: string;
    icon: string;
}

interface StoreOffer {
    url: string;
    store: {
        name: string;
        image: string;
    };
    edition: string;
    price: number;
    platform?: string;
}

interface PriceHistoryItem {
    id: number;
    gameId: number;
    price: number;
    recordedAt: string;
}

function GameDetails({ isModal = false }: { isModal?: boolean }) {
    const { id, title } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [gameTitle, setGameTitle] = useState("");
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.log("GameDetails mounted with ID:", id, "and title:", title);

        async function fetchGame() {
            if (!title) {
                setNotFound(true);
                return;
            }

            setLoading(true);
            setNotFound(false);

            try {
                console.log("Fetching game data for title:", title);
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(title)}`);

                if (!res.ok) {
                    throw new Error(`Error fetching search results: ${res.status}`);
                }

                const data = await res.json();
                console.log("Search results:", data);

                const game = data?.results?.items?.[0];

                if (!game) {
                    console.log("Game not found in search results");
                    setNotFound(true);
                    return;
                }

                const gameId = game.game_info.id;
                console.log("Found game ID:", gameId);

                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);

                // Fetch price history
                console.log("Fetching price history for game ID:", gameId);
                try {
                    const historyRes = await fetch(`/api/price-history/${gameId}`);
                    if (historyRes.ok) {
                        const historyData = await historyRes.json();
                        console.log("Received price history:", historyData);
                        setPriceHistory(historyData || []);
                    } else {
                        console.log("No price history available:", historyRes.status);
                        setPriceHistory([]);
                    }
                } catch (historyErr) {
                    console.error("Error fetching price history:", historyErr);
                    setPriceHistory([]);
                }

                console.log("Fetching price data for game ID:", gameId);
                const priceRes = await fetch(`/api/nexarda/prices?id=${gameId}`);

                if (!priceRes.ok) {
                    throw new Error(`Error fetching price data: ${priceRes.status}`);
                }

                const priceData = await priceRes.json();
                console.log("Received price data:", priceData);

                const priceJson = typeof priceData === "string" ? JSON.parse(priceData) : priceData;

                if (priceJson && priceJson.prices && Array.isArray(priceJson.prices.list)) {
                    const offers: StoreOffer[] = priceJson.prices.list
                        .filter((offer: any) => offer.available && offer.url)
                        .map((offer: any) => {
                            const editionFull: string = offer.edition_full || "";
                            let platform = "";

                            const match = editionFull.match(/FOR:(.+)$/i);
                            if (match) {
                                platform = match[1].trim();
                            }

                            return {
                                url: offer.url,
                                store: {
                                    name: offer.store.name,
                                    image: offer.store.image,
                                },
                                edition: offer.edition,
                                price: offer.price,
                                platform,
                            };
                        });

                    console.log("Processed store offers:", offers);
                    setStoreOffers(offers);
                } else {
                    console.log("No valid price data found");
                    setStoreOffers([]);
                }
            } catch (err) {
                console.error("Error in fetchGame:", err);
                setError(err instanceof Error ? err.message : "Unknown error occurred");
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }

        fetchGame();
    }, [title]);

    useEffect(() => {
        if (!isModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" || event.key === "Enter") {
                navigate(-1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModal, navigate]);

    const handleClose = () => navigate(-1);

    // Calculate price history stats
    const calculatePriceStats = () => {
        if (!priceHistory || priceHistory.length === 0) return null;

        const prices = priceHistory.map(item => item.price);
        const lowestPrice = Math.min(...prices);
        const highestPrice = Math.max(...prices);
        const currentPrice = prices[prices.length - 1];
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

        return {
            lowestPrice,
            highestPrice,
            currentPrice,
            averagePrice
        };
    };

    const priceStats = calculatePriceStats();

    // Render loading state
    if (loading) {
        return <div className="game-details loading">Loading game details...</div>;
    }

    // Render error state
    if (error) {
        return (
            <div className="game-details error">
                <p>Error loading game details: {error}</p>
                <button onClick={handleClose}>Go Back</button>
            </div>
        );
    }

    // Render not found state
    if (notFound) {
        return (
            <div className="game-details not-found">
                <p>Game not found.</p>
                <button onClick={handleClose}>Go Back</button>
            </div>
        );
    }

    return (
        <div className={isModal ? "modal-overlay" : "game-details-container"}>
            <div className={isModal ? "modal-content" : "game-details-content"}>
                {isModal && (
                    <button className="modal-close" onClick={handleClose} aria-label="Close">
                        ✕
                    </button>
                )}

                <h1 className="details-title">{gameTitle}</h1>

                <div className="details-main">
                    <div className="details-image-container">
                        <img className="details-image" src={gameImage} alt={gameTitle} />
                    </div>

                    <div className="details-info">
                        <div className="details-description">{gameDesc}</div>

                        <div className="details-platforms-container">
                            <h2 className="details-subtitle">Platforms</h2>
                            <p className="details-platforms">
                                {platforms
                                    .filter((p) => !["Other", "Xbox Play Anywhere"].includes(p.name))
                                    .map((p) => {
                                        switch (p.name) {
                                            case "EA Desktop App":
                                                return "EA";
                                            case "Epic Games Launcher":
                                                return "Epic Games";
                                            case "Ubisoft Connect":
                                                return "Ubisoft";
                                            default:
                                                return p.name;
                                        }
                                    })
                                    .join(", ")}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="details-offers">
                    <h2 className="details-subtitle">Store Offers</h2>

                    {storeOffers.length > 0 ? (
                        <div className="store-offers-grid">
                            {storeOffers.map((offer, index) => (
                                <div className="store-offer" key={index}>
                                    <div className="store-info">
                                        <img
                                            src={offer.store.image}
                                            alt={offer.store.name}
                                            className="store-image"
                                        />
                                        <span className="store-name">{offer.store.name}</span>
                                    </div>

                                    <div className="offer-details">
                                        <span className="offer-edition">{offer.edition}</span>
                                        {offer.platform && (
                                            <span className="offer-platform">{offer.platform}</span>
                                        )}
                                        <span className="offer-price">${offer.price.toFixed(2)}</span>
                                    </div>

                                    <a
                                        href={offer.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="buy-button"
                                    >
                                        Buy Now
                                    </a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-offers">No store offers available at this time.</p>
                    )}
                </div>

                {/* Price History Section */}
                <div className="price-history-section">
                    <h2 className="details-subtitle">Price History</h2>

                    {priceHistory.length > 0 ? (
                        <div className="price-history-content">
                            {/* Price Stats */}
                            {priceStats && (
                                <div className="price-stats">
                                    <div className="stat-item">
                                        <span className="stat-label">Lowest Price</span>
                                        <span className="stat-value">${priceStats.lowestPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Highest Price</span>
                                        <span className="stat-value">${priceStats.highestPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Current Price</span>
                                        <span className="stat-value">${priceStats.currentPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-label">Average Price</span>
                                        <span className="stat-value">${priceStats.averagePrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}

                            {/* Visual price history */}
                            <div className="price-history-visual">
                                {priceHistory.map((item, index) => {
                                    // Calculate the height percentage based on price relative to highest price
                                    const heightPercent = priceStats
                                        ? (item.price / priceStats.highestPrice) * 100
                                        : 0;

                                    return (
                                        <div className="price-bar-container" key={index}>
                                            <div
                                                className="price-bar"
                                                style={{ height: `${heightPercent}%` }}
                                                title={`$${item.price.toFixed(2)} - ${new Date(item.recordedAt).toLocaleDateString()}`}
                                            ></div>
                                            <div className="price-date">
                                                {new Date(item.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Price history table */}
                            <div className="price-history-table-container">
                                <h3>Detailed Price History</h3>
                                <table className="price-history-table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Price</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {priceHistory.map((item, index) => (
                                            <tr key={index}>
                                                <td>{new Date(item.recordedAt).toLocaleDateString()}</td>
                                                <td>${item.price.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <p className="no-price-history">
                            No price history available for this game yet. We'll start tracking prices now.
                        </p>
                    )}
                </div>

                {!isModal && (
                    <button className="back-button" onClick={handleClose}>
                        Back to Search
                    </button>
                )}
            </div>
        </div>
    );
}

export default GameDetails;
