import { forwardRef, useEffect, useId, useRef, useState } from 'react'
import { DATASET_AGE_RANGE, formatAge } from '../../data/caseMatching'
import { MinusIcon, PlusIcon } from '../icons'
import EditorSurface from './EditorSurface'

/*
 * Age: type a whole number of years (0 means under 1 year) or step with
 * − and +. Every valid value updates the comparisons at once; anything
 * outside the dataset's pediatric range is explained and not applied.
 * "Not specified" clears the age (unknown is never compared).
 */

const { min: MIN_AGE, max: MAX_AGE } = DATASET_AGE_RANGE

function unitFor(age) {
  if (age === 0) return 'under 1 year'
  if (age === 1) return 'year'

  return 'years'
}

function draftFor(age) {
  return age === null ? '' : String(age)
}

const AgeEditor = forwardRef(function AgeEditor({
  layout,
  age,
  subtitle,
  anchor,
  keyboardInset,
  coarsePointer,
  onChange,
  onClose,
}, ref) {
  const inputRef = useRef(null)
  // The age an empty or out-of-range entry puts back: the age when the field
  // was focused, or the last complete choice since (a two-digit entry, − or
  // +, the arrow keys, Under 1 year, Not specified). Single digits typed or
  // left by deleting apply at once but are not settled: "1" on the way to
  // "19", or what remains of "13" after a Backspace.
  const settledAge = useRef(age)
  const hintId = useId()
  const valueId = useId()
  const [draft, setDraft] = useState(() => draftFor(age))
  const [error, setError] = useState(null)
  const [focused, setFocused] = useState(false)
  const hintRef = useRef(null)

  // A popover shortened by the keyboard scrolls the range message into view.
  useEffect(() => {
    const hint = hintRef.current
    const surface = hint?.closest('.editor-wide')

    if (!error || !surface) return

    const surfaceBox = surface.getBoundingClientRect()
    const hintBox = hint.getBoundingClientRect()

    if (hintBox.bottom > surfaceBox.bottom) surface.scrollTop += hintBox.bottom - surfaceBox.bottom + 12
  }, [error])

  // Shown as words rather than a number unless the learner is typing:
  // "Not specified" (no age; unknown) and "Under 1 year" (age 0), exactly
  // as formatAge words them everywhere else.
  let wordsOnly = null

  if (!focused && !error && draft === '' && age === null) wordsOnly = formatAge(null)
  else if (!focused && !error && age === 0 && draft === '0') wordsOnly = formatAge(0)

  function apply(next) {
    settledAge.current = next
    setError(null)
    setDraft(draftFor(next))
    onChange(next)
  }

  function step(direction) {
    if (age === null) {
      apply(direction > 0 ? MIN_AGE : null)
      return
    }

    apply(Math.min(MAX_AGE, Math.max(MIN_AGE, age + direction)))
  }

  function handleInput(event) {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 2)
    const value = digits === '' ? null : Number(digits)

    setDraft(digits)

    // Empty or out of range: never applied. Typing "25" first passes
    // through "2", so the settled age is put back.
    if (value === null || value > MAX_AGE) {
      setError(value === null
        ? null
        : `Enter an age from ${MIN_AGE} to ${MAX_AGE} years (0 means under 1 year).`)
      if (age !== settledAge.current) onChange(settledAge.current)
      return
    }

    setError(null)
    if (digits.length === 2) settledAge.current = value
    onChange(value)
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      step(1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      step(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onClose()
    }
  }

  // An empty or invalid entry is never applied; show the current age again
  // when the field is left.
  function handleBlur() {
    if (draft === '' || error) {
      setDraft(draftFor(age))
      setError(null)
    }
  }

  const hint = coarsePointer
    ? 'Tap the number to type'
    : 'Type an age, or use − and +'

  return (
    <EditorSurface
      ref={ref}
      layout={layout}
      title="Age"
      subtitle={subtitle}
      anchor={anchor}
      keyboardInset={keyboardInset}
      initialFocusRef={coarsePointer ? null : inputRef}
      onClose={onClose}
    >
      <div className="age-stepper">
        {/* aria-disabled rather than disabled: a button that becomes
            disabled while focused would drop keyboard focus. */}
        <button
          type="button"
          className="stepper-button"
          aria-label="One year younger"
          aria-disabled={age === null || age <= MIN_AGE}
          onClick={() => {
            if (age !== null && age > MIN_AGE) step(-1)
          }}
        >
          <MinusIcon size={22} />
        </button>

        <label
          className={[
            'age-field',
            wordsOnly ? 'is-words' : '',
            wordsOnly && age === null ? 'is-unknown' : '',
          ].join(' ')}
        >
          <span className="visually-hidden">Age in years</span>

          <input
            ref={inputRef}
            className="age-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            maxLength={2}
            placeholder=" "
            aria-invalid={error ? true : undefined}
            aria-describedby={`${valueId} ${hintId}`}
            value={draft}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              setFocused(false)
              handleBlur()
            }}
            onFocus={(event) => {
              settledAge.current = age
              setFocused(true)
              event.target.select()
            }}
          />

          <span
            className="age-unit"
            aria-hidden="true"
          >
            {wordsOnly ?? unitFor(draft === '' ? age : Number(draft))}
          </span>
        </label>

        <button
          type="button"
          className="stepper-button"
          aria-label="One year older"
          aria-disabled={age !== null && age >= MAX_AGE}
          onClick={() => {
            if (age === null || age < MAX_AGE) step(1)
          }}
        >
          <PlusIcon size={22} />
        </button>
      </div>

      {/* The age in words for screen readers ("Under 1 year", "Not
          specified"), read as the field's description. */}
      <span
        id={valueId}
        className="visually-hidden"
      >
        {`Age now: ${formatAge(age)}.`}
      </span>

      <p
        ref={hintRef}
        id={hintId}
        className={`editor-hint${error ? ' is-error' : ''}`}
        role={error ? 'alert' : undefined}
      >
        {error ?? `${hint} · ${MIN_AGE}–${MAX_AGE} years`}
      </p>

      <div className="editor-choices">
        <button
          type="button"
          className="choice-button"
          aria-pressed={age === 0}
          onClick={() => apply(0)}
        >
          Under 1 year
        </button>

        <button
          type="button"
          className="choice-button"
          aria-pressed={age === null}
          aria-label="Not specified (clears the age)"
          onClick={() => apply(null)}
        >
          Not specified
        </button>
      </div>
    </EditorSurface>
  )
})

export default AgeEditor
