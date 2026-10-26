
import { useState } from "react";
import {
  Hospital,
  MapPin,
  Navigation,
  ExternalLink,
  LoaderCircle,
  AlertCircle,
  Phone,
  Globe,
  ChevronDown,
  ChevronUp,
  Activity,
  Image as ImageIcon,
  Search,
} from "lucide-react";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const API_URL = "https://mediresq-apii.onrender.com";
const INITIAL_RADIUS_KM = 15;
const EXPANDED_RADIUS_KM = 20;
const INITIAL_LIMIT = 10;
const EXPANDED_LIMIT = 20;

const CATEGORIES = [
  {
    id: "small",
    title: "Small",
    subtitle: "Clinics and primary-care facilities",
  },
  {
    id: "medium",
    title: "Medium",
    subtitle: "General hospitals and urgent assessment",
  },
  {
    id: "large",
    title: "Large",
    subtitle: "Facilities with mapped advanced-care indicators",
  },
];

function getCategory(tags = {}) {
  const amenity = String(tags.amenity || "").toLowerCase();
  const healthcare = String(tags.healthcare || "").toLowerCase();

  const specialties = String(
    tags["healthcare:speciality"] ||
      tags["healthcare:specialty"] ||
      tags.medical_specialty ||
      ""
  ).toLowerCase();

  const beds = Number(tags.beds || tags["capacity:beds"] || 0);

  const advanced =
    tags.emergency === "yes" ||
    tags["healthcare:icu"] === "yes" ||
    tags["healthcare:surgery"] === "yes" ||
    tags["healthcare:trauma"] === "yes" ||
    tags["healthcare:blood_bank"] === "yes" ||
    beds >= 100 ||
    /intensive|trauma|surgery|cardiology|neurology|oncology/.test(
      specialties
    );

  if (
    ["clinic", "doctors", "dentist", "health_centre"].includes(amenity) ||
    ["clinic", "doctor", "dentist", "health_centre"].includes(healthcare)
  ) {
    return {
      id: "small",
      reason: "Mapped as a clinic or primary-care facility",
      confidence: "Map classification",
    };
  }

  if (amenity === "hospital" || healthcare === "hospital") {
    return advanced
      ? {
          id: "large",
          reason: "Advanced-care indicator is mapped",
          confidence: "Mapped indicator; verify with hospital",
        }
      : {
          id: "medium",
          reason: "Mapped as a hospital; advanced-care capability is unknown",
          confidence: "Map classification",
        };
  }

  return null;
}

function getDistanceKm(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const radius = 6371;
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildOverpassQuery(radiusMeters, latitude, longitude) {
  return `
    [out:json][timeout:30];
    (
      nwr["amenity"~"^(hospital|clinic|doctors|health_centre|dentist)$"]
        (around:${radiusMeters},${latitude},${longitude});
      nwr["healthcare"~"^(hospital|clinic|doctor|health_centre|dentist)$"]
        (around:${radiusMeters},${latitude},${longitude});
    );
    out center tags;
  `;
}

async function fetchFromOverpass(query) {
  let lastError;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          Accept: "application/json",
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(35000),
      });

      if (!response.ok) {
        lastError = new Error(`Map service returned HTTP ${response.status}`);

        if ([429, 502, 503, 504].includes(response.status)) {
          continue;
        }

        throw lastError;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    lastError?.name === "TimeoutError"
      ? "All public map services timed out. Please retry later."
      : lastError?.message || "Public map services are unavailable."
  );
}

function getFacilityImage(tags = {}) {
  const image = tags.image || tags["contact:image"] || "";
  return /^https?:\/\//i.test(image) ? image : null;
}

function NearbyHospitals({ location }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [selectedHospital, setSelectedHospital] = useState(null);
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");

  const [discovery, setDiscovery] = useState(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [discoveryError, setDiscoveryError] = useState("");

  const [radiusKm, setRadiusKm] = useState(INITIAL_RADIUS_KM);
  const [resultLimit, setResultLimit] = useState(INITIAL_LIMIT);

  async function runHospitalSearch(nextRadiusKm, nextLimit) {
    if (!location) {
      setError("Detect your current location first.");
      return;
    }

    setLoading(true);
    setError("");
    setHospitals([]);
    setSearched(false);
    setSelectedHospital(null);
    setDetails(null);
    setDiscovery(null);

    try {
      const query = buildOverpassQuery(
        nextRadiusKm * 1000,
        location.latitude,
        location.longitude
      );

      const data = await fetchFromOverpass(query);

      const results = (data.elements || [])
        .map((item) => {
          const tags = item.tags || {};
          const latitude = item.lat ?? item.center?.lat;
          const longitude = item.lon ?? item.center?.lon;

          if (latitude == null || longitude == null) return null;

          const classification = getCategory(tags);
          if (!classification) return null;

          const distance = getDistanceKm(
            location.latitude,
            location.longitude,
            latitude,
            longitude
          );

          if (distance > nextRadiusKm) return null;

          return {
            id: `${item.type}-${item.id}`,
            osmType: item.type,
            osmId: String(item.id),
            name: tags.name || "Unnamed medical facility",
            type:
              tags.amenity === "hospital" ||
              tags.healthcare === "hospital"
                ? "Hospital"
                : "Clinic / Health Centre",
            category: classification.id,
            categoryReason: classification.reason,
            categoryConfidence: classification.confidence,
            latitude,
            longitude,
            distance,
            address: [
              tags["addr:housenumber"],
              tags["addr:street"],
              tags["addr:suburb"],
              tags["addr:city"],
              tags["addr:state"],
              tags["addr:postcode"],
            ]
              .filter(Boolean)
              .join(", "),
            phone:
              tags["contact:phone"] ||
              tags.phone ||
              tags["contact:mobile"] ||
              null,
            website:
              tags["contact:website"] || tags.website || tags.url || null,
            imageUrl: getFacilityImage(tags),
            mappedTags: tags,
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance);

      const uniqueResults = [
        ...new Map(results.map((item) => [item.id, item])).values(),
      ];

      setHospitals(uniqueResults);
      setRadiusKm(nextRadiusKm);
      setResultLimit(nextLimit);
      setSearched(true);

      if (uniqueResults.length === 0) {
        setError(`No mapped facilities found within ${nextRadiusKm} km.`);
      }
    } catch (err) {
      setError(err.message || "Could not find nearby hospitals.");
    } finally {
      setLoading(false);
    }
  }

  async function openHospitalDetails(hospital) {
    setSelectedHospital(hospital);
    setDetails(null);
    setDiscovery(null);
    setDetailsError("");
    setDiscoveryError("");
    setDetailsLoading(true);
    setDiscoveryLoading(true);

    const detailsPromise = (async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/hospitals/${hospital.osmType}/${hospital.osmId}/details`,
          { signal: AbortSignal.timeout(20000) }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Could not load map details.");
        }

        setDetails({
          ...result.hospital,
          latitude: result.hospital.latitude ?? hospital.latitude,
          longitude: result.hospital.longitude ?? hospital.longitude,
          address: result.hospital.address || hospital.address || null,
          phone: result.hospital.phone || hospital.phone || null,
          website: result.hospital.website || hospital.website || null,
          imageUrl: result.hospital.imageUrl || hospital.imageUrl || null,
          categoryReason: hospital.categoryReason,
          categoryConfidence: hospital.categoryConfidence,
        });
      } catch (err) {
        setDetailsError(err.message || "Could not load map details.");
      } finally {
        setDetailsLoading(false);
      }
    })();

    const discoveryPromise = (async () => {
      try {
        const params = new URLSearchParams({
          name: hospital.name,
          state: "Madhya Pradesh",
        });

        const response = await fetch(
          `${API_URL}/api/hospitals/${hospital.osmType}/${hospital.osmId}/discover?${params}`,
          { signal: AbortSignal.timeout(20000) }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Public search failed.");
        }

        setDiscovery(result.hospital);
      } catch (err) {
        setDiscoveryError(
          err.name === "TimeoutError"
            ? "Public web search timed out."
            : err.message || "Public web search is unavailable."
        );
      } finally {
        setDiscoveryLoading(false);
      }
    })();

    await Promise.allSettled([detailsPromise, discoveryPromise]);
  }

  function getDirectionsUrl(hospital) {
    return (
      "https://www.google.com/maps/dir/?api=1" +
      `&origin=${location.latitude},${location.longitude}` +
      `&destination=${hospital.latitude},${hospital.longitude}` +
      "&travelmode=driving"
    );
  }

  return (
    <section className="nearby-hospitals">
      <div className="hospital-heading">
        <span className="hospital-icon">
          <Hospital size={23} />
        </span>
        <div>
          <h2>Nearby Hospitals</h2>
          <p>Discover mapped medical facilities near your location.</p>
        </div>
      </div>

      <button
        type="button"
        className="primary-button hospital-search-button"
        onClick={() => runHospitalSearch(INITIAL_RADIUS_KM, INITIAL_LIMIT)}
        disabled={loading || !location}
      >
        {loading ? (
          <LoaderCircle size={18} className="hospital-spinner" />
        ) : (
          <Search size={18} />
        )}
        {loading ? "Searching..." : "Find Hospitals Within 15 km"}
      </button>

      {!location && (
        <p className="hospital-hint">
          Detect your location in the Emergency Location section first.
        </p>
      )}

      {error && (
        <p className="hospital-error" role="alert">
          <AlertCircle size={17} /> {error}
        </p>
      )}

      {searched && (
        <>
          <p className="hospital-hint">
            {hospitals.length} mapped facilities found within {radiusKm} km.
            Category labels are provisional and do not confirm clinical capability.
          </p>

          <div className="hospital-category-grid">
            {CATEGORIES.map((category) => {
              const items = hospitals
                .filter((hospital) => hospital.category === category.id)
                .slice(0, resultLimit);

              return (
                <section className="hospital-category" key={category.id}>
                  <div className="hospital-category-heading">
                    <div>
                      <h3>{category.title}</h3>
                      <p>{category.subtitle}</p>
                    </div>
                    <span>
                      {items.length}/{resultLimit}
                    </span>
                  </div>

                  {items.length === 0 ? (
                    <p className="hospital-hint">No mapped facilities found.</p>
                  ) : (
                    <div className="hospital-list">
                      {items.map((hospital) => (
                        <button
                          type="button"
                          className={`hospital-list-item ${
                            selectedHospital?.id === hospital.id
                              ? "selected"
                              : ""
                          }`}
                          key={hospital.id}
                          onClick={() => openHospitalDetails(hospital)}
                        >
                          <span className="hospital-result-icon">
                            <Hospital size={20} />
                          </span>
                          <span className="hospital-list-info">
                            <strong>{hospital.name}</strong>
                            <small>
                              {hospital.type} · {hospital.distance.toFixed(2)} km
                            </small>
                          </span>
                          {selectedHospital?.id === hospital.id ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {radiusKm < EXPANDED_RADIUS_KM && (
            <button
              type="button"
              className="secondary-button hospital-more-button"
              disabled={loading}
              onClick={() =>
                runHospitalSearch(EXPANDED_RADIUS_KM, EXPANDED_LIMIT)
              }
            >
              {loading ? (
                <LoaderCircle size={17} className="hospital-spinner" />
              ) : (
                <MapPin size={17} />
              )}
              {loading ? "Searching..." : "More — Search up to 20 km"}
            </button>
          )}
        </>
      )}

      {selectedHospital && (
        <section className="hospital-details-panel" aria-live="polite">
          <div className="hospital-details-title">
            <div>
              <span className="eyebrow">SELECTED FACILITY</span>
              <h3>{selectedHospital.name}</h3>
              <p>
                {selectedHospital.distance.toFixed(2)} km straight-line distance
              </p>
            </div>
            <Hospital size={27} />
          </div>

          {detailsLoading && (
            <p className="hospital-hint">
              <LoaderCircle size={17} className="hospital-spinner" />
              Loading mapped details...
            </p>
          )}

          {detailsError && (
            <p className="hospital-error" role="alert">
              <AlertCircle size={17} /> {detailsError}
            </p>
          )}

          {details && (
            <>
              {details.imageUrl ? (
                <div className="hospital-image-wrap">
                  <img
                    src={details.imageUrl}
                    alt={`Public map image for ${selectedHospital.name}`}
                    loading="lazy"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <small>
                    <ImageIcon size={13} /> Image listed in map data
                  </small>
                </div>
              ) : (
                <p className="hospital-hint">
                  No image URL is listed in OpenStreetMap.
                </p>
              )}

              <div className="hospital-detail-grid">
                <div>
                  <MapPin size={18} />
                  <strong>Address</strong>
                  <p>{details.address || "Not available in map data"}</p>
                </div>

                <div>
                  <Phone size={18} />
                  <strong>Contact number</strong>
                  {details.phone ? (
                    <p>
                      <a href={`tel:${details.phone}`}>{details.phone}</a>
                    </p>
                  ) : (
                    <p>Not available in map data</p>
                  )}
                </div>

                <div>
                  <Globe size={18} />
                  <strong>Website</strong>
                  {details.website &&
                  /^https?:\/\//i.test(details.website) ? (
                    <p>
                      <a
                        href={details.website}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit website <ExternalLink size={14} />
                      </a>
                    </p>
                  ) : (
                    <p>Not available in map data</p>
                  )}
                </div>

                <div>
                  <Activity size={18} />
                  <strong>Mapped facilities and services</strong>
                  {Object.keys(details.facilities || {}).length > 0 ? (
                    <ul>
                      {Object.entries(details.facilities).map(([key, value]) => (
                        <li key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No services mapped in OpenStreetMap.</p>
                  )}
                </div>

                <div>
                  <Activity size={18} />
                  <strong>Category evidence</strong>
                  <p>
                    {details.categoryReason || "No evidence available."}
                  </p>
                  <small>
                    {details.categoryConfidence || "Provisional"}
                  </small>
                </div>
              </div>

              <p className="hospital-hint">
                Source: {details.dataSource || "OpenStreetMap"}. Last checked:{" "}
                {details.lastChecked
                  ? new Date(details.lastChecked).toLocaleString()
                  : "not provided"}
                . Live bed availability is not verified.
              </p>
            </>
          )}

          
<div className="hospital-web-discovery">
  <h3>
    <Search size={18} /> Contact & Website
  </h3>

  {discoveryLoading && (
    <p className="hospital-hint">
      <LoaderCircle size={16} className="hospital-spinner" />
      Searching...
    </p>
  )}

  {discoveryError && (
    <p className="hospital-hint">Public search unavailable.</p>
  )}

  {!discoveryLoading && discovery && (
    <>
      {discovery.contactCandidates?.length > 0 && (
        <p>
          <Phone size={16} />{" "}
          {discovery.contactCandidates
            .slice(0, 2)
            .map((contact) => contact.phone)
            .filter(Boolean)
            .join(" · ") || "No contact found"}
        </p>
      )}

      {discovery.websiteCandidates?.length > 0 && (
        <p>
          <Globe size={16} />{" "}
          <a
            href={discovery.websiteCandidates[0].url}
            target="_blank"
            rel="noreferrer"
          >
            {discovery.websiteCandidates[0].title || "Website"}
            <ExternalLink size={13} />
          </a>
        </p>
      )}

      {!discovery.contactCandidates?.length &&
        !discovery.websiteCandidates?.length && (
          <p className="hospital-hint">No public details found.</p>
        )}
    </>
  )}
</div>


          <div className="hospital-detail-actions">
            <a
              className="secondary-button"
              href={getDirectionsUrl(selectedHospital)}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation size={17} /> Get Directions{" "}
              <ExternalLink size={15} />
            </a>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                setSelectedHospital(null);
                setDetails(null);
                setDiscovery(null);
                setDetailsError("");
                setDiscoveryError("");
              }}
            >
              Close Details
            </button>
          </div>

          <p className="hospital-disclaimer">
            Public information may be incomplete or outdated. Confirm contact
            details and services directly with the facility during an emergency.
          </p>
        </section>
      )}

      <p className="hospital-disclaimer">
        Categories are provisional map classifications, not medical triage.
        A name or photo alone does not establish ICU, surgery, or trauma-care
        capability. Directions open Google Maps; live traffic ETA is not calculated.
      </p>
    </section>
  );
}

export default NearbyHospitals;
