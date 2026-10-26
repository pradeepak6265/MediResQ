import { useState } from "react";
import {
  MapPin,
  Navigation,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

function EmergencyLocation({ onLocationDetected }) {
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function detectLocation() {
    setError("");

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const detectedLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };

        setLocation(detectedLocation);
        onLocationDetected?.(detectedLocation);
        setLoading(false);
      },
      (err) => {
        const messages = {
          1: "Location permission denied. Allow location access in your browser.",
          2: "Your current location is unavailable. Check your device location settings.",
          3: "Location request timed out. Please try again.",
        };

        setError(
          messages[err.code] || "Could not detect your location."
        );
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }

  const mapsUrl = location
    ? `https://www.google.com/maps?q=${location.latitude},${location.longitude}`
    : "";

  return (
    <section className="location-card">
      <div className="location-heading">
        <span className="location-icon">
          <MapPin size={23} />
        </span>

        <div>
          <h2>Emergency Location</h2>
          <p>Detect your current location with your permission.</p>
        </div>
      </div>

      <button
        type="button"
        className="primary-button"
        onClick={detectLocation}
        disabled={loading}
      >
        <Navigation size={18} />
        {loading ? "Detecting location..." : "Detect My Location"}
      </button>

      {error && (
        <p className="location-error" role="alert">
          <AlertCircle size={17} />
          {error}
        </p>
      )}

      {location && (
        <div className="location-result" aria-live="polite">
          <h3>Location detected</h3>

          <p>
            <strong>Latitude:</strong>{" "}
            {location.latitude.toFixed(6)}
          </p>

          <p>
            <strong>Longitude:</strong>{" "}
            {location.longitude.toFixed(6)}
          </p>

          <p>
            <strong>Accuracy:</strong> approximately{" "}
            {Math.round(location.accuracy)} metres
          </p>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="secondary-button"
          >
            <ExternalLink size={17} />
            Open in Google Maps
          </a>
        </div>
      )}

      <p className="location-disclaimer">
        Location is requested only when you click the button.
        Coordinates are kept in the current frontend session and
        are not sent to the backend by this component.
      </p>
    </section>
  );
}

export default EmergencyLocation;
