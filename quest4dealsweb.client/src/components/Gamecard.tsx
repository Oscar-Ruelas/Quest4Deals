// Inner part of Game interface because it is another object inside the Game interface for JSON data
interface GameInfo {
  lowest_price: number;
  short_desc: string;
}

// Game interface for JSON data
interface Game {
  image: string;
  title: string;
  game_info: GameInfo;
}

function Gamecard({ game }: { game: Game }) {
  // This is accessing the game object passed as a prop to the Gamecard component and
  // displaying the image, title, lowest price, and short description of the game in the game card
  return (
    <div className="gamecard">
      <img src={game.image} alt="Game Image" />
      <h2>{game.title}</h2>
      <p>Lowest Price: ${game.game_info.lowest_price}</p>
      <p className="desc">{game.game_info.short_desc}</p>
    </div>
  );
}

export default Gamecard;
