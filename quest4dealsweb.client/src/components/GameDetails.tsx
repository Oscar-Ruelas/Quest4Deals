import { useParams, useNavigate, useLocation } from "react-router-dom"; // Added useLocation
import { useEffect, useState, useCallback, useMemo } from "react"; // Added useCallback, useMemo
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

interface GameInfo { // This interface is used for the state
    id: number;
    title: string;
    image: string;
    description: string;
    platforms: Platform[];
    genres: string[];
}

// This interface might be closer to what Nexarda search items look like
interface NexardaGameSearchResultItem {
    image: string;
    title: string;
    game_info: {
        id: number;
        lowest_price: number;
        short_desc: string;
        platforms: Platform[];
        age_ratings: any[]; // Assuming structure from Gamecard.tsx
        // other game_info fields
    };
    // other root level fields from Nexarda item
}


function GameDetails({ isModal = false }: { isModal?: boolean }) {
    const { id: gameIdParamFromUrl, title: titleParamFromUrl } = useParams(); // Use these from URL
    const navigate = useNavigate();
    const location = useLocation();

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

    const getValidStoreOffers = useCallback(() => {
        return storeOffers.filter(offer =>
            offer.price > 0 &&
            offer.platform &&
            !offer.edition.toLowerCase().includes('demo') &&
            !offer.edition.toLowerCase().includes('trial')
        );
    }, [storeOffers]);

    const handleClose = useCallback(() => {
        if (location.state?.backgroundLocation) {
            navigate(location.state.backgroundLocation.pathname + location.state.backgroundLocation.search, { replace: true });
        } else {
            navigate('/', { replace: true });
        }
    }, [navigate, location.state?.backgroundLocation]);

    useEffect(() => {
        // The original concat22.txt GameDetails used the 'title' from useParams.
        // If the game detail page is opened via /details/:id/:title, titleParamFromUrl should be the primary identifier for fetching.
        // If only an ID is available (e.g. from watchlist clicking a game whose title might be slightly different),
        // we might need a different approach for that specific case or ensure titles are consistent.
        // For now, sticking to the original logic that primarily used the title for fetching.

        const titleToFetch = titleParamFromUrl; // Use the title from the URL param as the primary key for fetching
        const gameIdForCache = gameIdParamFromUrl || titleToFetch; // Cache key can be ID or title

        async function fetchGame() {
            if (!titleToFetch) { // Original logic relied on title from URL
                setNotFound(true);
                setLoading(false);
                return;
            }

            // Check cache first
            if (gameCache.has(gameIdForCache)) {
                const cached = gameCache.get(gameIdForCache);
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
            setError(null);

            try {
                // Original logic: fetch by search query using the title from URL
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(titleToFetch)}`);

                if (!res.ok) {
                    throw new Error(`Error fetching search results: ${res.status}`);
                }

                const data = await res.json();
                // Assuming the first item in search results is the desired game
                const gameFromSearch: NexardaGameSearchResultItem | undefined = data?.results?.items?.[0];

                if (!gameFromSearch || !gameFromSearch.game_info) {
                    setNotFound(true);
                    setLoading(false);
                    return;
                }

                // Fetch genres from RAWG using the title from the search result
                const genresRes = await fetch(`/api/rawg/genres/${encodeURIComponent(gameFromSearch.title)}`);
                let genres: string[] = [];
                if (genresRes.ok) {
                    const genresData = await genresRes.json();
                    genres = genresData.genres || [];
                } else {
                    console.warn(`Failed to fetch genres from RAWG for: ${gameFromSearch.title}`);
                }

                // Update game info state, similar to original
                const newGameInfo: GameInfo = {
                    id: gameFromSearch.game_info.id,
                    title: gameFromSearch.title,
                    image: gameFromSearch.image, // Directly from the search result item
                    description: gameFromSearch.game_info.short_desc,
                    platforms: gameFromSearch.game_info.platforms || [],
                    genres: genres
                };
                setGameInfo(newGameInfo);

                // Fetch prices using the ID obtained from game_info
                const priceRes = await fetch(`/api/nexarda/prices?id=${gameFromSearch.game_info.id}`);
                let offers: StoreOffer[] = [];
                if (priceRes.ok) {
                    const priceData = await priceRes.json();
                    if (priceData?.prices?.list) {
                        offers = priceData.prices.list
                            .filter((offer: any) => offer.available && offer.url)
                            .map((offer: any) => {
                                const editionFull = offer.edition_full || "";
                                let platformName = offer.platform?.name || offer.platform?.slug || "";
                                if (!platformName && editionFull) {
                                    const match = editionFull.match(/FOR:(.+)$/i);
                                    if (match) platformName = match[1].trim();
                                }
                                return {
                                    url: offer.url,
                                    store: { name: offer.store.name, image: offer.store.image },
                                    edition: offer.edition || "Standard Edition",
                                    price: offer.price,
                                    platform: platformName || "Unknown",
                                };
                            });
                    }
                } else {
                    console.warn(`Error fetching price data for ID ${gameFromSearch.game_info.id}: ${priceRes.status}`);
                }
                setStoreOffers(offers);

                // Price history logic (simplified as in original)
                let newPriceHistory: PriceHistoryItem[] = [];
                const validOffersForHistory = offers.filter(o => o.price > 0);
                if (validOffersForHistory.length > 0) {
                    const lowestOffer = validOffersForHistory.reduce(
                        (lowest, current) => (current.price < lowest.price) ? current : lowest,
                        validOffersForHistory[0]
                    );
                    if (lowestOffer) {
                        newPriceHistory = [{
                            id: 0, // This ID is for the history entry, not the game
                            gameId: gameFromSearch.game_info.id,
                            price: lowestOffer.price,
                            recordedAt: new Date().toISOString()
                        }];
                    }
                }
                setPriceHistory(newPriceHistory);

                // Save to cache
                gameCache.set(gameIdForCache, {
                    gameInfo: newGameInfo,
                    storeOffers: offers,
                    priceHistory: newPriceHistory
                });

            } catch (err) {
                console.error("Error in fetchGame (GameDetails):", err);
                setError(err instanceof Error ? err.message : "Unknown error occurred during game fetch.");
            } finally {
                setLoading(false);
            }
        }

        fetchGame();
    }, [titleParamFromUrl, gameIdParamFromUrl]); // Depend on URL params

    useEffect(() => {
        if (!isModal) return;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" || event.key === "Enter") {
                handleClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isModal, handleClose]);

    const calculatePriceStats = useCallback(() => {
        if (!priceHistory || priceHistory.length === 0) return null;
        const prices = priceHistory.map(item => item.price);
        if (prices.length === 0) return null;
        return {
            lowestPrice: Math.min(...prices),
            highestPrice: Math.max(...prices),
            currentPrice: prices[prices.length - 1],
            averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length
        };
    }, [priceHistory]);

    const priceStats = useMemo(() => calculatePriceStats(), [calculatePriceStats]);

    const lowestPrice = useMemo(() => {
        const validOffers = getValidStoreOffers();
        if (validOffers.length === 0) return null;
        return validOffers.reduce((min, offer) => offer.price < min ? offer.price : min, validOffers[0].price);
    }, [getValidStoreOffers]);

    const validStoreOffers = useMemo(() => getValidStoreOffers(), [getValidStoreOffers]);

    if (loading) return <LoadingMessage />;

    const errorOrNotFoundContent = (message: string, buttonText: string, action: () => void) => (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>{message}</p>
            <button onClick={action} style={{ marginTop: '15px', padding: '8px 15px', cursor: 'pointer' }}>{buttonText}</button>
        </div>
    );

    if (error) {
        const content = errorOrNotFoundContent(
            `Error loading game details: ${error}`,
            isModal ? "Close" : "Go Back to Home",
            handleClose
        );
        if (isModal) return <div className="modal-overlay" onClick={handleClose}><div className="modal-content error-modal" onClick={(e) => e.stopPropagation()}>{content}</div></div>;
        return <div className="game-details error">{content}</div>;
    }
    if (notFound) {
        const content = errorOrNotFoundContent(
            "Game not found.",
            isModal ? "Close" : "Go Back to Home",
            handleClose
        );
        if (isModal) return <div className="modal-overlay" onClick={handleClose}><div className="modal-content not-found-modal" onClick={(e) => e.stopPropagation()}>{content}</div></div>;
        return <div className="game-details not-found">{content}</div>;
    }

    return (
        <div className={isModal ? "modal-overlay" : "game-details-container"} onClick={isModal ? handleClose : undefined}>
            <div className={isModal ? "modal-content" : "game-details-content"} onClick={isModal ? (e) => e.stopPropagation() : undefined}>
                {isModal && (
                    <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
                )}
                <div className="details-header"><h1 className="details-title">{gameInfo.title}</h1></div>
                <div className="details-main">
                    <div className="details-image-container">
                        <img className="details-image" src={gameInfo.image} alt={gameInfo.title} onError={(e) => { e.currentTarget.src = '/placeholder.jpg'; }} />
                        <div className="watchlist-section">
                            <WatchlistButton id={gameInfo.id} title={gameInfo.title} storeOffers={validStoreOffers} genre={gameInfo.genres.join(', ')} />
                        </div>
                    </div>
                    <div className="details-info">
                        <div className="details-description">{gameInfo.description || "No description available."}</div>
                        <div className="details-genres-container">
                            <h2 className="details-subtitle">Genres</h2>
                            <p className="details-genres">{gameInfo.genres.length > 0 ? gameInfo.genres.join(", ") : "N/A"}</p>
                        </div>
                        <div className="details-platforms-container">
                            <h2 className="details-subtitle">Platforms</h2>
                            <p className="details-platforms">
                                {gameInfo.platforms && gameInfo.platforms.length > 0
                                    ? gameInfo.platforms.filter(p => p.name && !["Other", "Xbox Play Anywhere"].includes(p.name))
                                        .map(p => p.name === "EA Desktop App" ? "EA" : p.name === "Epic Games Launcher" ? "Epic Games" : p.name === "Ubisoft Connect" ? "Ubisoft" : p.name)
                                        .join(", ")
                                    : "N/A"}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="details-offers">
                    <h2 className="details-subtitle">Store Offers</h2>
                    {validStoreOffers.length > 0 ? (
                        <div className="store-offers-grid">
                            {validStoreOffers.map((offer, index) => (
                                <div className="store-offer" key={`${offer.store.name}-${offer.edition}-${offer.platform}-${index}`}>
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
                    ) : (<p className="no-offers">No store offers available at this time.</p>)}
                </div>
                <div className="price-history-section">
                    <h2 className="details-subtitle">Price History</h2>
                    {lowestPrice !== null && priceStats ? (
                        <div className="price-history-content">
                            <div className="price-stats">
                                <div className="stat-item"><span className="stat-label">Current Best</span><span className="stat-value">${lowestPrice.toFixed(2)}</span></div>
                                <div className="stat-item"><span className="stat-label">Lowest Tracked</span><span className="stat-value">${priceStats.lowestPrice.toFixed(2)}</span></div>
                                <div className="stat-item"><span className="stat-label">Highest Tracked</span><span className="stat-value">${priceStats.highestPrice.toFixed(2)}</span></div>
                                <div className="stat-item"><span className="stat-label">Average</span><span className="stat-value">${priceStats.averagePrice.toFixed(2)}</span></div>
                            </div>
                            <div className="new-price-tracking">
                                <p>We've started tracking prices for this game.</p>
                                <p>The current best price is <strong>${lowestPrice.toFixed(2)}</strong>.</p>
                                <p>Check back later to see price trend information!</p>
                            </div>
                        </div>
                    ) : (<p className="no-price-history">No price information available.</p>)}
                </div>
                {!isModal && (<button className="back-button" onClick={handleClose}>Back to Search</button>)}
            </div>
        </div>
    );
}

export default GameDetails;