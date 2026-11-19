import { hasCaseDetails, ONSET_LABELS } from '../data/caseDetails'
import {
  formatAge,
  ONSET,
  SWELLING_UNKNOWN,
} from '../data/caseMatching'
import { ChevronIcon, InfoIcon, PencilIcon } from './icons'

/*
 * The optional case details, as compact controls. Each opens its own editor
 * (one setting per editor). Swelling stays visually secondary: it is shown
 * for reference only and never changes the comparisons.
 */

function DetailChip({ kind, label, value, set, onOpen }) {
  return (
    <button
      type="button"
      className={`detail-chip${set ? ' is-set' : ''}`}
      aria-haspopup="dialog"
      aria-label={`${label}: ${set ? value : 'not specified'}`}
      data-editor={kind}
      onClick={(event) => onOpen(kind, event.currentTarget)}
    >
      <span className="detail-chip-text">{set ? value : label}</span>
      <ChevronIcon
        className="detail-chip-chevron"
        size={18}
      />
    </button>
  )
}

export default function CaseControls({
  caseDetails,
  layout,
  onOpenEditor,
  onClearDetails,
  onOpenAbout,
}) {
  const ageSet = caseDetails.age !== null
  const onsetSet = caseDetails.onset !== ONSET.UNKNOWN
  const swellingSet = caseDetails.swelling !== SWELLING_UNKNOWN
  const anyEntered = hasCaseDetails(caseDetails)

  return (
    <section
      className="case-controls"
      aria-labelledby="case-details-heading"
    >
      <div className="case-controls-head">
        <h2
          id="case-details-heading"
          className={layout === 'wide' ? 'section-title' : 'visually-hidden'}
        >
          Case details
          <span className="optional-badge">Optional</span>
        </h2>

        {/* Desktop only: on phones "Clear case details" is in the ••• menu,
            and each editor clears its own detail ("Not specified"). */}
        {anyEntered && layout === 'wide' && (
          <button
            type="button"
            className="link-button clear-details"
            onClick={onClearDetails}
          >
            Clear details
          </button>
        )}
      </div>

      <div className="detail-chips">
        <DetailChip
          kind="age"
          label="Age"
          value={formatAge(caseDetails.age)}
          set={ageSet}
          onOpen={onOpenEditor}
        />

        <DetailChip
          kind="onset"
          label="Onset"
          value={ONSET_LABELS[caseDetails.onset]}
          set={onsetSet}
          onOpen={onOpenEditor}
        />
      </div>

      <div className="swelling-line">
        <p className="swelling-text">
          <span className="swelling-label">Swelling:</span>{' '}
          <span className={swellingSet ? 'swelling-value is-set' : 'swelling-value'}>
            {swellingSet ? caseDetails.swelling : 'Not specified'}
          </span>
          <span className="swelling-reference"> · Reference only</span>
        </p>

        <div className="swelling-actions">
          <button
            type="button"
            className="link-button"
            aria-haspopup="dialog"
            aria-label="Edit swelling"
            data-editor="swelling"
            onClick={(event) => onOpenEditor('swelling', event.currentTarget)}
          >
            <PencilIcon size={16} />
            Edit
          </button>

          {layout === 'wide' && (
            <>
              <span
                className="link-divider"
                aria-hidden="true"
              />

              <button
                type="button"
                className="link-button"
                aria-label="Info: how case details are used"
                onClick={() => onOpenAbout('comparisons')}
              >
                <InfoIcon size={16} />
                Info
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
