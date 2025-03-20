import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styling/Login.css";

const Login = () => {
  const [userNameOrEmail, setUserNameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser =
      localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      navigate(`/`);
    }
  }, [navigate]);

  const handleLogin = async () => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNameOrEmail, password }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      console.log("Login successful:", data);

      if (keepLoggedIn) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(data.user));
      }

      navigate(`/`);
    } catch (error) {
      console.error("Error during login:", error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <img src="../../public/logo.png" alt="Quest4Deals Logo" />
        <h2>Sign In</h2>
        <input
          type="text"
          placeholder="Email or Username"
          value={userNameOrEmail}
          onChange={(e) => setUserNameOrEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleLogin}>Sign In</button>

        <div className="login-options">
          <div className="remember-me">
            <input
              type="checkbox"
              id="keepLoggedIn"
              checked={keepLoggedIn}
              onChange={() => setKeepLoggedIn(!keepLoggedIn)}
            />
            <label htmlFor="keepLoggedIn">Remember me</label>
          </div>
          <a href="#" className="help-link">
            Need help?
          </a>
        </div>

        <p className="signup-text">
          New to Quest4Deals? <a href="/register">Sign up now</a>
        </p>
      </div>
    </div>
  );
};

export default Login;
