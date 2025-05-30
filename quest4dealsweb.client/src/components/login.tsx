import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styling/Login.css";

const Login = () => {
  const [userNameOrEmail, setUserNameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (storedUser) {
      const returnPath = sessionStorage.getItem("returnTo") || "/";
      sessionStorage.removeItem("returnTo");
      navigate(returnPath);
    }
  }, [navigate]);

  const handleLogin = async () => {
    setErrorMessage("");
    setIsLoggingIn(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNameOrEmail, password }),
        credentials: "include",
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : {};

      if (!response.ok) {
        if (data?.message === "EmailNotConfirmed") {
          localStorage.setItem("pendingEmail", data.email);
          navigate(data.redirectTo || "/verify-email");
          return;
        }

        setErrorMessage(
            data?.message === "User not found"
                ? "User does not exist."
                : data?.message === "Incorrect password"
                    ? "Incorrect password."
                    : "Login failed. Please try again."
        );
        return;
      }

      if (keepLoggedIn) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(data.user));
      }

      const returnPath = sessionStorage.getItem("returnTo") || "/";
      sessionStorage.removeItem("returnTo");

      setTimeout(() => navigate(returnPath), 1000);
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage("An error occurred. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
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
              onKeyDown={handleKeyDown}
          />
          <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
          />

          <div style={{ width: "100%", textAlign: "right", marginBottom: "10px" }}>
            <Link to="/reset-password" className="forgot-password-link">
              Forgot your password?
            </Link>
          </div>

          {errorMessage && <p className="error-message">{errorMessage}</p>}
          {isLoggingIn && <p className="logging-in-message">Logging in...</p>}

          <button onClick={handleLogin} disabled={isLoggingIn}>
            Sign In
          </button>

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
          </div>

          <p className="signup-text">
            New to Quest4Deals? <Link to="/register">Sign up now</Link>
          </p>
        </div>
      </div>
  );
};

export default Login;
