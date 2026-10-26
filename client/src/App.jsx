import NearbyHospitals from "./NearbyHospitals";
import { useState, useEffect } from "react";
import EmergencyLocation from "./EmergencyLocation";
import MyMedicalProfiles from "./MyMedicalProfiles";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import {
  HeartPulse,
  ShieldCheck,
  QrCode,
  MapPin,
  Hospital,
  PhoneCall,
  Activity,
  Menu,
  ArrowRight,
  Clock,
} from "lucide-react";

import PatientForm from "./PatientForm";
import EmergencyPage from "./EmergencyPage";
import Login from "./Login";
import Signup from "./Signup";
import "./App.css";

const API_URL = "https://mediresq-apii.onrender.com";

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiMessage, setApiMessage] = useState(
    "Connecting to backend..."
  );
  const [emergencyLocation, setEmergencyLocation] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_URL}/api/auth/me`, { withCredentials: true })
      .then((response) => {
        if (active && response.data.success) {
          setUser(response.data.user);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setAuthLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    axios
      .get(`${API_URL}/api/health`)
      .then((response) => {
        if (!active) return;

        const connected =
          response.data.status === "healthy" &&
          response.data.database === "connected";

        setApiStatus(connected ? "connected" : "error");

        setApiMessage(
          connected
            ? "Backend and database connected"
            : "Database unavailable"
        );
      })
      .catch(() => {
        if (!active) return;

        setApiStatus("error");
        setApiMessage(
          "Backend unavailable. Start the server and refresh."
        );
      });

    return () => {
      active = false;
    };
  }, []);

  function openPatientForm() {
    setMenuOpen(false);
    navigate("/create-medical-id");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    try {
      await axios.post(
        `${API_URL}/api/auth/logout`,
        {},
        { withCredentials: true }
      );
      setUser(null);
      setMenuOpen(false);
      navigate("/");
    } catch (error) {
      console.error("Logout failed:", error);
      setApiMessage("Could not sign out. Please try again.");
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-icon">
            <HeartPulse size={25} />
          </span>
          <span>MediResQ</span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
          aria-expanded={menuOpen}
        >
          <Menu />
        </button>

        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>
            How it works
          </a>

          <a href="#features" onClick={() => setMenuOpen(false)}>
            Features
          </a>
<a href="#emergency" onClick={() => setMenuOpen(false)}>
  Emergency access
</a>

{user && (
  <button
    className="nav-button"
    onClick={() => {
      setMenuOpen(false);
      navigate("/my-medical-profiles");
    }}
    type="button"
  >
    My Profiles
  </button>
)}

<button className="nav-button" onClick={openPatientForm}>
  Create Medical ID <ArrowRight size={16} />
</button>

          {!authLoading &&
            (user ? (
              <>
                <span className="nav-user-label" aria-label="Signed in user">
                  Hi, {user.name}
                </span>
                <button
                  className="nav-button"
                  onClick={handleLogout}
                  type="button"
                >
                  Sign out
                </button>
              </>
            ) : (
              <button
                className="nav-button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/login");
                }}
                type="button"
              >
                Sign in
              </button>
            ))}
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <ShieldCheck size={16} /> EMERGENCY CARE, CONNECTED
            </div>

            <h1>
              Every second matters.
              <span>Every life does too.</span>
            </h1>

            <p className="hero-description">
              Critical medical information. Your location. The right
              emergency care. Connected when every second counts.
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={openPatientForm}>
                <QrCode size={19} /> Create Medical ID
              </button>

              <a className="secondary-button" href="#how-it-works">
                Discover how it works <ArrowRight size={17} />
              </a>
            </div>

            <div className="trust-note">
              <ShieldCheck size={17} />
              Privacy-aware design · Emergency-focused access
            </div>
          </div>

          <div className="hero-visual">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>

            <div className="medical-card">
              <div className="card-top">
                <div className="mini-brand">
                  <HeartPulse size={20} /> MediResQ
                </div>
                <span className="status-dot">● Emergency ID</span>
              </div>

              <div className="patient-placeholder">
                <div className="patient-avatar">
                  <Activity size={35} />
                </div>

                <div>
                  <span className="muted-label">MEDICAL ID</span>
                  <h3>Your health profile</h3>
                  <p>Ready when it matters</p>
                </div>
              </div>

              <div className="medical-divider"></div>

              <div className="info-row">
                <span>
                  <HeartPulse size={17} /> Medical information
                </span>
                <ShieldCheck size={18} />
              </div>

              <div className="info-row">
                <span>
                  <MapPin size={17} /> Emergency location
                </span>
                <MapPin size={18} />
              </div>

              <div className="info-row">
                <span>
                  <Hospital size={17} /> Nearby care discovery
                </span>
                <ArrowRight size={18} />
              </div>

              <div className="qr-preview">
                <div className="qr-placeholder">
                  <QrCode size={57} />
                </div>

                <div>
                  <strong>One scan. Vital context.</strong>
                  <p>Designed for emergency situations</p>
                </div>
              </div>
            </div>

            <div className="floating-chip chip-top">
              <span className="chip-icon">
                <MapPin size={19} />
              </span>

              <div>
                <strong>Location-aware</strong>
                <small>Find nearby care</small>
              </div>
            </div>

            <div className="floating-chip chip-bottom">
              <span className="chip-icon green">
                <ShieldCheck size={19} />
              </span>

              <div>
                <strong>Medical context</strong>
                <small>Information at a glance</small>
              </div>
            </div>
          </div>
        </section>

        <section className="feature-strip" id="features">
          <div className="strip-item">
            <QrCode />
            <div>
              <strong>QR medical ID</strong>
              <p>Access essential patient details</p>
            </div>
          </div>

          <div className="strip-item">
            <MapPin />
            <div>
              <strong>Location awareness</strong>
              <p>Support emergency location sharing</p>
            </div>
          </div>

          <div className="strip-item">
            <Hospital />
            <div>
              <strong>Care matching</strong>
              <p>Explore suitable nearby facilities</p>
            </div>
          </div>

          <div className="strip-item">
            <PhoneCall />
            <div>
              <strong>Emergency contacts</strong>
              <p>Keep important contacts accessible</p>
            </div>
          </div>
        </section>

        <section className="how-section" id="how-it-works">
          <div className="section-heading">
            <span className="eyebrow">SIMPLE BY DESIGN</span>
            <h2>Built around the moments that matter.</h2>
            <p>
              A connected emergency workflow, from medical identity to care
              discovery.
            </p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <QrCode size={27} />
              <h3>Create a medical ID</h3>
              <p>
                Organize essential medical details and emergency contacts in
                one profile.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">02</span>
              <MapPin size={27} />
              <h3>Scan and locate</h3>
              <p>
                Use the QR workflow and, with permission, identify the incident
                location.
              </p>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <Hospital size={27} />
              <h3>Explore suitable care</h3>
              <p>
                Compare nearby facilities using available capability and
                distance information.
              </p>
            </article>
          </div>
        </section>

        <section className="emergency-section" id="emergency">
          <div className="emergency-icon">
            <Clock size={28} />
          </div>

          <div>
            <span className="eyebrow">MEDIRESQ EMERGENCY WORKFLOW</span>
            <h2>Be prepared before an emergency happens.</h2>
            <p>
              Patient profiles, QR access, location services and hospital
              matching will be connected as we build the application.
            </p>
          </div>

          <button className="primary-button" onClick={openPatientForm}>
            Create Medical ID <ArrowRight size={17} />
          </button>
        </section>

        <section className="location-section" id="emergency-location">
          <div className="section-heading">
            <span className="eyebrow">LOCATION SERVICES</span>
            <h2>Know where help is needed.</h2>
            <p>
              Detect your current location and open it on a map when you need
              emergency assistance.
            </p>
          </div>

          <EmergencyLocation onLocationDetected={setEmergencyLocation} />

          <NearbyHospitals location={emergencyLocation} />
        </section>

        <section
          className="backend-status"
          aria-live="polite"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "16px",
            color: apiStatus === "connected" ? "#27815c" : "#647680",
            fontSize: "13px",
          }}
        >
          <span
            style={{
              width: "9px",
              height: "9px",
              borderRadius: "50%",
              background:
                apiStatus === "connected"
                  ? "#27815c"
                  : apiStatus === "error"
                    ? "#c24141"
                    : "#d49b27",
            }}
          />
          {apiMessage}
        </section>
      </main>

      <footer className="footer">
        <a
          href="/"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            navigate("/");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-icon">
            <HeartPulse size={21} />
          </span>
          MediResQ
        </a>

        <p>Scan. Know. Locate. Save.</p>

        <span>
          Emergency support concept · Not a replacement for emergency services
        </span>
      </footer>
    </div>
  );
}

function PatientFormPage() {
  const navigate = useNavigate();

  return (
    <PatientForm
      onBack={() => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />

        <Route
          path="/create-medical-id"
          element={<PatientFormPage />}
        />
        <Route
          path="/my-medical-profiles"
          element={<MyMedicalProfiles />}
        />

        <Route
          path="/emergency/:medicalId"
          element={<EmergencyPage />}
        />

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="*"
          element={
            <main className="emergency-page">
              <section className="emergency-card emergency-state">
                <h1>Page not found</h1>
                <p>The requested MediResQ page does not exist.</p>
                <a href="/" className="secondary-button">
                  Return to home
                </a>
              </section>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;