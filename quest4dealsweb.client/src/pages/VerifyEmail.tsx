import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styling/VerifyEmail.css";

function VerifyEmail() {
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [editingEmail, setEditingEmail] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [resendMessage, setResendMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        const storedEmail = localStorage.getItem("pendingEmail");
        if (storedEmail) setEmail(storedEmail);
    }, []);

    const handleVerification = async () => {
        setError("");
        setSuccess("");
        setLoading(true);

        if (!email || !code) {
            setError("Both email and confirmation code are required.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/verify-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code }),
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Verification failed");
            }

            setSuccess("Email verified! Logging you in...");
            localStorage.removeItem("pendingEmail");

            // Save user (assumes backend returns user info after login)
            if (data.user) {
                sessionStorage.setItem("user", JSON.stringify(data.user));
            }

            const returnPath = sessionStorage.getItem("returnTo") || "/";
            sessionStorage.removeItem("returnTo");

            setTimeout(() => navigate(returnPath), 1000);
        } catch (error) {
            console.error("Verification error:", error);
            setError(error instanceof Error ? error.message : "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const handleEmailCorrection = async () => {
        setError("");
        setSuccess("");
        setResendMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/new-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oldEmail: email, newEmail }),
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Failed to update email");
            }

            setEmail(data.email);
            localStorage.setItem("pendingEmail", data.email);
            setNewEmail("");
            setEditingEmail(false);
            setSuccess("Email updated. New code sent!");
        } catch (error) {
            console.error("Email correction failed:", error);
            setError(error instanceof Error ? error.message : "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError("");
        setSuccess("");
        setResendMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/resend-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Failed to resend code");
            }

            setResendMessage("Verification code resent to your email.");
        } catch (error) {
            console.error("Resend code error:", error);
            setError(error instanceof Error ? error.message : "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            editingEmail ? handleEmailCorrection() : handleVerification();
        }
    };

    return (
        <div className="verify-email">
            <img src="../../public/logo.png" alt="Quest4Deals Logo" />
            <h1>Verify Your Email</h1>
            <p>Please enter the 6-digit confirmation code sent to your email.</p>

            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
            {resendMessage && <p className="resend-message">{resendMessage}</p>}
            {loading && <p>Processing...</p>}

            {!editingEmail ? (
                <>
                    <input
                        type="email"
                        value={email}
                        disabled
                        onKeyDown={handleKeyDown}
                    />
                    <p style={{ marginTop: "-5px", marginBottom: "15px" }}>
                        <button
                            className="link-button"
                            onClick={() => setEditingEmail(true)}
                        >
                            Wrong email?
                        </button>
                    </p>
                </>
            ) : (
                <div style={{ marginBottom: "1em", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <input
                        type="email"
                        placeholder="Enter correct email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button onClick={handleEmailCorrection} disabled={loading}>
                        Submit New Email
                    </button>
                </div>
            )}

            <input
                type="text"
                placeholder="6-digit code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={6}
            />

            <button onClick={handleVerification} disabled={loading || editingEmail}>
                {loading ? "Verifying..." : "Verify Email"}
            </button>

            <button className="link-button" onClick={handleResendCode} disabled={loading}>
                Resend Code
            </button>

            <Link to="/" className="home-link">
                Go to Home
            </Link>
        </div>
    );
}

export default VerifyEmail;

