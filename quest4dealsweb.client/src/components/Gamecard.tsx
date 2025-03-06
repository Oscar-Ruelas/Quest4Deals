interface GameInfo {
  lowest_price: number;
  short_desc: string;
}

interface Game {
  image: string;
  title: string;
  game_info: GameInfo;
}

function Gamecard({ game }: { game: Game }) {
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
