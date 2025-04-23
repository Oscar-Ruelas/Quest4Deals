import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styling/GameDetails.css";
import WatchlistButton from './WatchlistButton';

// In-memory cache for game data
const gameCache = new Map();

function LoadingMessage() {
    return (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
            <div
                className="modal-content"
                style={{
                    width: 'auto',
                    minWidth: '300px',
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#1f2937'
                }}
            >
                <div className="loading-spinner" style={{
                    marginBottom: '20px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        margin: '0 auto',
                        border: '4px solid #3b82f6',
                        borderTop: '4px solid transparent',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                </div>
                <div style={{
                    fontSize: '1.25rem',
                    color: '#ffffff',
                    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
                }}>
                    Getting Game Info...
                </div>
            </div>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
}

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

interface GameInfo {
    id: number;
    title: string;
    image: string;
    description: string;
    platforms: Platform[];
    genres: string[];
}

function GameDetails({ isModal = false }: { isModal?: boolean }) {
    const { title } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [gameInfo, setGameInfo] = useState<GameInfo>({
        id: 0,
        title: "",
        image: "",
        description: "",
        platforms: [],
        genres: []
    });
    const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
    const [notFound, setNotFound] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filter out demos, free trials, and games with no price
    const getValidStoreOffers = () => {
        return storeOffers.filter(offer =>
            offer.price > 0 &&
            offer.platform &&
            !offer.edition.toLowerCase().includes('demo') &&
            !offer.edition.toLowerCase().includes('trial')
        );
    };

    useEffect(() => {
        async function fetchGame() {
            if (!title) {
                setNotFound(true);
                return;
            }

            // Check cache first
            if (gameCache.has(title)) {
                const cached = gameCache.get(title);
                setGameInfo(cached.gameInfo);
                setStoreOffers(cached.storeOffers);
                setPriceHistory(cached.priceHistory);
                setNotFound(false);
                setError(null);
                setLoading(false);
                return;
            }

            setLoading(true);
            setNotFound(false);

            try {
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(title)}`);

                if (!res.ok) {
                    throw new Error(`Error fetching search results: ${res.status}`);
                }

                const data = await res.json();
                const game = data?.results?.items?.[0];

                if (!game) {
                    setNotFound(true);
                    return;
                }

                // Fetch genres from RAWG
                const genresRes = await fetch(`/api/rawg/genres/${encodeURIComponent(game.title)}`);
                let genres: string[] = [];

                if (genresRes.ok) {
                    const genresData = await genresRes.json();
                    genres = genresData.genres || [];
                }

                // Update game info
                const newGameInfo = {
                    id: game.game_info.id,
                    title: game.title,
                    image: game.image,
                    description: game.game_info.short_desc,
                    platforms: game.game_info.platforms || [],
                    genres: genres
                };
                setGameInfo(newGameInfo);

                // Fetch prices
                const priceRes = await fetch(`/api/nexarda/prices?id=${game.game_info.id}`);

                if (!priceRes.ok) {
                    throw new Error(`Error fetching price data: ${priceRes.status}`);
                }

                const priceData = await priceRes.json();
                let offers: StoreOffer[] = [];

                if (priceData?.prices?.list) {
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
                }
                setStoreOffers(offers);

                // Price history logic
                let newPriceHistory: PriceHistoryItem[] = [];
                if (offers && offers.length > 0) {
                    const lowestOffer = offers.reduce(
                        (lowest, current) => current.price < lowest.price ? current : lowest,
                        offers[0]
                    );

                    const priceHistoryEntry: PriceHistoryItem = {
                        id: 0,
                        gameId: game.game_info.id,
                        price: lowestOffer.price,
                        recordedAt: new Date().toISOString()
                    };

                    newPriceHistory = [priceHistoryEntry];
                    setPriceHistory(newPriceHistory);
                } else {
                    setPriceHistory([]);
                }

                // Save to cache
                gameCache.set(title, {
                    gameInfo: newGameInfo,
                    storeOffers: offers,
                    priceHistory: newPriceHistory
                });

            } catch (err) {
                console.error("Error in fetchGame:", err);
                setError(err instanceof Error ? err.message : "Unknown error occurred");
            } finally {
                setLoading(false);
            }
        }

        fetchGame();
    }, [title]);

    const handleClose = () => {
        navigate('/');
    };

    useEffect(() => {
        if (!isModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" || event.key === "Enter") {
                handleClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModal]);

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

    // Find the lowest price from store offers
    const getLowestPrice = () => {
        const validOffers = getValidStoreOffers();
        if (validOffers.length === 0) return null;
        return validOffers.reduce(
            (min, offer) => offer.price < min ? offer.price : min,
            validOffers[0].price
        );
    };

    const lowestPrice = getLowestPrice();
    const validStoreOffers = getValidStoreOffers();

    if (loading) {
        return <LoadingMessage />;
    }

    if (error) {
        return (
            <div className="game-details error">
                <p>Error loading game details: {error}</p>
                <button onClick={handleClose}>Go Back</button>
            </div>
        );
    }

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

                <div className="details-header">
                    <h1 className="details-title">{gameInfo.title}</h1>
                </div>

                <div className="details-main">
                    <div className="details-image-container">
                        <img className="details-image" src={gameInfo.image} alt={gameInfo.title} />
                        <div className="watchlist-section">
                            <WatchlistButton
                                id={gameInfo.id}
                                title={gameInfo.title}
                                storeOffers={validStoreOffers}
                                genre={gameInfo.genres.join(', ')}
                            />
                        </div>
                    </div>

                    <div className="details-info">
                        <div className="details-description">{gameInfo.description}</div>

                        <div className="details-genres-container">
                            <h2 className="details-subtitle">Genres</h2>
                            <p className="details-genres">
                                {gameInfo.genres.length > 0
                                    ? gameInfo.genres.join(", ")
                                    : "No genre information available"}
                            </p>
                        </div>

                        <div className="details-platforms-container">
                            <h2 className="details-subtitle">Platforms</h2>
                            <p className="details-platforms">
                                {gameInfo.platforms
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

                    {validStoreOffers.length > 0 ? (
                        <div className="store-offers-grid">
                            {validStoreOffers.map((offer, index) => (
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