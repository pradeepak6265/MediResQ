import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  HeartPulse,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
import "./Auth.css";

const API_URL = "https://mediresq-apii.onrender.com";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();

    if (!email || !form.password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/login`,
        {
          email,
          password: form.password,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        navigate("/", { replace: true });
      } else {
        setError(response.data.message || "Login failed.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to connect to MediResQ. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link to="/" className="auth-brand">
          <span className="auth-brand-icon">
            <HeartPulse size={26} />
          </span>

          <span>MediResQ</span>
        </Link>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            <ShieldCheck size={15} />
            YOUR HEALTH, YOUR CONTROL
          </span>

          <h1>Welcome back</h1>

          <p>
            Sign in to access your MediResQ account and manage your medical
            profile.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="email">Email address</label>

            <div className="auth-input-wrapper">
              <Mail size={19} className="auth-input-icon" />

              <input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                maxLength={254}
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>

            <div className="auth-input-wrapper">
              <LockKeyhole size={19} className="auth-input-icon" />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoaderCircle size={19} className="auth-spinner" />
                Signing in...
              </>
            ) : (
              <>
                Sign in
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>SECURE ACCOUNT ACCESS</span>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>

        <Link to="/" className="auth-back-link">
          Back to MediResQ home
        </Link>

        <div className="auth-security-note">
          <ShieldCheck size={17} />
          Your account credentials are protected.
        </div>
      </section>
    </main>
  );
}

export default Login;