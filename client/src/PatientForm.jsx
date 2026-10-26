import { useState } from "react";
import axios from "axios";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowLeft,
  HeartPulse,
  ShieldCheck,
  UserRound,
  Phone,
  Plus,
  CheckCircle2,
  Download,
  Printer,
  Copy,
  QrCode,
} from "lucide-react";

const API_URL = "http://localhost:5000";

const initialForm = {
  fullName: "",
  dateOfBirth: "",
  bloodGroup: "Unknown",
  allergies: "",
  medicalConditions: "",
  medications: "",
  contactName: "",
  relationship: "",
  contactPhone: "",
};

function PatientForm({ onBack }) {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdPatient, setCreatedPatient] = useState(null);
  const [copyMessage, setCopyMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function toList(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const emergencyContacts = [];

    if (form.contactName.trim() || form.contactPhone.trim()) {
      if (!form.contactName.trim() || !form.contactPhone.trim()) {
        setError(
          "Enter both the emergency contact name and phone number."
        );
        setLoading(false);
        return;
      }

      emergencyContacts.push({
        name: form.contactName.trim(),
        relationship: form.relationship.trim(),
        phone: form.contactPhone.trim(),
      });
    }

    try {
      const payload = {
        fullName: form.fullName.trim(),
        bloodGroup: form.bloodGroup,
        allergies: toList(form.allergies),
        medicalConditions: toList(form.medicalConditions),
        medications: toList(form.medications),
        emergencyContacts,
      };

      if (form.dateOfBirth) {
        payload.dateOfBirth = form.dateOfBirth;
      }

      const response = await axios.post(
        `${API_URL}/api/patients`,
        payload,
        { withCredentials: true }
      );

      setCreatedPatient(response.data.patient);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session is not valid. Please sign in again, then create your medical ID.");
      } else {
        setError(
          err.response?.data?.message ||
            "Could not save the profile. Check that the backend is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function copyMedicalId() {
    try {
      await navigator.clipboard.writeText(
        createdPatient.medicalId
      );
      setCopyMessage("Medical ID copied successfully.");
    } catch {
      setCopyMessage(
        "Copy failed. Please select and copy the Medical ID manually."
      );
    }
  }

  function downloadQRCode() {
    const svg = document.getElementById("mediresq-qr-code");

    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `MediResQ-${createdPatient.medicalId}.svg`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function printQRCode() {
    const svg = document.getElementById("mediresq-qr-code");

    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setCopyMessage(
        "Printing was blocked. Allow pop-ups and try again."
      );
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>MediResQ Emergency QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 35px;
              color: #163342;
            }
            svg {
              width: 260px;
              height: 260px;
              margin: 20px auto;
            }
            h1 { font-size: 24px; }
            p { overflow-wrap: anywhere; }
          </style>
        </head>
        <body>
          <h1>MediResQ</h1>
          <p>Emergency Medical ID</p>
          ${svgData}
          <p><strong>Medical ID:</strong></p>
          <p>${createdPatient.medicalId}</p>
          <p>Scan the QR code to open the linked profile page.</p>
          <script>
            window.onload = function() {
              window.print();
            };
          <\/script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  if (createdPatient) {
    const emergencyUrl =
      `${window.location.origin}/emergency/${encodeURIComponent(
        createdPatient.medicalId
      )}`;

    return (
      <main className="patient-page">
        <section className="patient-form-card success-card">
          <CheckCircle2 size={52} color="#27815c" />

          <h1>Profile created successfully</h1>

          <p>
            Your MediResQ medical profile has been saved.
          </p>

          <div className="medical-id-box">
            <span>YOUR MEDICAL ID</span>
            <strong>{createdPatient.medicalId}</strong>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={copyMedicalId}
          >
            <Copy size={17} />
            Copy Medical ID
          </button>

          {copyMessage && (
            <p role="status" className="qr-status-message">
              {copyMessage}
            </p>
          )}

          <div className="qr-code-section">
            <div className="form-section-title">
              <QrCode size={21} />
              <div>
                <h2>Your Emergency QR Code</h2>
                <p>
                  Scan this code to open the linked emergency profile
                  address.
                </p>
              </div>
            </div>

            <div className="qr-code-box">
              <QRCodeSVG
                id="mediresq-qr-code"
                value={emergencyUrl}
                size={220}
                level="H"
                marginSize={4}
                title="MediResQ Emergency QR Code"
              />
            </div>

            <p className="qr-url-note">
              The QR code currently contains the emergency page URL.
              The emergency page must be implemented before scanning
              can display the patient's medical information.
            </p>

            <div className="qr-action-buttons">
              <button
                type="button"
                className="primary-button"
                onClick={downloadQRCode}
              >
                <Download size={17} />
                Download QR Code
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={printQRCode}
              >
                <Printer size={17} />
                Print QR Code
              </button>
            </div>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={onBack}
          >
            <ArrowLeft size={17} />
            Return to home
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="patient-page">
      <div className="patient-page-heading">
        <button
          type="button"
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
          Back to home
        </button>

        <div className="eyebrow">
          <ShieldCheck size={16} />
          PRIVATE MEDICAL PROFILE
        </div>

        <h1>Create your medical ID</h1>

        <p>
          Add essential health information and an emergency contact.
          Enter only information you are comfortable storing.
        </p>
      </div>

      <form
        className="patient-form-card"
        onSubmit={handleSubmit}
      >
        <div className="form-section-title">
          <UserRound size={20} />
          <div>
            <h2>Personal information</h2>
            <p>Basic details for your medical profile.</p>
          </div>
        </div>

        <label htmlFor="fullName">Full name *</label>
        <input
          id="fullName"
          name="fullName"
          value={form.fullName}
          onChange={handleChange}
          placeholder="Enter full name"
          maxLength={100}
          autoComplete="name"
          required
        />

        <div className="form-grid">
          <div>
            <label htmlFor="dateOfBirth">Date of birth</label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={handleChange}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div>
            <label htmlFor="bloodGroup">Blood group</label>
            <select
              id="bloodGroup"
              name="bloodGroup"
              value={form.bloodGroup}
              onChange={handleChange}
            >
              {[
                "Unknown",
                "A+",
                "A-",
                "B+",
                "B-",
                "AB+",
                "AB-",
                "O+",
                "O-",
              ].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section-title">
          <HeartPulse size={20} />
          <div>
            <h2>Medical information</h2>
            <p>Separate multiple entries with commas.</p>
          </div>
        </div>

        <label htmlFor="allergies">Allergies</label>
        <input
          id="allergies"
          name="allergies"
          value={form.allergies}
          onChange={handleChange}
          placeholder="e.g. Peanuts, penicillin"
        />

        <label htmlFor="medicalConditions">
          Medical conditions
        </label>
        <input
          id="medicalConditions"
          name="medicalConditions"
          value={form.medicalConditions}
          onChange={handleChange}
          placeholder="e.g. Asthma, diabetes"
        />

        <label htmlFor="medications">Current medications</label>
        <input
          id="medications"
          name="medications"
          value={form.medications}
          onChange={handleChange}
          placeholder="e.g. Medication names"
        />

        <div className="form-section-title">
          <Phone size={20} />
          <div>
            <h2>Emergency contact</h2>
            <p>Optional, but useful in an emergency.</p>
          </div>
        </div>

        <label htmlFor="contactName">Contact name</label>
        <input
          id="contactName"
          name="contactName"
          value={form.contactName}
          onChange={handleChange}
          placeholder="Emergency contact's name"
          autoComplete="off"
        />

        <div className="form-grid">
          <div>
            <label htmlFor="relationship">Relationship</label>
            <input
              id="relationship"
              name="relationship"
              value={form.relationship}
              onChange={handleChange}
              placeholder="e.g. Parent"
            />
          </div>

          <div>
            <label htmlFor="contactPhone">Phone number</label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={handleChange}
              placeholder="Contact phone number"
              autoComplete="off"
            />
          </div>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="primary-button submit-button"
          disabled={loading}
        >
          {loading ? (
            "Saving profile..."
          ) : (
            <>
              <Plus size={18} />
              Create medical ID
            </>
          )}
        </button>

        <p className="form-disclaimer">
          <ShieldCheck size={15} />
          Sign in is required to save a medical profile. Use fictional test data while developing.
        </p>
      </form>
    </main>
  );
}
export default PatientForm;