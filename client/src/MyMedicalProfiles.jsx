import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  HeartPulse,
  QrCode,
  Plus,
  RefreshCw,
  ArrowLeft,
  Pencil,
  X,
  Save,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import "./MyMedicalProfiles.css";

const API_URL = "http://localhost:5000";

const emptyForm = {
  fullName: "",
  dateOfBirth: "",
  bloodGroup: "",
  allergies: "",
  medicalConditions: "",
  medications: "",
  emergencyContacts: "",
};

export default function MyMedicalProfiles() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPatient, setEditingPatient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");

  // Load profiles belonging to the signed-in user
  async function loadProfiles() {
    setLoading(true);
    setError("");

    try {
      const response = await axios.get(
        `${API_URL}/api/patients/my`,
        { withCredentials: true }
      );

      setPatients(response.data.patients || []);
    } catch (err) {
      setError(
        err.response?.status === 401
          ? "Please sign in to view your medical profiles."
          : err.response?.data?.message ||
              "Could not load your profiles. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  // Open the edit form
  function startEditing(patient) {
    setEditingPatient(patient);

    setForm({
      fullName: patient.fullName || "",
      dateOfBirth: patient.dateOfBirth
        ? String(patient.dateOfBirth).slice(0, 10)
        : "",
      bloodGroup: patient.bloodGroup || "",
      allergies: Array.isArray(patient.allergies)
        ? patient.allergies.join(", ")
        : patient.allergies || "",
      medicalConditions: Array.isArray(patient.medicalConditions)
        ? patient.medicalConditions.join(", ")
        : patient.medicalConditions || "",
      medications: Array.isArray(patient.medications)
        ? patient.medications.join(", ")
        : patient.medications || "",
      emergencyContacts: Array.isArray(patient.emergencyContacts)
        ? patient.emergencyContacts
            .map((contact) =>
              typeof contact === "string"
                ? contact
                : JSON.stringify(contact)
            )
            .join("\n")
        : "",
    });

    setFormError("");
    setSuccess("");
    setError("");
  }

  // Close the edit form
  function closeEditor() {
    setEditingPatient(null);
    setForm(emptyForm);
    setFormError("");
  }

  // Handle form input changes
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Convert comma-separated values into arrays
  function toList(value) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  // Update a medical profile
  async function handleSave(event) {
    event.preventDefault();
    setFormError("");
    setSuccess("");

    if (!form.fullName.trim()) {
      setFormError("Full name is required.");
      return;
    }

    const payload = {
      fullName: form.fullName.trim(),
      bloodGroup: form.bloodGroup,
      allergies: toList(form.allergies),
      medicalConditions: toList(form.medicalConditions),
      medications: toList(form.medications),
    };

    if (form.dateOfBirth) {
      payload.dateOfBirth = form.dateOfBirth;
    }

    if (form.emergencyContacts.trim()) {
      try {
        payload.emergencyContacts = form.emergencyContacts
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return line;
            }
          });
      } catch {
        setFormError("Please check the emergency contact details.");
        return;
      }
    } else {
      payload.emergencyContacts = [];
    }

    setSaving(true);

    try {
      const response = await axios.put(
        `${API_URL}/api/patients/${encodeURIComponent(
          editingPatient.medicalId
        )}`,
        payload,
        { withCredentials: true }
      );

      const updatedPatient = response.data.patient;

      setPatients((previous) =>
        previous.map((patient) =>
          patient.medicalId === updatedPatient.medicalId
            ? updatedPatient
            : patient
        )
      );

      setEditingPatient(null);
      setForm(emptyForm);
      setSuccess("Medical profile updated successfully.");
    } catch (err) {
      setFormError(
        err.response?.data?.message ||
          "Could not update the medical profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  // Delete a medical profile
  async function handleDelete(patient) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete the medical profile for ${patient.fullName}?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(patient.medicalId);
    setError("");
    setSuccess("");

    try {
      await axios.delete(
        `${API_URL}/api/patients/${encodeURIComponent(
          patient.medicalId
        )}`,
        { withCredentials: true }
      );

      setPatients((previous) =>
        previous.filter(
          (item) => item.medicalId !== patient.medicalId
        )
      );

      if (editingPatient?.medicalId === patient.medicalId) {
        closeEditor();
      }

      setSuccess(
        `Medical profile for ${patient.fullName} deleted successfully.`
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not delete the medical profile. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="my-profiles-page">
      <header className="my-profiles-header">
        <Link to="/" className="my-profiles-back">
          <ArrowLeft size={18} />
          Home
        </Link>

        <div className="my-profiles-title">
          <span className="my-profiles-icon">
            <HeartPulse size={26} />
          </span>

          <div>
            <h1>My Medical Profiles</h1>
            <p>View and manage your saved MediResQ medical IDs.</p>
          </div>
        </div>

        <Link
          to="/create-medical-id"
          className="my-profiles-create"
        >
          <Plus size={18} />
          Create Medical ID
        </Link>
      </header>

      {success && (
        <div className="my-profiles-success" role="status">
          {success}
        </div>
      )}

      {!loading && error && (
        <div className="my-profiles-error" role="alert">
          <p>{error}</p>

          {error.toLowerCase().includes("sign in") ? (
            <Link to="/login">Sign in</Link>
          ) : (
            <button onClick={loadProfiles} type="button">
              Try again
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="my-profiles-message">
          <RefreshCw
            size={20}
            className="my-profiles-spinner"
          />
          Loading your profiles...
        </div>
      )}

      {!loading && !error && patients.length === 0 && (
        <section className="my-profiles-empty">
          <HeartPulse size={42} />
          <h2>No medical profiles yet</h2>
          <p>
            Create your first profile to generate a MediResQ Medical ID.
          </p>

          <Link
            to="/create-medical-id"
            className="my-profiles-create"
          >
            <Plus size={18} />
            Create your first profile
          </Link>
        </section>
      )}

      {!loading && !error && patients.length > 0 && (
        <>
          <p className="my-profiles-count">
            {patients.length}{" "}
            {patients.length === 1 ? "profile" : "profiles"} found
          </p>

          <section className="my-profiles-grid">
            {patients.map((patient) => {
              const emergencyUrl =
                `${window.location.origin}/emergency/` +
                encodeURIComponent(patient.medicalId);

              const isDeleting =
                deletingId === patient.medicalId;

              return (
                <article
                  className="my-profile-card"
                  key={patient._id || patient.medicalId}
                >
                  <div className="my-profile-card-heading">
                    <span className="my-profile-card-icon">
                      <HeartPulse size={22} />
                    </span>

                    <div>
                      <h2>{patient.fullName}</h2>
                      <p>Medical ID</p>
                    </div>
                  </div>

                  <div className="my-profile-details">
                    <div>
                      <span>Blood group</span>
                      <strong>
                        {patient.bloodGroup || "Unknown"}
                      </strong>
                    </div>

                    <div>
                      <span>Allergies</span>
                      <strong>
                        {patient.allergies?.length
                          ? patient.allergies.join(", ")
                          : "None listed"}
                      </strong>
                    </div>

                    <div>
                      <span>Medical ID</span>
                      <strong className="my-profile-id">
                        {patient.medicalId}
                      </strong>
                    </div>
                  </div>

                  <div className="my-profile-qr">
                    <QRCodeSVG
                      value={emergencyUrl}
                      size={140}
                      level="M"
                      title={`Emergency QR for ${patient.fullName}`}
                    />

                    <p>
                      <QrCode size={15} />
                      Emergency QR code
                    </p>
                  </div>

                  <div className="my-profile-actions">
                    <button
                      type="button"
                      className="my-profile-edit"
                      onClick={() => startEditing(patient)}
                      disabled={Boolean(deletingId)}
                    >
                      <Pencil size={16} />
                      Edit Profile
                    </button>

                    <a
                      className="my-profile-open"
                      href={emergencyUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open emergency page
                    </a>

                    <button
                      type="button"
                      className="my-profile-delete"
                      onClick={() => handleDelete(patient)}
                      disabled={Boolean(deletingId)}
                    >
                      {isDeleting ? (
                        <RefreshCw
                          size={16}
                          className="my-profiles-spinner"
                        />
                      ) : (
                        <Trash2 size={16} />
                      )}

                      {isDeleting
                        ? "Deleting..."
                        : "Delete Profile"}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}

      {editingPatient && (
        <div
          className="my-profile-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditor();
            }
          }}
        >
          <section
            className="my-profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="my-profile-modal-header">
              <div>
                <h2 id="edit-profile-title">
                  Edit Medical Profile
                </h2>
                <p>Update your medical information.</p>
              </div>

              <button
                type="button"
                className="my-profile-close"
                onClick={closeEditor}
                aria-label="Close edit form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <label>
                Full name *
                <input
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </label>

              <label>
                Date of birth
                <input
                  type="date"
                  name="dateOfBirth"
                  value={form.dateOfBirth}
                  onChange={handleChange}
                />
              </label>

              <label>
                Blood group
                <select
                  name="bloodGroup"
                  value={form.bloodGroup}
                  onChange={handleChange}
                >
                  <option value="">Select blood group</option>

                  {[
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
              </label>

              <label>
                Allergies
                <textarea
                  name="allergies"
                  value={form.allergies}
                  onChange={handleChange}
                  placeholder="Separate multiple items with commas"
                />
              </label>

              <label>
                Medical conditions
                <textarea
                  name="medicalConditions"
                  value={form.medicalConditions}
                  onChange={handleChange}
                  placeholder="Separate multiple items with commas"
                />
              </label>

              <label>
                Medications
                <textarea
                  name="medications"
                  value={form.medications}
                  onChange={handleChange}
                  placeholder="Separate multiple items with commas"
                />
              </label>

              <label>
                Emergency contacts
                <textarea
                  name="emergencyContacts"
                  value={form.emergencyContacts}
                  onChange={handleChange}
                  placeholder='One contact per line; JSON format, e.g. {"name":"Asha","phone":"9876543210","relationship":"Sister"}'
                />

                <small>
                  Keep the contact format expected by your existing
                  Patient schema.
                </small>
              </label>

              {formError && (
                <div className="my-profiles-error" role="alert">
                  {formError}
                </div>
              )}

              <div className="my-profile-modal-actions">
                <button
                  type="button"
                  className="my-profile-cancel"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="my-profile-save"
                  disabled={saving}
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}