import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Allows navigation after login

const Login = () => {
    const [userNameOrEmail, setUserNameOrEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate(); // ✅ Hook for redirection

    const handleLogin = async () => {
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userNameOrEmail, password }),
                credentials: "include", // ✅ Required for cookie authentication
            });

            if (!response.ok) {
                throw new Error("Login failed");
            }

            const data = await response.json();
            console.log("Login successful:", data);

            // ✅ Store user info in localStorage
            localStorage.setItem("user", JSON.stringify(data.user));

            // ✅ Redirect user to their games page
            navigate(`/user-games/${data.user.id}`);
        } catch (error) {
            console.error("Error during login:", error);
        }
    };

    return (
        <div>
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
            <button onClick={handleLogin}>Login</button>
        </div>
    );
};

export default Login;
