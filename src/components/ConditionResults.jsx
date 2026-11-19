import { useId } from 'react'
import {
  describeAgeRange,
  describeOnset,
  FIT,
  STATUS,
} from '../data/caseMatching'
import {
  ChevronRightIcon,
  InfoIcon,
} from './icons'

/*
 * The conditions the dataset links to the chosen location.
 *
 * Every associated condition is always listed. When an age or onset is
 * entered, they are grouped (consistent / couldn't be compared / differs),
 * alphabetically within each group, exactly as organizeConditions returns
 * them. Rows stay quiet: the recorded values, or which detail differs or is
 * missing; the exact comparison sentences, recorded swelling, other linked
 * locations and the source row are one tap away. Nothing is scored or ranked.
 */

const NOT_ENTERED_TEXT = {
  age: 'No age entered, so not compared.',
  onset: 'No onset entered, so not compared.',
}

function recordedOnset(condition) {
  const onset = describeOnset(condition)

  return onset === 'Not recorded' ? 'Onset not recorded' : onset
}

function recordedSummary(condition) {
  return `${describeAgeRange(condition)} · ${recordedOnset(condition)}`
}

// The one quiet line under each condition name.
function rowSummary(item) {
  const [age, onset] = item.checks

  if (item.fit === FIT.DIFFERS) {
    const ageDiffers = age.status === STATUS.DIFFERS
    const onsetDiffers = onset.status === STATUS.DIFFERS

    let text = 'Onset differs'

    if (ageDiffers && onsetDiffers) text = 'Age and onset differ'
    else if (ageDiffers) text = 'Age differs'

    return { tone: 'differs', text }
  }

  if (item.fit === FIT.UNCHECKED) {
    const missing = []

    // describeAgeRange says exactly what is missing ("Up to 18 years
    // (minimum not recorded)", or "Age range not recorded").
    if (age.status === STATUS.NOT_RECORDED) missing.push(describeAgeRange(item.condition))
    if (onset.status === STATUS.NOT_RECORDED) missing.push('Onset not recorded')

    return { tone: 'unchecked', text: missing.join(' · ') || 'Not recorded in the dataset' }
  }

  return { tone: 'plain', text: recordedSummary(item.condition) }
}

function CheckLine({ check }) {
  if (check.status === STATUS.NOT_ENTERED) {
    return <span className="check-line check-not-entered">{NOT_ENTERED_TEXT[check.detail]}</span>
  }

  if (!check.explanation) return null

  return (
    <span className={`check-line check-${check.status}`}>
      <span
        className="check-dot"
        aria-hidden="true"
      />
      {check.explanation}
    </span>
  )
}

function ConditionRow({ item, locationName, locationSpelling, expanded, onToggle }) {
  const detailId = useId()
  const { condition, checks, swelling } = item
  const [ageCheck, onsetCheck] = checks
  const summary = rowSummary(item)

  // The other locations the record names, spelled as in locations.csv (a
  // few record cells differ only in letter case, e.g. "Distal fibula"), and
  // each shown once.
  const otherLocations = condition.locations
    .map((location) => locationSpelling?.get(location.toLowerCase()) ?? location)
    .filter((location) => location.toLowerCase() !== locationName.toLowerCase())
    .filter((location, index, list) =>
      list.findIndex((other) => other.toLowerCase() === location.toLowerCase()) === index)

  return (
    <li className={`condition fit-${item.fit}${expanded ? ' is-open' : ''}`}>
      <button
        type="button"
        className="condition-row"
        aria-expanded={expanded}
        aria-controls={detailId}
        onClick={() => onToggle(condition.id)}
      >
        <span className="condition-text">
          <span className="condition-name">{condition.name}</span>
          <span className={`condition-meta meta-${summary.tone}`}>{summary.text}</span>
        </span>

        <ChevronRightIcon
          className="condition-chevron"
          size={22}
        />
      </button>

      <div
        id={detailId}
        className="condition-detail"
        hidden={!expanded}
      >
        <dl className="detail-list">
          <div>
            <dt>Age range</dt>
            <dd>
              <span className="detail-value">{describeAgeRange(condition)}</span>
              <CheckLine check={ageCheck} />
            </dd>
          </div>

          <div>
            <dt>Onset</dt>
            <dd>
              <span className="detail-value">{describeOnset(condition)}</span>
              <CheckLine check={onsetCheck} />
            </dd>
          </div>

          <div>
            <dt>Swelling</dt>
            <dd>
              <span className="detail-value">{swelling.recorded} (recorded)</span>
              <span className="check-line check-reference">
                Your case: {swelling.entered.toLowerCase()} · reference only, not compared
              </span>
            </dd>
          </div>

          <div>
            <dt>Also linked to</dt>
            <dd>
              {otherLocations.length > 0
                ? otherLocations.join(', ')
                : 'No other locations'}
            </dd>
          </div>
        </dl>

        <p className="provenance">
          Source for review: pathologies.csv, row {condition.id + 2}
        </p>
      </div>
    </li>
  )
}

function ResultGroup({
  tone,
  title,
  note,
  items,
  locationName,
  locationSpelling,
  expandedIds,
  onToggle,
}) {
  const titleId = useId()

  if (items.length === 0) return null

  return (
    <section
      className={`result-group tone-${tone}`}
      aria-labelledby={title ? titleId : undefined}
    >
      {title && (
        <h3
          id={titleId}
          className="group-title"
        >
          <span
            className="group-dot"
            aria-hidden="true"
          />
          <span>{title}</span>
          <span className="group-count">
            <span aria-hidden="true"> · </span>
            {items.length}
            <span className="visually-hidden">
              {items.length === 1 ? ' condition' : ' conditions'}
            </span>
          </span>
        </h3>
      )}

      {note && <p className="group-note">{note}</p>}

      <ul className="condition-list">
        {items.map((item) => (
          <ConditionRow
            key={item.condition.id}
            item={item}
            locationName={locationName}
            locationSpelling={locationSpelling}
            expanded={expandedIds.has(item.condition.id)}
            onToggle={onToggle}
          />
        ))}
      </ul>
    </section>
  )
}

function LoadingRows() {
  return (
    <div
      className="results-skeleton"
      role="status"
    >
      <span className="visually-hidden">Loading condition data…</span>
      <span className="skeleton-line" />
      <span className="skeleton-line" />
      <span className="skeleton-line short" />
    </div>
  )
}

export default function ConditionResults({
  selectedZone,
  organized,
  dataStatus,
  modelUnavailable,
  nearbySuggestions,
  locationSpelling,
  expandedIds,
  headingRef,
  layout,
  onToggleExpanded,
  onChooseZone,
  onOpenAbout,
}) {
  const total = organized.all.length
  const name = selectedZone?.locationName
  const showList = dataStatus === 'ready' && selectedZone && total > 0

  let body

  if (dataStatus === 'loading') {
    body = <LoadingRows />
  } else if (dataStatus === 'error') {
    body = (
      <p className="results-message">
        Conditions are unavailable until the data loads.
      </p>
    )
  } else if (!selectedZone) {
    body = (
      <p className="results-message">
        {modelUnavailable
          ? 'Choose a location with the search to see the conditions the dataset links to it.'
          : 'Choose a location on the body or with the search to see the conditions the dataset links to it.'}
      </p>
    )
  } else if (total === 0) {
    body = (
      <div className="results-empty">
        <p className="results-empty-title">
          No conditions are linked to {name} yet
        </p>

        <p className="results-message">
          The dataset has no conditions for this location. It is listed for
          clinical review.
        </p>

        {nearbySuggestions.length > 0 && (
          <div className="results-empty-nearby">
            <p className="results-empty-label">Nearby locations with conditions</p>

            <div className="chip-row">
              {nearbySuggestions.map(({ zone, count }) => (
                <button
                  key={zone.id}
                  type="button"
                  className="chip chip-quiet"
                  onClick={() => onChooseZone(zone, 'nearby')}
                >
                  {zone.locationName}
                  <span className="chip-count">{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  } else if (!organized.detailsEntered) {
    body = (
      <>
        <p className="results-hint">
          Add an age or onset to group these by how they compare with the
          dataset.
        </p>

        <ResultGroup
          tone="neutral"
          items={organized.all}
          locationName={name}
          locationSpelling={locationSpelling}
          expandedIds={expandedIds}
          onToggle={onToggleExpanded}
        />
      </>
    )
  } else {
    body = (
      <>
        <ResultGroup
          tone="consistent"
          title="Consistent with the case"
          items={organized.consistent}
          locationName={name}
          locationSpelling={locationSpelling}
          expandedIds={expandedIds}
          onToggle={onToggleExpanded}
        />

        <ResultGroup
          tone="unchecked"
          title="Couldn’t be compared"
          note="The dataset has no value for the details entered."
          items={organized.unchecked}
          locationName={name}
          locationSpelling={locationSpelling}
          expandedIds={expandedIds}
          onToggle={onToggleExpanded}
        />

        <ResultGroup
          tone="differs"
          title="Differs from an entered detail"
          note="Still associated; not ruled out."
          items={organized.differs}
          locationName={name}
          locationSpelling={locationSpelling}
          expandedIds={expandedIds}
          onToggle={onToggleExpanded}
        />
      </>
    )
  }

  return (
    <section
      className="results"
      aria-labelledby="results-heading"
    >
      {/* On phones, the compact panel shows the location and its details
          down to this heading (before a location is chosen, only the
          prompt in the panel header). */}
      <div
        className="results-head"
        data-compact-end={selectedZone ? '' : undefined}
      >
        <h2
          id="results-heading"
          ref={headingRef}
          className="results-title"
          tabIndex={-1}
        >
          Associated conditions
          {showList && (
            <span className="results-count">
              <span aria-hidden="true"> · </span>
              <span className="results-count-number">{total}</span>
              <span className="visually-hidden">
                {total === 1 ? ' condition' : ' conditions'}
              </span>
            </span>
          )}
        </h2>

        {showList && (
          <span className="results-order">
            {layout === 'wide' ? 'A–Z within groups' : 'A–Z'}
          </span>
        )}
      </div>

      {showList && (
        <p className="results-context">
          Educational use · Not ranked by likelihood
          <br />
          Clinical review pending
        </p>
      )}

      {body}

      <button
        type="button"
        className="link-button about-link"
        onClick={() => onOpenAbout('comparisons')}
      >
        <InfoIcon size={16} />
        About these comparisons
      </button>
    </section>
  )
}
