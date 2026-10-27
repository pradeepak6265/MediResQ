import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  HeartPulse,
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import "./Auth.css";

const API_URL = "https://mediresq-apii.onrender.com";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    surname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const passwordRules = useMemo(
    () => ({
      length:
        form.password.length >= 8 && form.password.length <= 25,
      uppercase: /[A-Z]/.test(form.password),
      lowercase: /[a-z]/.test(form.password),
      number: /[0-9]/.test(form.password),
      special: /[^A-Za-z0-9]/.test(form.password),
    }),
    [form.password]
  );

  const passwordValid = Object.values(passwordRules).every(Boolean);

  const matchingPasswords =
    form.confirmPassword.length > 0 &&
    form.password === form.confirmPassword;

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // STEP 1: Start signup and request an OTP.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const firstName = form.firstName.trim();
    const surname = form.surname.trim();
    const email = form.email.trim().toLowerCase();
    const name = `${firstName} ${surname}`.trim();

    if (
      !firstName ||
      !surname ||
      !email ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError("Please fill in all fields.");
      return;
    }

    if (firstName.length < 2 || firstName.length > 25) {
      setError("First name must be between 2 and 25 characters.");
      return;
    }

    if (surname.length < 2 || surname.length > 25) {
      setError("Surname must be between 2 and 25 characters.");
      return;
    }

    if (name.length > 100) {
      setError("Name must be 100 characters or fewer.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!passwordValid) {
      setPasswordFocused(true);
      setError("Please meet all 5 password requirements.");
      return;
    }

    if (new TextEncoder().encode(form.password).length > 72) {
      setError("Password is too long for the current account system.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/signup`,
        {
          name,
          email,
          password: form.password,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setVerificationEmail(email);
        setOtp("");
        setOtpStage(true);
        setSuccess(
          response.data.message ||
            "Verification code sent. Please check your email."
        );
      } else {
        setError("Unable to start signup. Please try again.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to start signup. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // STEP 2: Verify the six-digit OTP.
  async function handleVerifyOtp(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the complete six-digit verification code.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/verify-otp`,
        {
          email: verificationEmail,
          otp,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setSuccess(
          "Email verified successfully! Redirecting to login..."
        );

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 1200);
      } else {
        setError("Unable to verify the code. Please try again.");
      }
    } catch (err) {
      const responseData = err.response?.data;

      setError(
        responseData?.message ||
          "OTP verification failed. Please try again."
      );

      if (responseData?.attemptsRemaining !== undefined) {
        setError(
          `${responseData.message} Attempts remaining: ${responseData.attemptsRemaining}.`
        );
      }
    } finally {
      setLoading(false);
    }
  }

  // STEP 3: Request a new OTP.
  async function handleResendOtp() {
    setError("");
    setSuccess("");
    setResendLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/auth/resend-otp`,
        {
          email: verificationEmail,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setOtp("");
        setSuccess(
          response.data.message ||
            "A new verification code has been sent."
        );
      } else {
        setError("Unable to resend the verification code.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to resend the verification code. Please try again."
      );
    } finally {
      setResendLoading(false);
    }
  }

  function handleBackToSignup() {
    setOtpStage(false);
    setOtp("");
    setError("");
    setSuccess("");
  }

  function PasswordRule({ valid, text }) {
    return (
      <div className={`password-rule ${valid ? "is-valid" : ""}`}>
        <span className="password-rule-icon" aria-hidden="true">
          {valid ? <Check size={13} /> : <X size={13} />}
        </span>
        <span>{text}</span>
      </div>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-card-signup">
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

          <h1>
            {otpStage ? "Verify your email" : "Create your account"}
          </h1>

          <p>
            {otpStage
              ? "Enter the six-digit verification code sent to your email."
              : "Join MediResQ to get started with your medical profile."}
          </p>
        </div>

        {otpStage ? (
          // OTP VERIFICATION FORM
          <form
            className="auth-form"
            onSubmit={handleVerifyOtp}
            noValidate
          >
            <div className="auth-field">
              <label htmlFor="verification-email">
                Email address
              </label>

              <div className="auth-input-wrapper">
                <Mail
                  size={19}
                  className="auth-input-icon"
                />

                <input
                  id="verification-email"
                  type="email"
                  value={verificationEmail}
                  readOnly
                  aria-label="Email address receiving the verification code"
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-otp">
                Six-digit verification code
              </label>

              <div className="auth-input-wrapper">
                <ShieldCheck
                  size={19}
                  className="auth-input-icon"
                />

                <input
                  id="signup-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(event) => {
                    const value = event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6);

                    setOtp(value);
                    setError("");
                    setSuccess("");
                  }}
                  maxLength={6}
                  pattern="[0-9]{6}"
                  aria-describedby="otp-help"
                  required
                />
              </div>

              <p id="otp-help" className="password-valid-hint">
                The verification code expires after 10 minutes.
              </p>
            </div>

            {error && (
              <div
                className="auth-message auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="auth-message auth-success"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading || resendLoading}
            >
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <button
              type="button"
              className="auth-submit-button"
              onClick={handleResendOtp}
              disabled={loading || resendLoading}
            >
              {resendLoading
                ? "Sending new code..."
                : "Resend Verification Code"}
            </button>

            <button
              type="button"
              className="auth-submit-button"
              onClick={handleBackToSignup}
              disabled={loading || resendLoading}
            >
              Back to Signup
            </button>
          </form>
        ) : (
          // EXISTING SIGNUP FORM
          <form
            className="auth-form"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="auth-name-grid">
              <div className="auth-field">
                <label htmlFor="firstName">First name</label>

                <div className="auth-input-wrapper">
                  <UserRound
                    size={19}
                    className="auth-input-icon"
                  />

                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="First name"
                    value={form.firstName}
                    onChange={handleChange}
                    autoComplete="given-name"
                    maxLength={25}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="surname">Surname</label>

                <div className="auth-input-wrapper">
                  <input
                    id="surname"
                    name="surname"
                    type="text"
                    placeholder="Surname"
                    value={form.surname}
                    onChange={handleChange}
                    autoComplete="family-name"
                    maxLength={25}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="signup-email">
                Email address
              </label>

              <div className="auth-input-wrapper">
                <Mail
                  size={19}
                  className="auth-input-icon"
                />

                <input
                  id="signup-email"
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

            <div className="auth-field auth-password-field">
              <label htmlFor="signup-password">Password</label>

              <div className="auth-input-wrapper">
                <LockKeyhole
                  size={19}
                  className="auth-input-icon"
                />

                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={form.password}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  autoComplete="new-password"
                  maxLength={25}
                  required
                  aria-describedby="password-requirements"
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {passwordFocused && !passwordValid && (
                <div
                  className="password-requirements"
                  id="password-requirements"
                  role="status"
                >
                  <div className="password-requirements-header">
                    <span>Password requirements</span>

                    <span className="password-requirements-count">
                      {
                        Object.values(passwordRules).filter(Boolean)
                          .length
                      }
                      /5
                    </span>
                  </div>

                  <div className="password-rules-list">
                    <PasswordRule
                      valid={passwordRules.length}
                      text="8–25 characters"
                    />

                    <PasswordRule
                      valid={passwordRules.uppercase}
                      text="At least 1 uppercase letter"
                    />

                    <PasswordRule
                      valid={passwordRules.lowercase}
                      text="At least 1 lowercase letter"
                    />

                    <PasswordRule
                      valid={passwordRules.number}
                      text="At least 1 number"
                    />

                    <PasswordRule
                      valid={passwordRules.special}
                      text="At least 1 special character (@, #, !, etc.)"
                    />
                  </div>
                </div>
              )}

              {passwordFocused && passwordValid && (
                <p className="password-valid-hint">
                  <Check size={14} />
                  All password requirements met.
                </p>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">
                Confirm password
              </label>

              <div className="auth-input-wrapper">
                <LockKeyhole
                  size={19}
                  className="auth-input-icon"
                />

                <input
                  id="confirm-password"
                  name="confirmPassword"
                  type={
                    showConfirmPassword ? "text" : "password"
                  }
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                  maxLength={25}
                  required
                />

                <button
                  type="button"
                  className="auth-password-toggle"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) => !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {form.confirmPassword.length > 0 && (
                <p
                  className={`password-match-hint ${
                    matchingPasswords ? "is-valid" : "is-invalid"
                  }`}
                >
                  {matchingPasswords ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}

                  {matchingPasswords
                    ? "Passwords match."
                    : "Passwords do not match."}
                </p>
              )}
            </div>

            <label className="auth-terms">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setError("");
                }}
              />

              <span>
                I agree to the{" "}
                <a
                  href="/terms"
                  target="_blank"
                  rel="noreferrer"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noreferrer"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            {error && (
              <div
                className="auth-message auth-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="auth-message auth-success"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              type="submit"
              className="auth-submit-button"
              disabled={loading}
            >
              {loading ? "Sending verification code..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="auth-footer">
          {otpStage ? (
            <>
              Already have an account?{" "}
              <Link to="/login">Log in</Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link to="/login">Log in</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default Signup;