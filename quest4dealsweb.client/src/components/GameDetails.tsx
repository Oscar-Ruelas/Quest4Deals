import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styling/GameDetails.css";

interface Platform {
    name: string;
    slug: string;
    icon: string;
}

interface SearchResult {
    results: {
        items: {
            title: string;
            image: string;
            game_info: {
                short_desc: string;
                platforms: Platform[];
            };
        }[];
    };
}

function GameDetails({ isModal = false }: { isModal?: boolean }) {
    const { title } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [gameTitle, setGameTitle] = useState("");
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [notFound, setNotFound] = useState(false);

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
                const data: SearchResult = await res.json();
                const game = data?.results?.items?.[0];

                if (!game) {
                    setNotFound(true);
                    return;
                }

                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);
            } catch (error) {
                console.error("Error fetching game details:", error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }

        fetchGame();
    }, [title]);

    // ESC / LEFT ARROW exit handler
    useEffect(() => {
        if (!isModal) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" || event.key === "ArrowLeft") {
                navigate(-1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isModal, navigate]);

    if (loading) return <div className="game-details">Loading game details...</div>;
    if (notFound) return <div className="game-details">Game not found.</div>;

    const handleClose = () => navigate(-1);

    return (
        <div className={isModal ? "modal-overlay" : "game-details"}>
            <div className={isModal ? "modal-content" : ""}>
                {isModal && (
                    <button className="modal-close" onClick={handleClose} aria-label="Close">
                        ✕
                    </button>
                )}
                <h1 className="details-title">{gameTitle}</h1>
                <img className="details-image" src={gameImage} alt={gameTitle} />
                <p className="details-description">{gameDesc}</p>

                <h2 className="details-subtitle">Platforms</h2>
                <p className="details-platforms">{platforms.map((p) => p.name).join(", ")}</p>

                {isModal && (
                    <div className="modal-hint">
                        Press <kbd>Esc</kbd> or <kbd>←</kbd> to close
                    </div>
                )}
            </div>
        </div>
    );
}

export default GameDetails;
