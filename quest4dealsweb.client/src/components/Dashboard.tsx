import { useEffect, useState } from "react";
import Gamecard from "./Gamecard";

function Dashboard() {
  // Array for storing games given by the API requests
  const [games, setGames] = useState([]);

  useEffect(() => {
    async function fetchGames() {
      try {
        console.log("Fetching games...");
        // Sent request to api endpoint
        const response = await fetch(
          "https://www.nexarda.com/api/v3/search?type=games"
        );
        // Parse the response to JSON
        const data = await response.json();
        // Set the games array with the data in JSON format
        // items is the array of games in the JSON response
        setGames(data.results.items);
        console.log("Games fetched successfully!");
      } catch (error) {
        console.error("Error fetching game data:", error);
      }
    }

    // Call the fetchGames function within the useEffect hook to fetch the games when the component is mounted to the DOM
    fetchGames();
  }, []);

  // Render the Gamecard component for each game in the games array, passing the game object as a prop to the Gamecard component
  return (
    <div className="dashboard">
      {games.map((game, index) => (
        <Gamecard key={index} game={game} />
      ))}
    </div>
  );
}

export default Dashboard;
