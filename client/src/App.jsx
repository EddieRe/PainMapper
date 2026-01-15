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
  const [isLoading, setIsLoading] = useState(false);

  const selectedLocations = useMemo(
    () => (location1 ? [location1] : []),
    [location1]
  );

  const canRun = Boolean(location1) && !isLoading;

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
    if (!location1) return;

    setIsLoading(true);
    try {
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
    } finally {
      setIsLoading(false);
    }
  }

  // only show top 3
  const topResults = results.slice(0, 3);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f7f7f7",
      }}
    >
      <div
        style={{
          fontFamily: "Arial, sans-serif",
          padding: 24,
          width: "100%",
          maxWidth: 1000,
          backgroundColor: "#ffffff",
          border: "1px solid #ccc",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: 24 }}>
          Pediatric Pain Differential
        </h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* INPUTS */}
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
                <select
                  value={location1}
                  onChange={(e) => setLocation1(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="">(select one)</option>
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
                <select
                  value={mechanism}
                  onChange={(e) => setMechanism(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="traumatic">traumatic</option>
                  <option value="atraumatic">atraumatic</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>

              <div style={{ marginTop: 8 }}>
                Swelling:
                <select
                  value={swelling}
                  onChange={(e) => setSwelling(e.target.value)}
                  style={{ marginLeft: 8 }}
                >
                  <option value="none">none</option>
                  <option value="mild">mild</option>
                  <option value="moderate">moderate</option>
                  <option value="severe">severe</option>
                  <option value="unknown">unknown</option>
                </select>
              </div>
            </div>

            <button
              onClick={runDifferential}
              disabled={!canRun}
              style={{
                marginTop: 12,
                padding: "8px 12px",
                cursor: canRun ? "pointer" : "not-allowed",
                opacity: canRun ? 1 : 0.5,
              }}
              title={location1 ? "" : "Select a location to enable"}
            >
              {isLoading ? "Running..." : "Run differential"}
            </button>

            {!location1 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                Select a location to enable the differential.
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <strong>Selected Location:</strong> {location1 || "(none)"}
            </div>
          </div>

          {/* RESULTS */}
          <div style={{ border: "1px solid #ccc", padding: 12 }}>
            <h2>Results (Top 3)</h2>

            {topResults.length === 0 ? (
              <div>
                No results yet. Select a location, then click{" "}
                <strong>Run differential</strong>.
              </div>
            ) : (
              <ol style={{ paddingLeft: 18 }}>
                {topResults.map((r, index) => {
                  const isTop = index === 0;

                  return (
                    <li key={r.name} style={{ marginBottom: 14 }}>
                      <div
                        style={{
                          border: isTop ? "2px solid #222" : "1px solid #ddd",
                          backgroundColor: isTop ? "#f1f1f1" : "#ffffff",
                          padding: 10,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                          <div>
                            <strong style={{ fontSize: isTop ? 18 : 14 }}>
                              {index + 1}. {r.name}
                            </strong>
                            {isTop && (
                              <span style={{ marginLeft: 10, fontSize: 12 }}>
                                (most likely)
                              </span>
                            )}
                          </div>
                          <div style={{ whiteSpace: "nowrap" }}>
                            score <strong>{r.score}</strong>
                          </div>
                        </div>

                        <div style={{ fontSize: 13, marginTop: 8 }}>
                          <div>
                            <strong>matches:</strong>{" "}
                            {r.location.matches.join(", ") || "(none)"}
                          </div>
                          <div>
                            <strong>misses:</strong>{" "}
                            {r.location.misses.join(", ") || "(none)"}
                          </div>

                          <div style={{ marginTop: 6 }}>
                            <strong>why:</strong>
                            <ul style={{ marginTop: 4 }}>
                              {r.why.map((w, idx) => (
                                <li key={idx}>{w}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
