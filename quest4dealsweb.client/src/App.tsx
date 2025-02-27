import Filter from "./components/Filter";
import Navbar from "./components/Navbar";
import Dashboard from "./components/Dashboard";
import "./styling/main.css";

function App() {
  return (
    <div className="App">
      <Navbar />
      <Filter />
      <Dashboard />
    </div>
  );
}

export default App;
