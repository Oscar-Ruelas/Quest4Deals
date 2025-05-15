import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styling/Register.css";

function Register() {
    const [name, setName] = useState("");
    const [userName, setUserName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const validatePassword = (password: string) => {
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        return passwordRegex.test(password);
    };

    const handleAccount = async () => {
        setError("");
        setSuccess("");
        setLoading(true);

        if (!validatePassword(password)) {
            setError("Password must contain at least one uppercase letter, a digit, and a special character.");
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

            setSuccess("Confirmation code sent to your email. Redirecting...");
            localStorage.setItem("pendingEmail", data.email);
            setTimeout(() => navigate(data.redirectTo || "/verify-email"), 1500);
        } catch (error) {
            console.error("Error during account creation:", error);
            setError(error instanceof Error ? error.message : "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleAccount();
        }
    };

    return (
        <div className="register">
            <img src="../../public/logo.png" alt="Quest4Deals Logo" />
            <h1>Create your account</h1>
            <h2>Track your favorite games and save big on deals</h2>
            <h3>Join free. Cancel anytime.</h3>

            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
            {loading && <p>Creating account...</p>}

            <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <input
                type="text"
                placeholder="Username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            <button onClick={handleAccount} disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
            </button>

            <p style={{ marginTop: "1em" }}>
                Already a member?{" "}
                <Link to="/login" className="home-link">
                    Sign in
                </Link>
            </p>
        </div>
    );
}

export default Register;
