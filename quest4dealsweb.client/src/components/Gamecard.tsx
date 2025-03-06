interface Game {
  image: string;
  title: string;
  price: number;
  rating: string;
  shortDescription: string;
}

function Gamecard({ game }: { game: Game }) {
  return (
    <div className="gamecard">
      <img src={game.image} alt="Game Image" />
      <h2>{game.title}</h2>
      <p>{game.price}</p>
      <p>{game.rating}</p>
      <p>{game.shortDescription}</p>
    </div>
  );
}

export default Gamecard;
