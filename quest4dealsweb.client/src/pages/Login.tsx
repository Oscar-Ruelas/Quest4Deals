import { Link } from "react-router-dom"; // ✅ Import Link from react-router-dom
import LoginComponent from "../components/login";

function Login() {
    return (
        <div>
            <h2>Login Page</h2>
            <LoginComponent />
            <p>
                Don't have an account? <Link to="/register">Create Account</Link> {/* ✅ Client-side navigation */}
            </p>
        </div>
    );
}

export default Login;

