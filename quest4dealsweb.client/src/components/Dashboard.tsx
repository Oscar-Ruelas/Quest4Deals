import Gamecard from "./Gamecard";

function Dashboard() {
  // Temporary style for the component to outline the container for css placement
  const tempStyle = {
    border: "1px solid black",
  };
  return (
    <div style={tempStyle}>
      <h1>Dashboard</h1>
      {/*
       Once we have the API calls working with our backend this will probably be replaced with 
      a map() to display all the games in the library. We generate a card for each game in the library. For now, we just have four.
      */}
      <Gamecard />
      <Gamecard />
      <Gamecard />
      <Gamecard />
    </div>
  );
}

export default Dashboard;
