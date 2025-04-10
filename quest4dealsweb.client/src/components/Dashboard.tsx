import Gamecard, { Game } from "./Gamecard";
import { useEffect, useState, useRef, useCallback } from "react";

function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const seenGameIds = useRef<Set<number>>(new Set());
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const LIMIT = 60;

  const fetchGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nexarda/games?page=${page}&limit=${LIMIT}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;

      const newGames = parsed.results?.items?.filter((game: Game) => {
        const id = game.game_info.id;
        if (seenGameIds.current.has(id)) return false;
        seenGameIds.current.add(id);
        return true;
      }) || [];

      setGames(prev => [...prev, ...newGames]);
    } catch (err) {
      console.error("Error fetching games:", err);
      setError("Failed to load games. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchGames();
    }, 100); // small buffer to smooth out fast scrolling

    return () => clearTimeout(delay);
  }, [fetchGames]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loading) {
        setPage(prev => prev + 1);
      }
    }, {
      rootMargin: '300px', // trigger early when user is 300px before bottom
    });

    if (sentinelRef.current) {
      observer.current.observe(sentinelRef.current);
    }

    return () => observer.current?.disconnect();
  }, [loading]);

  // Key listener for "r" to scroll to top
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "r" || event.key === "R") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
      <div className="dashboard">
        {games.map((game) => (
            <Gamecard key={game.game_info.id} game={game} />
        ))}

        <div ref={sentinelRef} style={{ height: "100px" }} />
        {loading && <p>Loading more games...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
      </div>
  );
}

export default Dashboard;
