import LoginComponent from "../components/login";

function Login() {
  return (
    <div>
      <h2>Login Page</h2>
      <LoginComponent />
      <p>
        Don't have an account? <a href="/register">Create Account</a>
      </p>
    </div>
  );
}

export default Login;
