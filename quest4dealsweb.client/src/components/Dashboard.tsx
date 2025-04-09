import Gamecard, { Game } from "./Gamecard";

import { useEffect, useState } from "react";

function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/nexarda/games");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const parsed = typeof data === "string" ? JSON.parse(data) : data;

        setGames(parsed.results?.items || []);
      } catch (err) {
        console.error("Error fetching games:", err);
        setError("Failed to load games. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchGames();
  }, []);

  if (loading) return <div>Loading games...</div>;
  if (error) return <div>{error}</div>;

  return (
      <div className="dashboard">
        {games.map((game, index) => (
            <Gamecard key={index} game={game} />
        ))}
      </div>
  );
}

export default Dashboard;
