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

  // Cache for preloaded data
  const prefetchCache = useRef<{ [key: number]: Game[] }>({});

  const fetchGames = useCallback(
      async (pageToFetch: number) => {
        try {
          const response = await fetch(`/api/nexarda/games?page=${pageToFetch}&limit=${LIMIT}`);
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          const parsed = typeof data === "string" ? JSON.parse(data) : data;

          const newGames = parsed.results?.items?.filter((game: Game) => {
            const id = game.game_info.id;
            if (seenGameIds.current.has(id)) return false;
            seenGameIds.current.add(id);
            return true;
          }) || [];

          return newGames;
        } catch (err) {
          console.error("Error fetching games:", err);
          setError("Failed to load games. Please try again later.");
          return [];
        }
      },
      [LIMIT]
  );

  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Check if the current page is already prefetched
    let newGames = prefetchCache.current[page] || [];

    // If not prefetched, fetch it now
    if (newGames.length === 0) {
      newGames = await fetchGames(page);
    }

    // Update the games state
    setGames((prev) => [...prev, ...newGames]);

    // Prefetch the next page
    const nextPage = page + 1;
    if (!prefetchCache.current[nextPage]) {
      const nextGames = await fetchGames(nextPage);
      prefetchCache.current[nextPage] = nextGames; // Cache the next page
    }

    setLoading(false);
  }, [page, fetchGames]);

  useEffect(() => {
    const delay = setTimeout(() => {
      loadGames();
    }, 100); // small buffer to smooth out fast scrolling

    return () => clearTimeout(delay);
  }, [loadGames]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loading) {
            setPage((prev) => prev + 1);
          }
        },
        {
          rootMargin: "300px", // trigger early when user is 800px before bottom
        }
    );

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