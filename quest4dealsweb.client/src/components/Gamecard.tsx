function Gamecard() {
  // Temporary style for the component to outline the container for css placement
  const tempStyle = {
    border: "1px solid black",
  };
  return (
    <div style={tempStyle}>
      <h2>Title</h2>
      <img src="" alt="Game Image" />
      <p>Price</p>
      <p>Rating</p>
      <p>Short Description</p>
    </div>
  );
}

export default Gamecard;
