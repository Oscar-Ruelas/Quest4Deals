import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styling/Register.css"; // Reuses your `.register` class styling

function ResetPassword() {
    const [step, setStep] = useState<1 | 2>(1);
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validatePassword = (password: string) => {
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
        return passwordRegex.test(password);
    };

    const requestCode = async () => {
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/request-password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Failed to send reset code");
            }

            setSuccess("Reset code sent to your email.");
            setStep(2);
        } catch (err: any) {
            setError(err.message || "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async () => {
        setError("");
        setSuccess("");
        setLoading(true);

        if (!validatePassword(newPassword)) {
            setError("Password must contain an uppercase letter, digit, and special character.");
            setLoading(false);
            return;
        }

        try {
            const response = await fetch("/api/auth/confirm-password-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, code, newPassword }),
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Failed to reset password");
            }

            setSuccess("Password reset successfully. Redirecting to login...");
            setTimeout(() => navigate("/login"), 1500);
        } catch (err: any) {
            setError(err.message || "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            step === 1 ? requestCode() : resetPassword();
        }
    };

    return (
        <div className="register">
            <img src="../../public/logo.png" alt="Quest4Deals Logo" />
            <h1>Reset Your Password</h1>
            <h3>Enter your email to receive a confirmation code</h3>

            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}
            {loading && <p>Processing...</p>}

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={step === 2}
            />

            {step === 2 && (
                <>
                    <input
                        type="text"
                        placeholder="6-digit code"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        onKeyDown={handleKeyDown}
                    />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </>
            )}

            <button
                onClick={step === 1 ? requestCode : resetPassword}
                disabled={loading}
            >
                {loading
                    ? "Processing..."
                    : step === 1
                        ? "Send Reset Code"
                        : "Reset Password"}
            </button>

            <Link to="/login" className="home-link">
                Back to Login
            </Link>
        </div>
    );
}

export default ResetPassword;
