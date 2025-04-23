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
    const { title } = useParams();
    const navigate = useNavigate();

    const [user, setUser] = useState<{ id: string; userName: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [gameTitle, setGameTitle] = useState("");
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const availablePlatforms = Array.from(new Set(storeOffers.map(o => o.platform).filter(Boolean))) as string[];
    const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

    useEffect(() => {
        const storedUser =
            localStorage.getItem("user") || sessionStorage.getItem("user");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        if (availablePlatforms.length === 1) {
            setSelectedPlatform(availablePlatforms[0]);
        }
    }, [availablePlatforms]);

    useEffect(() => {
        async function fetchGame() {
            if (!title) {
                setNotFound(true);
                return;
            }

            setLoading(true);
            setNotFound(false);

            try {
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(title)}`);
                if (!res.ok) throw new Error(`Error fetching search results: ${res.status}`);

                const data = await res.json();
                const game = data?.results?.items?.[0];
                if (!game) {
                    setNotFound(true);
                    return;
                }

                const foundGameId = game.game_info.id;
                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);

                const priceRes = await fetch(`/api/nexarda/prices?id=${foundGameId}`);
                if (!priceRes.ok) throw new Error(`Error fetching price data: ${priceRes.status}`);
                const priceData = await priceRes.json();

                let offers: StoreOffer[] = [];
                if (priceData?.prices?.list) {
                    offers = priceData.prices.list
                        .filter((offer: any) => offer.available && offer.url)
                        .map((offer: any) => {
                            const editionFull = offer.edition_full || "";
                            let platform = "";
                            const match = editionFull.match(/FOR:(.+)$/i);
                            if (match) platform = match[1].trim();

                            return {
                                url: offer.url,
                                store: {
                                    name: offer.store.name,
                                    image: offer.store.image,
                                },
                                edition: offer.edition || "Standard Edition",
                                price: offer.price,
                                platform,
                            };
                        });
                }

                setStoreOffers(offers);

                if (offers.length > 0) {
                    const lowestOffer = offers.reduce((lowest, current) => current.price < lowest.price ? current : lowest, offers[0]);

                    const priceHistoryEntry: PriceHistoryItem = {
                        id: 0,
                        gameId: foundGameId,
                        price: lowestOffer.price,
                        recordedAt: new Date().toISOString()
                    };

                    setPriceHistory([priceHistoryEntry]);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Unknown error");
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

    const getLowestPrice = () => {
        if (storeOffers.length === 0) return null;
        return storeOffers.reduce((min, offer) => offer.price < min ? offer.price : min, storeOffers[0].price);
    };

    const lowestPrice = getLowestPrice();

    const calculatePriceStats = () => {
        if (!priceHistory.length) return null;
        const prices = priceHistory.map(item => item.price);
        return {
            lowestPrice: Math.min(...prices),
            highestPrice: Math.max(...prices),
            currentPrice: prices[prices.length - 1],
            averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length
        };
    };

    const priceStats = calculatePriceStats();

    const handleAddToWatchlist = async () => {
        if (!selectedPlatform || !user || !gameTitle || lowestPrice === null) return;

        try {
            const genreRes = await fetch(`/api/rawg/genres/${encodeURIComponent(gameTitle)}`);
            const genreData = await genreRes.json();
            const genre = genreData?.genres?.[0] || "Unknown";

            const gameToAdd = {
                title: gameTitle,
                genre,
                platform: selectedPlatform,
                price: lowestPrice,
                userId: user.id
            };

            const res = await fetch("/api/watchlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(gameToAdd),
            });

            if (!res.ok) throw new Error("Failed to add to watchlist");
            alert("Game added to your watchlist!");
        } catch (err) {
            alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
        }
    };

    if (loading) return <div className="game-details loading">Loading game details...</div>;
    if (error) return <div className="game-details error"><p>{error}</p><button onClick={handleClose}>Go Back</button></div>;
    if (notFound) return <div className="game-details not-found"><p>Game not found.</p><button onClick={handleClose}>Go Back</button></div>;

    return (
        <div className={isModal ? "modal-overlay" : "game-details-container"}>
            <div className={isModal ? "modal-content" : "game-details-content"}>
                {isModal && (
                    <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
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
                                {platforms.map(p => p.name).join(", ")}
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
                                        <img src={offer.store.image} alt={offer.store.name} className="store-image" />
                                        <span className="store-name">{offer.store.name}</span>
                                    </div>
                                    <div className="offer-details">
                                        <span className="offer-edition">{offer.edition}</span>
                                        {offer.platform && <span className="offer-platform">{offer.platform}</span>}
                                        <span className="offer-price">${offer.price.toFixed(2)}</span>
                                    </div>
                                    <a href={offer.url} target="_blank" rel="noopener noreferrer" className="buy-button">Buy Now</a>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="no-offers">No store offers available at this time.</p>
                    )}
                </div>

                <div className="price-history-section">
                    <h2 className="details-subtitle">Price History</h2>
                    {lowestPrice !== null ? (
                        <div className="price-history-content">
                            <div className="price-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Current Best Price</span>
                                    <span className="stat-value">${lowestPrice.toFixed(2)}</span>
                                </div>
                                {priceStats && (
                                    <>
                                        <div className="stat-item">
                                            <span className="stat-label">Lowest Tracked Price</span>
                                            <span className="stat-value">${priceStats.lowestPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Highest Tracked Price</span>
                                            <span className="stat-value">${priceStats.highestPrice.toFixed(2)}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Average Price</span>
                                            <span className="stat-value">${priceStats.averagePrice.toFixed(2)}</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="new-price-tracking">
                                <p>We've started tracking prices for this game.</p>
                                <p>The current best price is <strong>${lowestPrice.toFixed(2)}</strong>.</p>
                                <p>Check back later to see price trend information!</p>
                            </div>
                        </div>
                    ) : (
                        <p className="no-price-history">No price information available for this game.</p>
                    )}
                </div>

                {availablePlatforms.length > 1 && (
                    <div className="watchlist-section">
                        <label>Select Platform:</label>
                        <select value={selectedPlatform ?? ""} onChange={e => setSelectedPlatform(e.target.value)}>
                            <option value="" disabled>Select a platform</option>
                            {availablePlatforms.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="watchlist-section">
                    {user ? (
                        <button
                            disabled={!selectedPlatform}
                            className="watchlist-button"
                            onClick={handleAddToWatchlist}
                        >
                            Add to Watchlist
                        </button>
                    ) : (
                        <button
                            className="watchlist-button"
                            onClick={() => navigate("/login")}
                        >
                            Sign in to Add to Watchlist
                        </button>
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
