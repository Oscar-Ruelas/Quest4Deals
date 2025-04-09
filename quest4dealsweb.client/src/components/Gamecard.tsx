// Inner part of Game interface because it is another object inside the Game interface for JSON data
import { useNavigate } from "react-router-dom";

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

    const handleClick = () => {
        const cleanTitle = game.title.replace(/\s*\(.*?\)\s*/g, "").trim();
        navigate(`/details/${game.game_info.id}/${encodeURIComponent(cleanTitle)}`)
        
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

    return (
        <div className="gamecard" onClick={handleClick} style={{ cursor: "pointer" }}>
            <img src={game.image} alt="Game Image" />
            <h2>{game.title}</h2>
            <p>Lowest Price: ${game.game_info.lowest_price}</p>
            <p className="desc">{game.game_info.short_desc}</p>

            <div className="age-rating">
                <strong>Rating:</strong>{" "}
                {esrb ? (
                    `${esrb.symbol} (${esrb.label})`
                ) : (
                    <span style={{ color: "#aaa", fontStyle: "italic" }}>Not Rated</span>
                )}
            </div>
        </div>
    );
}

export default Gamecard;
