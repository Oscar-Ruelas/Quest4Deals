import { useLocation, useNavigate } from "react-router-dom";

// ESRB symbol mapping
const esrbSymbolMap: Record<string, { symbol: string; label: string }> = {
    "Everyone": { symbol: "E", label: "Everyone" },
    "Everyone 10+": { symbol: "E10+", label: "Everyone 10+" },
    "Teen": { symbol: "T", label: "Teen" },
    "Mature": { symbol: "M", label: "Mature" },
    "Adults": { symbol: "A", label: "Adults Only" },
    "Rating Pending": { symbol: "RP", label: "Rating Pending" },
};

interface Platform {
    name: string;
    slug: string;
    icon: string;
}

interface AgeRating {
    id: string;
    name: string;
}

interface GameInfo {
    id: number;
    lowest_price: number;
    short_desc: string;
    platforms: Platform[];
    age_ratings: AgeRating[];
}

export interface Game {
    image: string;
    title: string;
    game_info: GameInfo;
}

function Gamecard({ game }: { game: Game }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleClick = () => {
        const cleanTitle = game.title.replace(/\s*\(.*?\)\s*/g, "").trim();
        navigate(`/details/${game.game_info.id}/${encodeURIComponent(cleanTitle)}`, {
            state: { backgroundLocation: location },
        });
    };

    const esrbRating = game.game_info.age_ratings.find((rating) =>
        rating.id.startsWith("esrb")
    );

    let esrb: { symbol: string; label: string } | undefined;

    if (esrbRating) {
        const match = esrbRating.name.match(/ESRB\s([A-Za-z+ ]+)/);
        const keyword = match?.[1]?.trim();

        if (keyword && esrbSymbolMap[keyword]) {
            esrb = esrbSymbolMap[keyword];
        }
    }

    const shortDescription =
        game.game_info.short_desc.length > 100
            ? game.game_info.short_desc.slice(0, 97) + "..."
            : game.game_info.short_desc;

    return (
        <div className="gamecard" onClick={handleClick} style={{ cursor: "pointer" }}>
            <img src={game.image} alt="Game Image" />
            <h2>{game.title}</h2>

            <div className="game-info">
                <p className="lowest-price">
                    Lowest Price: {game.game_info.lowest_price === 0 ? "Free" : `$${game.game_info.lowest_price}`}
                </p>
                <p className="desc">{shortDescription}</p>
                <div className="age-rating">
                    <strong>Rating:</strong>{" "}
                    {esrb ? (
                        `${esrb.symbol} (${esrb.label})`
                    ) : (
                        <span style={{ color: "#aaa", fontStyle: "italic" }}>Not Rated</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Gamecard;
