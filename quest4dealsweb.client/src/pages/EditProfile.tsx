import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styling/edit-profile.css";

function EditProfile() {
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
        if (!storedUser) {
            navigate("/login"); // 🔒 Redirect if not authenticated
            return;
        }

        const user = JSON.parse(storedUser);
        setUserId(user.id);
        setUserName(user.userName || "");
        setName(user.name || "");
        setEmail(user.email || "");
        setLoading(false);
    }, [navigate]);

    const handleUpdate = async () => {
        try {
            setError("");
            setSuccess("");

            const response = await fetch(`/api/auth/update-profile`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({
                    userName,
                    name,
                    email,
                    currentPassword: newPassword ? currentPassword : undefined,
                    newPassword: newPassword ? newPassword : undefined
                })
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Update failed");
            }

            setSuccess(data.message);

            const updatedUser = { id: userId, userName, email, name };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            sessionStorage.setItem("user", JSON.stringify(updatedUser));

            navigate("/"); // ✅ Redirect to main page after success

        } catch (err: any) {
            setError(err.message || "Unexpected error during update.");
        }
    };

    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete your account? This action cannot be undone."
        );
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/auth/delete`, {
                method: "DELETE",
                credentials: "include",
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (!response.ok) {
                throw new Error(data.message || "Account deletion failed");
            }

            // Clear user data
            localStorage.removeItem("user");
            sessionStorage.removeItem("user");

            alert("Your account has been deleted.");
            navigate("/"); // Redirect to homepage
        } catch (err: any) {
            setError(err.message || "Unexpected error during deletion.");
        }
    };

    if (loading) return <p>Loading...</p>;

    return (
        <div className="edit-profile-container">
            <h2>Edit Profile</h2>

            <input
                type="text"
                placeholder="Username"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <input
                type="password"
                placeholder="Current Password (required to change password)"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
            />

            <button onClick={handleUpdate}>Save Changes</button>

            <button className="delete-btn" onClick={handleDeleteAccount}>
                Delete Account
            </button>

            {success && <p className="success">{success}</p>}
            {error && <p className="error">{error}</p>}
        </div>
    );
}

export default EditProfile;
