import { useEffect, useId, useRef, useState } from 'react'
import { PencilIcon, PinIcon } from './icons'

/*
 * The top of the information panel: which location is selected, in exact
 * anatomical terms with an ordinary-language line under it
 * ("Patella" / "Right kneecap · Front"), with the actions that change it.
 * Before a location is chosen it says how to choose one.
 */

function SideSwitch({ zone, counterpart, onChooseZone }) {
  // Patient's right first: that is where it appears in the front view.
  const choices = ['right', 'left']
    .map((side) => [zone, counterpart].find((choice) => choice?.side === side))
    .filter(Boolean)

  if (choices.length !== 2) return null

  return (
    <div
      className="side-switch"
      role="group"
      aria-label="Patient side"
    >
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          className="side-switch-option"
          aria-pressed={choice.id === zone.id}
          aria-label={choice.side === 'right' ? "Patient's right" : "Patient's left"}
          onClick={() => {
            if (choice.id !== zone.id) onChooseZone(choice, 'side')
          }}
        >
          {choice.side === 'right' ? 'Right' : 'Left'}
        </button>
      ))}
    </div>
  )
}

export default function LocationHeader({
  zone,
  subtitle,
  layout,
  dataStatus,
  modelUnavailable,
  nameRef,
  promptRef,
  leading,
  onChange,
  onClear,
  onOpenAbout,
}) {
  if (!zone) {
    let prompt = modelUnavailable
      ? 'Search for a location by name.'
      : 'Select a location on the body, or search.'

    if (dataStatus === 'loading') prompt = 'Loading locations…'
    if (dataStatus === 'error') prompt = 'Locations are unavailable until the data loads.'

    return (
      <div className="location-header is-empty">
        <h2
          ref={promptRef}
          className="location-prompt"
          tabIndex={-1}
        >
          {prompt}
        </h2>

        <p className="location-prompt-meta">
          Educational use
          <span aria-hidden="true"> · </span>
          <button
            type="button"
            className="link-button link-inline"
            onClick={() => onOpenAbout('purpose')}
          >
            About
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="location-header">
      {leading ?? (
        <span
          className="location-icon"
          aria-hidden="true"
        >
          <PinIcon size={layout === 'wide' ? 24 : 22} />
        </span>
      )}

      <div className="location-identity">
        <h2
          ref={nameRef}
          className="location-name"
          tabIndex={-1}
        >
          {zone.locationName}
        </h2>

        <p className="location-subtitle">{subtitle}</p>
      </div>

      <div className="location-actions">
        <button
          type="button"
          className="link-button change-location"
          aria-label="Change location"
          onClick={onChange}
        >
          {layout === 'wide' && <PencilIcon size={16} />}
          {layout === 'wide' ? 'Change location' : 'Change'}
        </button>

        {layout === 'wide' && (
          <button
            type="button"
            className="link-button clear-location"
            aria-label="Clear location"
            onClick={onClear}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// Adds the side only when two nearby options share a name.
function nearbyLabel(zone, options) {
  const sharesName = options.some(
    (other) => other.id !== zone.id && other.locationName === zone.locationName,
  )

  return sharesName
    ? `${zone.locationName} (${zone.side === 'left' ? 'left' : zone.side === 'right' ? 'right' : 'midline'})`
    : zone.locationName
}

/*
 * Locations at or next to the chosen spot, to correct a near miss. Closed by
 * default; the closest options show first, the rest on request.
 */
const NEARBY_SHOWN = 4

export function NearbyLocations({
  zone,
  spotOptions,
  counterpart,
  conditionCountFor,
  onChooseZone,
}) {
  const panelId = useId()
  const listRef = useRef(null)
  const revealRequested = useRef(false)
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const nearby = spotOptions.filter((option) => option.id !== zone.id)

  // A new spot starts with its closest options only; a new location also
  // closes the list. (Not remounting keeps the side switch, and its keyboard
  // focus, in place when only the side changes.)
  const spotKey = spotOptions.map((option) => option.id).join('|')
  const [seen, setSeen] = useState({ spotKey, name: zone.locationName })

  if (seen.spotKey !== spotKey || seen.name !== zone.locationName) {
    setSeen({ spotKey, name: zone.locationName })
    setShowAll(false)
    if (seen.name !== zone.locationName) setOpen(false)
  }
  const visible = showAll ? nearby : nearby.slice(0, NEARBY_SHOWN)
  const hiddenCount = nearby.length - visible.length

  // "+N more" disappears once pressed: hand focus to the first location it
  // revealed instead of letting it fall back to the page.
  useEffect(() => {
    if (!showAll || !revealRequested.current) return

    revealRequested.current = false
    listRef.current?.querySelectorAll('button')[NEARBY_SHOWN]?.focus()
  }, [showAll])

  if (nearby.length === 0 && !counterpart) return null

  return (
    <div className="nearby">
      <div className="nearby-row">
        {nearby.length > 0 ? (
          <button
            type="button"
            className="link-button nearby-toggle"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            Nearby locations
            <span className="nearby-count">{nearby.length}</span>
            <svg
              className={`icon nearby-chevron${open ? ' is-open' : ''}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        ) : <span />}

        {/* The same location on the patient's other side. */}
        {counterpart && (
          <SideSwitch
            zone={zone}
            counterpart={counterpart}
            onChooseZone={onChooseZone}
          />
        )}
      </div>

      <div
        ref={listRef}
        id={panelId}
        className="chip-row nearby-list"
        role="group"
        aria-label="Nearby locations"
        hidden={!open}
      >
        {visible.map((option) => (
          <button
            key={option.id}
            type="button"
            className="chip chip-quiet"
            onClick={() => onChooseZone(option, 'nearby')}
          >
            {nearbyLabel(option, spotOptions)}
            {conditionCountFor && (
              <span className="chip-count">
                <span className="visually-hidden">,</span>
                {conditionCountFor(option.locationName)}
                <span className="visually-hidden">
                  {conditionCountFor(option.locationName) === 1 ? ' condition' : ' conditions'}
                </span>
              </span>
            )}
          </button>
        ))}

        {hiddenCount > 0 && (
          <button
            type="button"
            className="chip chip-more"
            aria-label={`Show ${hiddenCount} more nearby ${hiddenCount === 1 ? 'location' : 'locations'}`}
            onClick={() => {
              revealRequested.current = true
              setShowAll(true)
            }}
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    </div>
  )
}
