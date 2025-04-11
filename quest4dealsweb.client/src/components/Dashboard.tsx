import Gamecard, { Game } from "./Gamecard";
import { useEffect, useState, useRef, useCallback } from "react";

interface DashboardProps {
  isFiltered: boolean;
  filters: {
    platform: string;
    genre: string;
    price: string;
  };
}

function Dashboard({ isFiltered, filters }: DashboardProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const seenGameIds = useRef<Set<number>>(new Set());
  const observer = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const prefetchCache = useRef<{ [key: number]: Game[] }>({});
  const isFetching = useRef<boolean>(false);

  const LIMIT = 20;
  const MAX_PREFETCH_PAGES = 1;

  const fetchGames = useCallback(
    async (pageToFetch: number) => {
      try {
        const response = await fetch(
          isFiltered
            ? `/api/nexarda/games/filter?genre=${filters.genre.toLowerCase()}&platform=${filters.platform.toLowerCase()}&priceSort=${
                filters.price
              }&page=${pageToFetch}&limit=${LIMIT}`
            : `/api/nexarda/games?page=${pageToFetch}&limit=${LIMIT}`
        );
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const parsed = typeof data === "string" ? JSON.parse(data) : data;

        const newGames =
          parsed.results?.items?.filter((game: Game) => {
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
    [LIMIT, isFiltered, filters]
  );

  const loadGames = useCallback(async () => {
    isFetching.current = true;
    setLoading(true);
    setError(null);

    let newGames = prefetchCache.current[page] || [];

    if (newGames.length === 0) {
      newGames = await fetchGames(page);
    }

    setGames((prev) => [...prev, ...newGames]);

    // Prefetch up to MAX_PREFETCH_PAGES ahead
    for (let i = 1; i <= MAX_PREFETCH_PAGES; i++) {
      const nextPage = page + i;
      if (!prefetchCache.current[nextPage]) {
        const nextGames = await fetchGames(nextPage);
        prefetchCache.current[nextPage] = nextGames;
      }
    }

    setLoading(false);
    isFetching.current = false;
  }, [page, fetchGames]);

  useEffect(() => {
    const delay = setTimeout(() => {
      loadGames();
    }, 100); // debounce for smoother UX

    return () => clearTimeout(delay);
  }, [loadGames]);

  useEffect(() => {
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && !loading && !isFetching.current) {
          isFetching.current = true;
          setPage((prev) => prev + 1);
        }
      },
      {
        rootMargin: "90px", // reduced margin for more controlled loading
      }
    );

    if (sentinelRef.current) {
      observer.current.observe(sentinelRef.current);
    }

    return () => observer.current?.disconnect();
  }, [loading]);

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
