// src/components/Navbar.tsx
import { Link } from "react-router-dom";

function Navbar() {
    return (
        <div className="navbar">
            <input type="search" placeholder="Search Games" />
            <img src="../../public/logo.png" alt="Quest4Deals Logo" />
            <Link to="/login">Sign In</Link>
        </div>
    );
}

export default Navbar;



