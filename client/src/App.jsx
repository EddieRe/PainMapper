import { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3001";

export default function App() {
  const [regions, setRegions] = useState([]);
  const [region, setRegion] = useState("Knee");
  const [locations, setLocations] = useState([]);

  const [location1, setLocation1] = useState("");

  const [age, setAge] = useState(14);
  const [mechanism, setMechanism] = useState("atraumatic");
  const [swelling, setSwelling] = useState("mild");

  const [results, setResults] = useState([]);
  const selectedLocations = useMemo(
    () => (location1 ? [location1] : []),
    [location1]
  );

  // load regions
  useEffect(() => {
    fetch(`${API_BASE}/regions`)
      .then((r) => r.json())
      .then((data) => setRegions(data.regions || []))
      .catch(() => setRegions([]));
  }, []);

  // load locations for region
  useEffect(() => {
    if (!region) return;
    fetch(`${API_BASE}/locations?region=${encodeURIComponent(region)}`)
      .then((r) => r.json())
      .then((data) => setLocations(data.locations || []))
      .catch(() => setLocations([]));
  }, [region]);

  async function runDifferential() {
    const payload = {
      age,
      mechanism,
      swelling,
      selectedLocations,
    };

    const r = await fetch(`${API_BASE}/differential`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    setResults(data.results || []);
  }

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 16, maxWidth: 1000 }}>
      <h1>Pain Differential MVP</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <h2>Inputs</h2>

          <label>
            Region:
            <select
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setLocation1("");
              }}
              style={{ marginLeft: 8 }}
            >
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div style={{ marginTop: 12 }}>
            <div>
              Location:
              <select value={location1} onChange={(e) => setLocation1(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="">(none)</option>
                {locations.map((l) => (
                  <option key={l.name} value={l.name}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div style={{ marginTop: 12 }}>
            <div>
              Age:
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ marginLeft: 8, width: 80 }}
              />
            </div>

            <div style={{ marginTop: 8 }}>
              Mechanism:
              <select value={mechanism} onChange={(e) => setMechanism(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="traumatic">traumatic</option>
                <option value="atraumatic">atraumatic</option>
                <option value="unknown">unknown</option>
              </select>
            </div>

            <div style={{ marginTop: 8 }}>
              Swelling:
              <select value={swelling} onChange={(e) => setSwelling(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="none">none</option>
                <option value="mild">mild</option>
                <option value="moderate">moderate</option>
                <option value="severe">severe</option>
                <option value="unknown">unknown</option>
              </select>
            </div>
          </div>

          <button onClick={runDifferential} style={{ marginTop: 12, padding: "8px 12px" }}>
            Run differential
          </button>

          <div style={{ marginTop: 12 }}>
            <strong>Selected Location:</strong> {location1 || "(none)"}
          </div>
        </div>

        <div style={{ border: "1px solid #ccc", padding: 12 }}>
          <h2>Results (Top 20)</h2>
          {results.length === 0 ? (
            <div>No results yet. Click "Run differential".</div>
          ) : (
            <ol>
              {results.map((r) => (
                <li key={r.name} style={{ marginBottom: 10 }}>
                  <div>
                    <strong>{r.name}</strong> — score {r.score}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>
                    <div>
                      <strong>matches:</strong> {r.location.matches.join(", ") || "(none)"}
                    </div>
                    <div>
                      <strong>misses:</strong> {r.location.misses.join(", ") || "(none)"}
                    </div>
                    <div>
                      <strong>why:</strong>
                      <ul style={{ marginTop: 4 }}>
                        {r.why.map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
