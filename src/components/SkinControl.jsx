import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { loadedModel } from '../modelLoader'
import {
  getOriginalSkinStatus,
  subscribeToOriginalSkin,
  warmOriginal,
} from '../viewer/originalSkin'
import { AlertIcon } from './icons'

/*
 * Skin: Gray (the clay, default) or Original (the mannequin's own textured
 * skin), in the 3D view's bottom-right corner (under the zoom buttons on
 * wide screens, just above the panel on the right on phones). The choice
 * changes only the picture: the selected location, side, case details,
 * conditions and camera stay as they are. It is not saved: every load
 * starts Gray.
 *
 * Original is prepared in the background the first time (see
 * viewer/originalSkin.js): the body stays Gray until it is ready and the
 * Original button shows a spinner; if that takes more than a moment, a small
 * status beside the control says what is happening. If preparing fails, the
 * status says so, with "Try again", and Original shows an alert mark (where
 * the screen has no room for the status, the spinner and the mark stand in
 * for it, and pressing Original again tries again); the body stays Gray.
 * Choosing Gray at any time wins. Preparing starts already when the pointer
 * reaches (or keyboard focus lands on) the Original button: decoding runs
 * off the main thread and shows nothing.
 *
 * The status store is read here, not higher up, so its progress steps do
 * not re-render the 3D view or the panel.
 *
 * The same choice is also in the header's "•••" menu (viewer/skinChoice.js),
 * for screens where this control has no room.
 */

const STEP_TEXT = {
  decoding: 'decoding its textures',
  compiling: 'preparing its shading',
  uploading: 'sending it to the graphics card',
  showing: 'showing it',
}

// A quick return to Original (textures still on the GPU) takes about a
// tenth of a second: the status appears only if preparing takes longer.
const STATUS_DELAY_MS = 150

const FAILURE_TEXT = 'The original skin couldn’t be prepared. The body stays gray.'
// Describes Original and Try again after a failure (one Skin control).
const FAILURE_ID = 'skin-failure-description'

// Original is chosen but not shown yet (also in the very first render after
// the click, before the preparation reports its first step).
function originalPending(appearance, status) {
  return appearance === 'original' && status.phase !== 'ready' && status.phase !== 'error'
}

function warm() {
  warmOriginal(loadedModel())
}

export default function SkinControl({ appearance, changed = false, onChoose, onRetry }) {
  const status = useSyncExternalStore(subscribeToOriginalSkin, getOriginalSkinStatus)
  const pending = originalPending(appearance, status)
  const failed = appearance === 'original' && status.phase === 'error'
  const [delayPassed, setDelayPassed] = useState(false)
  const originalRef = useRef(null)
  const retryRef = useRef(null)
  const retrying = useRef(false)

  // The preparing status, only after a short delay (see STATUS_DELAY_MS).
  if (!pending && delayPassed) setDelayPassed(false)

  useEffect(() => {
    if (!pending) return undefined

    const timer = window.setTimeout(() => setDelayPassed(true), STATUS_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [pending])

  // After "Try again": focus stays on Original while it prepares; if it
  // fails again, it goes to the new "Try again" (never dropped on the page),
  // unless the learner has moved on to something else meanwhile.
  useEffect(() => {
    if (!retrying.current) return

    if (failed) {
      retrying.current = false

      const active = document.activeElement

      if (!active || active === document.body || active === originalRef.current) retryRef.current?.focus()
    } else if (!pending) {
      retrying.current = false
    }
  }, [failed, pending])

  function retry() {
    retrying.current = true
    originalRef.current?.focus()
    onRetry()
  }

  function choose(next) {
    // The still-pressed Original after a failure tries again.
    if (next === 'original' && failed) {
      retry()
      return
    }

    onChoose(next)
  }

  const fraction = status.step === 'uploading' && status.total
    ? status.done / status.total
    : null

  // A return to Gray is spoken too (from the "•••" menu there is no pressed
  // button to say it), but not the Gray every load starts with.
  let announcement = ''

  if (pending) announcement = 'Preparing the original skin'
  else if (appearance === 'original' && status.phase === 'ready') announcement = 'Original skin shown'
  else if (appearance === 'neutral' && changed) announcement = 'Gray skin shown'

  // .skin-room is the corner the control may use (on phones: the part of
  // the view the panel leaves uncovered, below the side labels); the
  // control gives way where it is too short, and on small screens the
  // failure note keeps only its "Try again" (App.css).
  return (
    <div className="skin-room">
      <div
        className="skin-control"
        data-skin-control=""
        data-skin-phase={status.phase}
      >
        {pending && delayPassed && (
          <div
            className="skin-status"
            data-state="preparing"
          >
            <span className="skin-status-text">
              Preparing the original skin: {STEP_TEXT[status.step] ?? 'getting ready'}…
            </span>

            <span
              className={`skin-progress${fraction === null ? ' is-indeterminate' : ''}`}
              aria-hidden="true"
            >
              <span style={fraction === null ? undefined : { width: `${Math.round(fraction * 100)}%` }} />
            </span>
          </div>
        )}

        {failed && (
          <div
            className="skin-status"
            data-state="error"
          >
            <span className="skin-status-text">
              <AlertIcon
                className="skin-status-icon"
                size={16}
              />
              {FAILURE_TEXT}
            </span>

            <button
              ref={retryRef}
              type="button"
              className="skin-retry"
              data-action="retry-original"
              aria-describedby={FAILURE_ID}
              onClick={retry}
            >
              Try again
            </button>
          </div>
        )}

        <div
          className="skin-capsule"
          role="group"
          aria-label="Skin"
        >
          <span
            className="skin-word"
            aria-hidden="true"
          >
            Skin
          </span>

          <button
            type="button"
            className="skin-option"
            data-skin="neutral"
            aria-pressed={appearance === 'neutral'}
            onClick={() => choose('neutral')}
          >
            Gray
          </button>

          <button
            ref={originalRef}
            type="button"
            className="skin-option"
            data-skin="original"
            aria-pressed={appearance === 'original'}
            aria-busy={pending ? 'true' : undefined}
            aria-describedby={failed ? FAILURE_ID : undefined}
            onClick={() => choose('original')}
            onPointerEnter={warm}
            onFocus={warm}
          >
            Original
            {pending && (
              <span
                className="skin-spinner"
                aria-hidden="true"
              />
            )}
            {failed && (
              <AlertIcon
                className="skin-alert-mark"
                size={14}
              />
            )}
          </button>
        </div>
      </div>

      {/* Outside the control, so they work even where it gives way. Always
          present, so each change is spoken once: preparing, then shown; a
          failure assertively. The description tells what Original and Try
          again do after a failure. */}
      <p
        className="visually-hidden"
        role="status"
      >
        {announcement}
      </p>

      <p
        className="visually-hidden"
        role="alert"
      >
        {failed ? FAILURE_TEXT : ''}
      </p>

      <span
        id={FAILURE_ID}
        hidden
      >
        {FAILURE_TEXT} Press Original or Try again to try again.
      </span>
    </div>
  )
}
