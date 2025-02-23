function Navbar() {
  // Temporary style for the component to outline the container for css placement
  const tempStyle = {
    border: "1px solid black",
  };
  return (
    <div style={tempStyle}>
      <input type="text" placeholder="Search Games" />
      <img src="" alt="Quest4Deals Logo" />
      <a href="">Sign In</a>
    </div>
  );
}

export default Navbar;
