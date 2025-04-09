// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Filter from "./components/Filter";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EditProfilePage from "./pages/EditProfile";
import "./styling/Main.css";
import GameDetails from "./components/GameDetails.tsx";

function App() {
    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={
                        <div className="App">
                            <Navbar />
                            <Filter />
                            <Dashboard />
                        </div>
                    }
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/edit-profile/:userId" element={<EditProfilePage />} />
                <Route path="/details/:id/:title" element={<GameDetails />} />
            </Routes>
        </Router>
    );
}

export default App;
