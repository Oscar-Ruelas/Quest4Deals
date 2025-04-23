import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
      // If user is already logged in, redirect to return path or home
      const returnPath = sessionStorage.getItem('returnTo') || '/';
      sessionStorage.removeItem('returnTo'); // Clean up
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

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData?.message === "User not found") {
          setErrorMessage("User does not exist.");
        } else if (errorData?.message === "Incorrect password") {
          setErrorMessage("Incorrect password.");
        } else {
          setErrorMessage("Login failed. Please try again.");
        }
        setIsLoggingIn(false);
        return;
      }

      const data = await response.json();
      console.log("Login successful:", data);

      if (keepLoggedIn) {
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        sessionStorage.setItem("user", JSON.stringify(data.user));
      }

      // Get the return path and navigate back
      const returnPath = sessionStorage.getItem('returnTo') || '/';
      sessionStorage.removeItem('returnTo'); // Clean up

      // Short delay to show "Logging in..." message
      setTimeout(() => navigate(returnPath), 1000);
    } catch (error) {
      console.error("Error during login:", error);
      setErrorMessage("An error occurred. Please try again.");
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