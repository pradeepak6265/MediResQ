import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import {
  HeartPulse,
  ShieldAlert,
  UserRound,
  Phone,
  Pill,
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
} from "lucide-react";

const API_URL = "http://localhost:5000";

function EmergencyPage() {
  const { medicalId } = useParams();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function fetchPatient() {
      try {
        setLoading(true);
        setError("");

        const response = await axios.get(
          `${API_URL}/api/patients/${encodeURIComponent(medicalId)}`
        );

        if (active) {
          setPatient(response.data.patient);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.status === 404
              ? "No patient profile was found for this Medical ID."
              : "Unable to load the profile. Please try again."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (medicalId) {
      fetchPatient();
    } else {
      setError("Medical ID is missing.");
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [medicalId]);

  if (loading) {
    return (
      <main className="emergency-page">
        <section className="emergency-card emergency-state">
          <LoaderCircle size={38} className="emergency-loader" />
          <h1>Loading medical profile</h1>
          <p>Please wait while we retrieve the profile.</p>
        </section>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="emergency-page">
        <section className="emergency-card emergency-state">
          <ShieldAlert size={48} color="#b42318" />
          <h1>Profile unavailable</h1>
          <p>{error || "Patient profile could not be found."}</p>
          <Link to="/" className="secondary-button">
            <ArrowLeft size={17} /> Return to home
          </Link>
        </section>
      </main>
    );
  }

  const contacts = patient.emergencyContacts || [];

  return (
    <main className="emergency-page">
      <section className="emergency-card">
        <div className="emergency-banner">
          <ShieldAlert size={22} />
          <div>
            <h1>Emergency Medical Profile</h1>
            <p>Use this information to assist the patient.</p>
          </div>
        </div>

        <div className="emergency-patient-heading">
          <div className="emergency-avatar">
            <UserRound size={30} />
          </div>
          <div>
            <h2>{patient.fullName}</h2>
            <p>Medical ID: {patient.medicalId}</p>
          </div>
        </div>

        <div className="emergency-blood-group">
          <span>Blood group</span>
          <strong>{patient.bloodGroup || "Unknown"}</strong>
        </div>

        <section className="emergency-info-section">
          <h3>
            <AlertTriangle size={19} /> Allergies
          </h3>
          {patient.allergies?.length ? (
            <ul>
              {patient.allergies.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No allergies listed in the profile.</p>
          )}
        </section>

        <section className="emergency-info-section">
          <h3>
            <HeartPulse size={19} /> Medical conditions
          </h3>
          {patient.medicalConditions?.length ? (
            <ul>
              {patient.medicalConditions.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No medical conditions listed.</p>
          )}
        </section>

        <section className="emergency-info-section">
          <h3>
            <Pill size={19} /> Current medications
          </h3>
          {patient.medications?.length ? (
            <ul>
              {patient.medications.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>No medications listed.</p>
          )}
        </section>

        <section className="emergency-info-section">
          <h3>
            <Phone size={19} /> Emergency contacts
          </h3>
          {contacts.length ? (
            contacts.map((contact, index) => (
              <div
                className="emergency-contact"
                key={`${contact.phone}-${index}`}
              >
                <strong>{contact.name}</strong>
                <p>{contact.relationship || "Relationship not specified"}</p>
                <a href={`tel:${contact.phone}`}>
                  Call {contact.phone}
                </a>
              </div>
            ))
          ) : (
            <p>No emergency contacts listed.</p>
          )}
        </section>

        <p className="emergency-disclaimer">
          This profile is provided for emergency reference only.
          Verify information when possible. Do not use this page as a
          substitute for professional medical assessment.
        </p>

        <Link to="/" className="secondary-button">
          <ArrowLeft size={17} /> Return to home
        </Link>
      </section>
    </main>
  );
}

export default EmergencyPage;
