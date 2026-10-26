
const express = require("express");
const router = express.Router();

const OSM_API = "https://api.openstreetmap.org/api/0.6";
const ALLOWED_TYPES = new Set(["node", "way", "relation"]);

function cleanText(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function extractResults(html) {
  const results = [];
  const blocks = html.match(
    /<div[^>]*class="[^"]*result results_links[^"]*"[\s\S]*?(?=<div[^>]*class="[^"]*result results_links|<\/body>|$)/gi
  ) || [];

  for (const block of blocks) {
    const match = block.match(
      /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i
    );

    if (!match) continue;

    let url = match[1].replace(/&amp;/g, "&");

    try {
      const parsed = new URL(url, "https://duckduckgo.com");
      const redirected = parsed.searchParams.get("uddg");
      if (redirected) url = decodeURIComponent(redirected);
    } catch {
      continue;
    }

    if (!/^https?:\/\//i.test(url)) continue;

    let hostname;
    try {
      hostname = new URL(url).hostname;
    } catch {
      continue;
    }

    if (/duckduckgo\.com$/i.test(hostname)) continue;

    const title = cleanText(match[2]);
    const snippetMatch = block.match(
      /class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i
    );

    const snippet = snippetMatch
      ? cleanText(snippetMatch[1])
      : "";

    if (title && !results.some((item) => item.url === url)) {
      results.push({ title, url, snippet });
    }
  }

  return results.slice(0, 8);
}

function extractPhones(text = "") {
  const matches =
    text.match(/(?:\+?91[\s.-]?)?(?:\d[\s.-]?){10,12}/g) || [];

  return [...new Set(
    matches
      .map((phone) => phone.trim())
      .filter((phone) => {
        const digits = phone.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      })
  )].slice(0, 5);
}

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      "User-Agent": "MediResQ/1.0",
      Accept: "application/json,text/html,*/*",
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
}

// Existing OpenStreetMap details endpoint
router.get("/:osmType/:osmId/details", async (req, res) => {
  const { osmType, osmId } = req.params;

  if (
    !ALLOWED_TYPES.has(osmType) ||
    !/^\d+$/.test(osmId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid OpenStreetMap element identifier.",
    });
  }

  try {
    const response = await fetchWithTimeout(
      `${OSM_API}/${osmType}/${osmId}.json`
    );

    if (!response.ok) {
      return res.status(response.status === 404 ? 404 : 502).json({
        success: false,
        message: "OpenStreetMap service could not return this facility.",
        reason: `HTTP ${response.status}`,
      });
    }

    const data = await response.json();
    const item = data.elements?.[0];

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Hospital details were not found.",
      });
    }

    const tags = item.tags || {};
    const facilities = {};

    const facilityKeys = [
      "amenity",
      "healthcare",
      "healthcare:speciality",
      "healthcare:specialty",
      "emergency",
      "healthcare:icu",
      "healthcare:blood_bank",
      "healthcare:ambulance",
      "healthcare:surgery",
      "healthcare:diagnostic",
      "healthcare:laboratory",
      "healthcare:radiology",
      "healthcare:department",
      "beds",
      "capacity:beds",
      "opening_hours",
      "wheelchair",
      "operator",
    ];

    for (const key of facilityKeys) {
      if (tags[key] !== undefined) {
        facilities[key] = tags[key];
      }
    }

    const address = [
      tags["addr:housenumber"],
      tags["addr:street"],
      tags["addr:suburb"],
      tags["addr:city"],
      tags["addr:state"],
      tags["addr:postcode"],
    ].filter(Boolean).join(", ");

    return res.json({
      success: true,
      hospital: {
        osmType,
        osmId,
        name: tags.name || "Unnamed medical facility",
        address: address || null,
        phone:
          tags["contact:phone"] ||
          tags.phone ||
          tags["contact:mobile"] ||
          null,
        website:
          tags["contact:website"] ||
          tags.website ||
          tags.url ||
          null,
        imageUrl: tags.image || tags["contact:image"] || null,
        latitude: item.lat ?? item.center?.lat ?? null,
        longitude: item.lon ?? item.center?.lon ?? null,
        facilities,
        dataSource: "OpenStreetMap",
        sourceUrl: `https://www.openstreetmap.org/${osmType}/${osmId}`,
        lastChecked: new Date().toISOString(),
        availabilityStatus: "Not verified in real time",
      },
    });
  } catch (error) {
    console.error("Hospital details lookup failed:", error.message);

    return res.status(502).json({
      success: false,
      message: "Could not retrieve hospital details.",
      reason:
        error.name === "TimeoutError"
          ? "OpenStreetMap request timed out."
          : "Network request failed.",
    });
  }
});

// Public web discovery for a selected hospital
router.get("/:osmType/:osmId/discover", async (req, res) => {
  const { osmType, osmId } = req.params;
  const name = String(req.query.name || "").trim();
  const city = String(req.query.city || "").trim();
  const state = String(
    req.query.state || "Madhya Pradesh"
  ).trim();

  if (
    !ALLOWED_TYPES.has(osmType) ||
    !/^\d+$/.test(osmId)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid OpenStreetMap element identifier.",
    });
  }

  if (name.length < 2 || name.length > 160) {
    return res.status(400).json({
      success: false,
      message: "A valid hospital name is required.",
    });
  }

  const query = [
    name,
    city,
    state,
    "hospital contact number official website",
  ].filter(Boolean).join(" ");

  const searchUrl =
    `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const response = await fetchWithTimeout(searchUrl);

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        message: "Public web search is unavailable.",
        reason: `HTTP ${response.status}`,
      });
    }

    const html = await response.text();
    const results = extractResults(html);

    const contactCandidates = [];

    for (const result of results) {
      const phones = extractPhones(
        `${result.title} ${result.snippet}`
      );

      for (const phone of phones) {
        contactCandidates.push({
          phone,
          sourceTitle: result.title,
          sourceUrl: result.url,
          verified: false,
        });
      }
    }

    return res.json({
      success: true,
      hospital: {
        name,
        searchQuery: query,
        searchProvider: "DuckDuckGo public HTML results",
        searchedAt: new Date().toISOString(),
        websiteCandidates: results.map((result) => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet || null,
          verifiedOfficialWebsite: false,
        })),
        contactCandidates: contactCandidates.slice(0, 8),
      },
      note:
        "Search results are unverified candidates. Confirm the hospital identity and contact details from the source before relying on them.",
    });
  } catch (error) {
    console.error("Public hospital discovery failed:", error.message);

    return res.status(502).json({
      success: false,
      message: "Could not discover public web results.",
      reason:
        error.name === "TimeoutError"
          ? "Public search timed out."
          : "Search request failed or was blocked.",
    });
  }
});

module.exports = router;
