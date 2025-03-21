import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styling/register.css";

function Register() {
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(""); // ✅ Store error messages
  const [success, setSuccess] = useState(""); // ✅ Store success message
  const [loading, setLoading] = useState(false); // ✅ Show loading state

  const navigate = useNavigate(); // ✅ Hook for navigation

  const validatePassword = (password: string) => {
    // the password must contain at least one uppercase letter, a digit, and a special character
    // to enforce this I used a regular expression
    const passwordRegex =
      /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
    // returns true if password matches the rules, false if not
    return passwordRegex.test(password);
  };

  const handleAccount = async () => {
    setError(""); // ✅ Reset error
    setSuccess(""); // ✅ Reset success message
    setLoading(true); // ✅ Show loading state

    // validate the password before sending to server
    if (!validatePassword(password)) {
      // show error message to screen
      setError(
        "Password must contain at least one uppercase letter, a digit, and a special character"
      );
      // we aren't loading because the password was wrong, then we will return to exit this function
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userName, email, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Account creation failed");
      }

      // ✅ Ensure user object exists before accessing properties
      if (!data.user || !data.user.id) {
        throw new Error("Registration successful, but no user data returned.");
      }

      console.log("Account creation successful:", data);

      // ✅ Store user data in localStorage
      localStorage.setItem("user", JSON.stringify(data.user));

      // ✅ Show success message before redirecting
      setSuccess("Account created successfully! Redirecting...");

      // ✅ Redirect to user games page after 2 seconds
      setTimeout(() => navigate(`/user-games/${data.user.id}`), 2000);
    } catch (error) {
      console.error("Error during account creation:", error);
      // @ts-ignore
      setError(error.message);
    } finally {
      setLoading(false); // ✅ Hide loading state
    }
  };

  return (
    <div className="register">
      <img src="../../public/logo.png" alt="Quest4Deals Logo" />
      <h1>Want to save games to view later?</h1>
      <h2>Create an account here</h2>
      <h3>Psst... it's free!</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}
      {loading && <p>Creating account...</p>}
      <input
        type="text"
        placeholder="Full Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Username"
        value={userName}
        onChange={(e) => setUserName(e.target.value)}
      />
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleAccount} disabled={loading}>
        {loading ? "Creating Account..." : "Create Account"}
      </button>
      <Link to="/" className="home-link">
        Go to Home
      </Link>
    </div>
  );
}

export default Register;
