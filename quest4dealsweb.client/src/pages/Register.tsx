import { useState } from "react";
import { useNavigate } from "react-router-dom";

function Register() {
  const [userNameOrEmail, setUserNameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); // ✅ Hook for redirection

  const handleAccount = async () => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userNameOrEmail, password }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Account creation failed");
      }

      const data = await response.json();
      console.log("Account creation successful:", data);

      localStorage.setItem("user", JSON.stringify(data.user));

      navigate(`/user-games/${data.user.id}`);
    } catch (error) {
      console.error("Error during account creation:", error);
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
      <button onClick={handleAccount}>Create Account</button>
    </div>
  );
}

export default Register;
