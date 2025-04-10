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

interface SearchResult {
    results: {
        items: {
            title: string;
            image: string;
            game_info: {
                id: number;
                short_desc: string;
                platforms: Platform[];
            };
        }[];
    };
}

function GameDetails({ isModal = false }: { isModal?: boolean }) {
    const { title } = useParams();
    const navigate = useNavigate();

    const [loadingDetails, setLoadingDetails] = useState(true);
    const [loadingPrices, setLoadingPrices] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [gameTitle, setGameTitle] = useState("");
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [storeOffers, setStoreOffers] = useState<StoreOffer[]>([]);

    useEffect(() => {
        async function fetchGame() {
            if (!title) {
                setNotFound(true);
                return;
            }

            setLoadingDetails(true);
            setLoadingPrices(true);
            setNotFound(false);

            // Optional: check sessionStorage cache
            const cached = sessionStorage.getItem(`game-${title}`);
            if (cached) {
                const parsed = JSON.parse(cached);
                setGameTitle(parsed.title);
                setGameImage(parsed.image);
                setGameDesc(parsed.desc);
                setPlatforms(parsed.platforms);
                setStoreOffers(parsed.offers);
                setLoadingDetails(false);
                setLoadingPrices(false);
                return;
            }

            try {
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(title)}`);
                const data: SearchResult = await res.json();
                const game = data?.results?.items?.[0];

                if (!game) {
                    setNotFound(true);
                    return;
                }

                const gameId = game.game_info.id;

                // Set UI details right away
                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);
                setLoadingDetails(false);

                // Fetch prices in parallel
                const priceRes = await fetch(`/api/nexarda/prices?id=${gameId}`);
                const priceData = await priceRes.json();
                const priceJson = typeof priceData === "string" ? JSON.parse(priceData) : priceData;

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

                setStoreOffers(offers);
                setLoadingPrices(false);

                // Save to sessionStorage for faster future loads
                sessionStorage.setItem(
                    `game-${title}`,
                    JSON.stringify({
                        title: game.title,
                        image: game.image,
                        desc: game.game_info.short_desc,
                        platforms: game.game_info.platforms,
                        offers,
                    })
                );
            } catch (error) {
                console.error("Error fetching game details:", error);
                setNotFound(true);
            } finally {
                setLoadingDetails(false);
                setLoadingPrices(false);
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

    if (notFound) return <div className="game-details">Game not found.</div>;

    return (
        <div className={isModal ? "modal-overlay" : "game-details"}>
            <div className={isModal ? "modal-content" : ""}>
                {isModal && (
                    <button className="modal-close" onClick={handleClose} aria-label="Close">
                        ✕
                    </button>
                )}

                {loadingDetails ? (
                    <div className="game-details">
                        {/* Replace this block with a styled skeleton loader if preferred */}
                        <p>Loading game details...</p>
                    </div>
                ) : (
                    <>
                        <h1 className="details-title">{gameTitle}</h1>
                        <img className="details-image" src={gameImage} alt={gameTitle} />
                        <p className="details-description">{gameDesc}</p>

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
                    </>
                )}

                {!loadingDetails && (
                    <>
                        {loadingPrices ? (
                            <p>Loading store offers...</p>
                        ) : storeOffers.length > 0 ? (
                            <>
                                <h2 className="details-subtitle">Available Offers</h2>
                                <div className="store-offers">
                                    {storeOffers.map((offer, index) => (
                                        <a
                                            key={index}
                                            href={offer.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="store-offer"
                                        >
                                            <img
                                                src={offer.store.image}
                                                alt={offer.store.name}
                                                className="store-logo"
                                            />
                                            <div>
                                                <p className="store-name">{offer.store.name}</p>
                                                <p className="store-edition">
                                                    {offer.edition}
                                                    {offer.platform && ` (${offer.platform})`}
                                                </p>
                                                <p className="store-price">
                                                    {offer.price === 0 ? "Free" : `$${offer.price.toFixed(2)}`}
                                                </p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <p>No offers available.</p>
                        )}
                    </>
                )}

                {isModal && (
                    <div className="modal-hint">
                        Press <kbd>Esc</kbd> or <kbd>Enter</kbd> to close
                    </div>
                )}
            </div>
        </div>
    );
}

export default GameDetails;
