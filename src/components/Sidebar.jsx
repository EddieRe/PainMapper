export default function Sidebar({
  selectedZone,
  differentialDiagnoses,
  showDebugNodes,
  loading,
  dataError,
  locationCount,
  pathologyCount,
  onShowDebugNodesChange,
}) {
  return (
    <aside className="sidebar">
      <h1>Pain Mapper</h1>

      <section className="sidebar-card">
        <span className="card-label">
          Selected location
        </span>

        <strong className="card-value">
          {selectedZone?.locationName ?? 'None'}
        </strong>

        {selectedZone && (
          <span className="card-secondary">
            {selectedZone.region}
          </span>
        )}
      </section>

      <section className="sidebar-card">
        <span className="card-label">
          Top differential diagnoses
        </span>

        {loading && (
          <p className="empty-message">
            Loading pathology data…
          </p>
        )}

        {!loading && dataError && (
          <p className="error-message">
            Data could not be loaded: {dataError}
          </p>
        )}

        {!loading
          && !dataError
          && !selectedZone && (
            <p className="empty-message">
              Select an anatomical location to view the
              differential.
            </p>
          )}

        {!loading
          && !dataError
          && selectedZone
          && differentialDiagnoses.length === 0 && (
            <p className="empty-message">
              No pathologies are currently mapped to this
              location.
            </p>
          )}

        {!loading
          && !dataError
          && differentialDiagnoses.length > 0 && (
            <ol className="differential-list">
              {differentialDiagnoses.map((pathology) => (
                <li key={pathology.name}>
                  <span className="diagnosis-name">
                    {pathology.name}
                  </span>
                </li>
              ))}
            </ol>
          )}
      </section>

      <section className="sidebar-card">
        <span className="card-label">
          Debug display
        </span>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={showDebugNodes}
            onChange={(event) =>
              onShowDebugNodesChange(
                event.target.checked,
              )
            }
          />

          <span className="checkbox-control" />

          <span className="checkbox-text">
            Show anatomical nodes
          </span>
        </label>

        <p className="debug-description">
          When hidden, nodes remain clickable and appear
          only while the pointer is hovering over them.
        </p>
      </section>

      {!loading && !dataError && (
        <section className="data-summary">
          <span>
            {locationCount} anatomical locations loaded
          </span>

          <span>
            {pathologyCount} pathology records loaded
          </span>
        </section>
      )}

      <footer className="sidebar-footer">
        <p className="disclaimer-title">
          Educational use only.
        </p>

        <p className="disclaimer-text">
          This application is intended for medical education and
          should not be used to make clinical diagnoses or replace
          evaluation by a qualified healthcare professional.
        </p>

        <p className="credits-text">
          Jon Russell and Eddie Re | 2026
        </p>

        <p className="contact-text">
          Questions:{' '}
          <a href="mailto:ree@chop.edu">
            ree@chop.edu
          </a>
        </p>
      </footer>
    </aside>
  )
}