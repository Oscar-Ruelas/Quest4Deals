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
    const [gameId, setGameId] = useState<number | null>(null);
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (gameId) {  }

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

                const foundGameId = game.game_info.id;
                setGameId(foundGameId);
                console.log("Found game ID:", foundGameId);

                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);

                // Fetch prices
                console.log("Fetching price data for game ID:", foundGameId);
                const priceRes = await fetch(`/api/nexarda/prices?id=${foundGameId}`);

                if (!priceRes.ok) {
                    throw new Error(`Error fetching price data: ${priceRes.status}`);
                }

                const priceData = await priceRes.json();
                console.log("Received price data:", priceData);

                let offers: StoreOffer[] = [];

                if (priceData && priceData.prices && priceData.prices.list) {
                    offers = priceData.prices.list
                        .filter((offer: any) => offer.available && offer.url)
                        .map((offer: any) => {
                            const editionFull = offer.edition_full || "";
                            let platform = "";

                            if (editionFull) {
                                const match = editionFull.match(/FOR:(.+)$/i);
                                if (match) {
                                    platform = match[1].trim();
                                }
                            }

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

                    console.log("Processed store offers:", offers);
                }

                setStoreOffers(offers);

                // Check if we have any offers to track
                if (offers && offers.length > 0) {
                    console.log("Creating price history from current offers");

                    // Find lowest price offer
                    const lowestOffer = offers.reduce(
                        (lowest, current) => current.price < lowest.price ? current : lowest,
                        offers[0]
                    );

                    // Create a price history entry with today's date and the lowest price
                    const priceHistoryEntry: PriceHistoryItem = {
                        id: 0, // Will be assigned by server
                        gameId: foundGameId,
                        price: lowestOffer.price,
                        recordedAt: new Date().toISOString()
                    };

                    // Set the history display with our new entry
                    setPriceHistory([priceHistoryEntry]);

                    console.log("Created price history entry:", priceHistoryEntry);
                } else {
                    console.log("No offers available to create price history");
                }

            } catch (err) {
                console.error("Error in fetchGame:", err);
                setError(err instanceof Error ? err.message : "Unknown error occurred");
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

    // Find the lowest price from store offers
    const getLowestPrice = () => {
        if (storeOffers.length === 0) return null;

        return storeOffers.reduce(
            (min, offer) => offer.price < min ? offer.price : min,
            storeOffers[0].price
        );
    };

    const lowestPrice = getLowestPrice();

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

                    {lowestPrice !== null ? (
                        <div className="price-history-content">
                            {/* Basic Price Info */}
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

                            {/* Price History Message */}
                            <div className="new-price-tracking">
                                <p>We've started tracking prices for this game.</p>
                                <p>The current best price is <strong>${lowestPrice.toFixed(2)}</strong>.</p>
                                <p>Check back later to see price trend information!</p>
                            </div>
                        </div>
                    ) : (
                        <p className="no-price-history">
                            No price information available for this game.
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

