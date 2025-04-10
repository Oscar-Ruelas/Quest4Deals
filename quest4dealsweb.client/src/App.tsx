// src/App.tsx
import {
    BrowserRouter as Router,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Filter from "./components/Filter";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import EditProfilePage from "./pages/EditProfile";
import GameDetails from "./components/GameDetails";
import "./styling/Main.css";

function AppRoutes() {
    const location = useLocation();
    const state = location.state as { backgroundLocation?: Location };

    return (
        <>
            {/* Background content */}
            <Routes location={state?.backgroundLocation || location}>
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
                {/* fallback if user visits details directly */}
                <Route
                    path="/details/:id/:title"
                    element={<GameDetails isModal={false} />}
                />
            </Routes>

            {/* Modal route on top of background */}
            {state?.backgroundLocation && (
                <Routes>
                    <Route
                        path="/details/:id/:title"
                        element={<GameDetails isModal />}
                    />
                </Routes>
            )}
        </>
    );
}

export default function App() {
    return (
        <Router>
            <AppRoutes /> {/* ✅ Hook now called inside Router */}
        </Router>
    );
}
