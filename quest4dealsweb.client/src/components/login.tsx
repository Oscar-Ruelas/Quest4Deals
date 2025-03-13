import { useState } from "react";
import { useNavigate } from "react-router-dom";

const LoginComponent = () => {
  const [userNameOrEmail, setUserNameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // ✅ Loading state
  const [error, setError] = useState(""); // ✅ Error message state
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);  // ✅ Show loading state
    setError("");  // ✅ Reset errors

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNameOrEmail, password }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Invalid username or password.");
      }

      const data = await response.json();

      if (!data.user) {
        throw new Error("Login response is missing user data.");
      }

      // ✅ Store user info securely
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Redirect user to their games page
      navigate(`/user-games/${data.user.id}`);
    } catch (error) {
      console.error("Login error:", error);
      // @ts-ignore
      setError(error.message || "Login failed. Please try again.");
    } finally {
      setLoading(false); // ✅ Hide loading state
    }
  };

  return (
      <div>
        <h2>Login</h2>

        {error && <p style={{ color: "red" }}>{error}</p>} {/* ✅ Show error */}
        {loading && <p>Loading...</p>} {/* ✅ Show loading */}

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
        <button onClick={handleLogin} disabled={loading}> {/* ✅ Disable button while loading */}
          {loading ? "Logging in..." : "Login"}
        </button>
      </div>
  );
};

export default LoginComponent;

