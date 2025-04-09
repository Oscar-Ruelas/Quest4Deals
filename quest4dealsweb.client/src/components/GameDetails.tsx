import { useParams } from "react-router-dom";
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

function GameDetails() {
    const { title } = useParams();
    const [loading, setLoading] = useState(true);
    const [gameTitle, setGameTitle] = useState("");
    const [gameImage, setGameImage] = useState("");
    const [gameDesc, setGameDesc] = useState("");
    const [platforms, setPlatforms] = useState<Platform[]>([]);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        async function fetchGame() {
            if (!title) {
                console.warn("❌ No title in URL params");
                setNotFound(true);
                return;
            }

            setLoading(true);
            setNotFound(false);

            try {
                const res = await fetch(`/api/nexarda/search?query=${encodeURIComponent(title)}`);
                const data: SearchResult = await res.json();

                console.log("🚀 API Response:", data);

                const game = data?.results?.items?.[0];
                if (!game) {
                    setNotFound(true);
                    return;
                }

                console.log("🎮 Platforms:", game.game_info.platforms);

                setGameTitle(game.title);
                setGameImage(game.image);
                setGameDesc(game.game_info.short_desc);
                setPlatforms(game.game_info.platforms || []);
            } catch (error) {
                console.error("❌ Fetch error:", error);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        }

        fetchGame();
    }, [title]);

    if (loading) return <div>Loading game details...</div>;
    if (notFound) return <div>Game not found.</div>;

    return (
        <div className="game-details">
            <h1>{gameTitle}</h1>
            <img src={gameImage} alt={gameTitle} style={{ width: "200px" }} />
            <p>{gameDesc}</p>

            <h2>Platforms</h2>
            {platforms.length > 0 ? (
                <p>{platforms.map(p => p.name).join(", ")}</p>
            ) : (
                <p>No platforms found.</p>
            )}
        </div>
    );
}

export default GameDetails;
