const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const app = express();
app.use(cors());
app.use(express.json());

// ----------------------------
// Helpers
// ----------------------------
function loadCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function toBool(value) {
  // handles TRUE/FALSE strings
  if (typeof value !== "string") return false;
  return value.trim().toLowerCase() === "true";
}

function normalizeSwelling(value) {
  if (!value) return "unknown";
  const v = value.trim().toLowerCase();
  if (["none", "mild", "moderate", "severe"].includes(v)) return v;
  return "unknown";
}

function swellingToOrdinal(s) {
  const map = { none: 0, mild: 1, moderate: 2, severe: 3 };
  return map[s] ?? null;
}

// ----------------------------
// Load data on startup
// ----------------------------
const dataDir = path.join(__dirname, "data");
const locationsPath = path.join(dataDir, "locations.csv");
const pathologiesPath = path.join(dataDir, "pathologies.csv");

const locationsRows = loadCsv(locationsPath);
const pathologiesRows = loadCsv(pathologiesPath);

// Build region list and location lookup
const regionsSet = new Set();
const locationsByName = new Map();

for (const row of locationsRows) {
  const name = (row.Name || "").trim();
  const region = (row.Region || "").trim();
  if (!name) continue;

  regionsSet.add(region);
  locationsByName.set(name, { name, region });
}

const regions = Array.from(regionsSet).filter(Boolean).sort();

// Normalize pathologies
const pathologies = pathologiesRows.map((row) => {
  const name = (row.Name || "").trim();
  const ageMin = Number(row["Age Minimum"]);
  const ageMax = Number(row["Age Maximum"]);
  const traumatic = toBool(row.Traumatic);
  const atraumatic = toBool(row.Atraumatic);
  const swelling = normalizeSwelling(row.Swelling);

  const locsRaw = [
    (row["Location 1"] || "").trim(),
    (row["Location 2"] || "").trim(),
    (row["Location 3"] || "").trim(),
  ];

  const locations = locsRaw.filter((x) => x);

  return {
    name,
    ageMin,
    ageMax,
    traumatic,
    atraumatic,
    swelling,
    locations,
  };
});

// ----------------------------
// Scoring
// ----------------------------
function scorePathology(p, input) {
  // input: { age, mechanism, swelling, selectedLocations }
  const reasons = [];

  // Age
  let ageScore = 0;
  if (Number.isFinite(input.age)) {
    if (input.age >= p.ageMin && input.age <= p.ageMax) {
      ageScore = 1;
      reasons.push(`age ${input.age} is within ${p.ageMin}-${p.ageMax}`);
    } else {
      ageScore = 0;
      reasons.push(`age ${input.age} is outside ${p.ageMin}-${p.ageMax}`);
    }
  } else {
    ageScore = 0.5;
    reasons.push("age not provided, treated as neutral");
  }

  // Mechanism
  let mechScore = 0.5;
  if (input.mechanism === "traumatic") {
    mechScore = p.traumatic ? 1 : 0;
    reasons.push(p.traumatic ? "traumatic matches" : "traumatic does not match");
  } else if (input.mechanism === "atraumatic") {
    mechScore = p.atraumatic ? 1 : 0;
    reasons.push(p.atraumatic ? "atraumatic matches" : "atraumatic does not match");
  } else {
    mechScore = 0.5;
    reasons.push("mechanism unknown, treated as neutral");
  }

  // Swelling
  let swellScore = 0.5;
  const uSwell = normalizeSwelling(input.swelling);
  if (uSwell === "unknown" || p.swelling === "unknown") {
    swellScore = 0.5;
    reasons.push("swelling unknown, treated as neutral");
  } else {
    const du = Math.abs(swellingToOrdinal(uSwell) - swellingToOrdinal(p.swelling));
    swellScore = Math.max(0, 1 - 0.5 * du);
    if (du === 0) reasons.push(`swelling matches (${uSwell})`);
    else reasons.push(`swelling differs (input ${uSwell} vs expected ${p.swelling})`);
  }

  // Location match (simple coverage)
  const selected = Array.isArray(input.selectedLocations) ? input.selectedLocations : [];
  const matches = selected.filter((loc) => p.locations.includes(loc));
  const locationScore = p.locations.length > 0 ? matches.length / p.locations.length : 0;
  reasons.push(`location matches: ${matches.length}/${p.locations.length}`);

  // Weighted total
  const total =
    0.3 * ageScore +
    0.3 * mechScore +
    0.15 * swellScore +
    0.25 * locationScore;

  return { total, reasons, matches, misses: p.locations.filter((l) => !matches.includes(l)) };
}

// ----------------------------
// API Endpoints
// ----------------------------

// quick test
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// list regions
app.get("/regions", (req, res) => {
  res.json({ regions });
});

// list locations (optionally by region)
app.get("/locations", (req, res) => {
  const region = (req.query.region || "").trim();
  const all = locationsRows
    .map((r) => ({ name: (r.Name || "").trim(), region: (r.Region || "").trim() }))
    .filter((x) => x.name);

  const filtered = region ? all.filter((x) => x.region === region) : all;
  filtered.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ locations: filtered });
});

// differential scoring
app.post("/differential", (req, res) => {
  const { age, mechanism, swelling, selectedLocations } = req.body || {};

  const input = {
    age: Number(age),
    mechanism: mechanism || "unknown",
    swelling: swelling || "unknown",
    selectedLocations: Array.isArray(selectedLocations) ? selectedLocations : [],
  };

  const results = pathologies
    .map((p) => {
      const s = scorePathology(p, input);
      return {
        name: p.name,
        score: Number(s.total.toFixed(4)),
        why: s.reasons,
        location: { matches: s.matches, misses: s.misses },
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 20); // top 20 for MVP

  res.json({ input, results, meta: { algorithmVersion: "v0.1.0" } });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});
