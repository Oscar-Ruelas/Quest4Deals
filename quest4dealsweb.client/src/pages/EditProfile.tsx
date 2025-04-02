import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styling/edit-profile.css";

function EditProfile() {
    const [userId, setUserId] = useState("");
    const [userName, setUserName] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
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

            const response = await fetch(`/api/auth/update-profile/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ userName, name, email })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Update failed");
            }

            const data = await response.json();
            setSuccess(data.message);

            const updatedUser = { id: userId, userName, email, name };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            sessionStorage.setItem("user", JSON.stringify(updatedUser));

            // ✅ Redirect to main page after success
            navigate("/");

        } catch (err: any) {
            setError(err.message);
        }
    };


    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");
        if (!confirmDelete) return;

        try {
            const response = await fetch(`/api/auth/delete/${userId}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.message || "Account deletion failed");
            }

            // Clear storage
            localStorage.removeItem("user");
            sessionStorage.removeItem("user");

            alert("Your account has been deleted.");
            navigate("/"); // Redirect to homepage
        } catch (err: any) {
            setError(err.message);
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

