// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Filter from "./components/Filter";
import Dashboard from "./components/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import "./styling/main.css";

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
      </Routes>
    </Router>
  );
}

export default App;
