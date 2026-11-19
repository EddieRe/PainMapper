import { useEffect, useRef } from 'react'
import { CloseIcon } from './icons'

/*
 * About PainMapper: what it is, how the comparisons work, the clinical
 * review status, credits and developer options. A native modal <dialog>
 * (focus is kept inside; Escape closes). `section` scrolls to a part.
 */
export default function AboutDialog({
  open,
  section,
  locationCount,
  conditionCount,
  showDebugNodes,
  onShowDebugNodesChange,
  onClose,
}) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) return

    if (open && !dialog.open) {
      dialog.showModal()

      const target = section
        ? dialog.querySelector(`#about-${section}`)
        : null

      if (target) {
        target.scrollIntoView({ block: 'start' })
        target.focus({ preventScroll: true })
      } else {
        dialog.querySelector('.about-close')?.focus()
      }
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open, section])

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog"
      aria-labelledby="about-title"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself) closes it.
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div className="about-inner">
        <div className="about-header">
          <h2
            id="about-title"
            className="about-title"
          >
            About PainMapper
          </h2>

          <button
            type="button"
            className="header-icon-button about-close"
            aria-label="Close About"
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="about-content">
          <section
            id="about-purpose"
            tabIndex={-1}
          >
            <p>
              A teaching tool for pediatric musculoskeletal pain. Choose where
              it hurts on the 3D patient or by name, optionally add the
              patient’s age and onset, and review the conditions the
              PainMapper dataset links to that location.
            </p>

            <p className="about-emphasis">
              <strong>Educational use only.</strong> This application is
              intended for medical education and should not be used to make
              clinical diagnoses or replace evaluation by a qualified
              healthcare professional.
            </p>
          </section>

          <section
            id="about-comparisons"
            tabIndex={-1}
          >
            <h3>How the comparisons work</h3>

            <p>
              These are the conditions the dataset links to the chosen
              location. When an age or onset is entered, each condition is
              compared with its recorded age range and traumatic / atraumatic
              flags and grouped. Nothing is scored, ranked or ruled out, and
              every associated condition stays in the list.
            </p>

            <ul>
              <li>
                <strong>Age</strong> is compared with each condition’s listed
                age range (the end ages count as inside it).
              </li>
              <li>
                <strong>Onset</strong> is compared with whether the dataset
                lists the condition as traumatic (after injury) or atraumatic
                (no injury).
              </li>
              <li>
                <strong>Swelling</strong> is shown beside each condition’s
                recorded swelling for reference. It never changes the groups.
              </li>
              <li>
                <strong>Not specified</strong> is unknown. It is never
                compared and never counts against a condition.
              </li>
              <li>
                <strong>Couldn’t be compared</strong> means the dataset has no
                value for the details entered.
              </li>
            </ul>

            <p>
              Groups are alphabetical; the order never means likelihood.
            </p>
          </section>

          <section
            id="about-review"
            tabIndex={-1}
          >
            <h3>Clinical review</h3>

            <p>
              The dataset and these comparisons are awaiting clinical review:
              they have not yet been approved as teaching content.
            </p>
          </section>

          <section
            id="about-model"
            tabIndex={-1}
          >
            <h3>The 3D patient</h3>

            <p>
              The model is an adult figure used for orientation. The coloured
              area marks the location you selected. It does not show pain
              intensity, a diagnosis, or a reviewed pain distribution, and the
              model has no muscle or bone layers.
            </p>
          </section>

          <section
            id="about-credits"
            tabIndex={-1}
          >
            <h3>Credits</h3>

            <p>
              Jon Russell and Eddie Re | 2026 · Questions:{' '}
              <a href="mailto:ree@chop.edu">ree@chop.edu</a>
            </p>
          </section>

          <details className="developer-options">
            <summary>Developer options</summary>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={showDebugNodes}
                onChange={(event) => onShowDebugNodesChange(event.target.checked)}
              />

              <span>Show location spheres on the model</span>
            </label>

            <p className="developer-note">
              Dataset: {locationCount} locations, {conditionCount} condition
              records. Selection check: see tools/selection-check.js.
            </p>
          </details>
        </div>
      </div>
    </dialog>
  )
}
