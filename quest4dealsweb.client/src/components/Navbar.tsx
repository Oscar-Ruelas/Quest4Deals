function Navbar() {
  // Temporary style for the component to outline the container for css placement
  return (
    <div className="navbar">
      <input type="search" placeholder="Search Games" />
      <img src="../../public/logo.png" alt="Quest4Deals Logo" />
      <a href="">Sign In</a>
    </div>
  );
}

export default Navbar;
