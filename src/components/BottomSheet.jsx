import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { registerDevHook } from '../devHooks'
import { prefersReducedMotion } from '../motion'

/*
 * The phone panel: one sheet over the lower part of the 3D viewer, with
 * three sizes.
 *   compact  the location and its details, with the results heading peeking
 *   reading  about 58% of the screen: the body above, results below
 *   full     the whole stage: results only (the viewer is hidden)
 *
 * It can be moved by dragging its header (touch or mouse), with the grabber
 * button (click to toggle compact/reading; arrow keys, Home and End), or with
 * the visible Expand / Show body buttons the parent renders in the header.
 *
 * The sheet is never unmounted or display:none'd while the app runs, so its
 * scroll position and everything inside it survive editors and size changes.
 * `hidden` slides it away (an editor is open) and makes it inert.
 */

const SHEET_STATES = ['compact', 'reading', 'full']

const DRAG_THRESHOLD_PX = 6
// Pointer speed (px per ms) above which a release counts as a flick.
const FLICK_SPEED = 0.55
const READING_SHARE = 0.58
const MIN_COMPACT_PX = 108
// Compact always leaves at least this much of the 3D view uncovered (short
// landscape screens); its content then clips, and focus opens it further.
const MIN_VIEWER_PX = 160

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const BottomSheet = forwardRef(function BottomSheet({
  state,
  onStateChange,
  stageHeight,
  hidden = false,
  label,
  header,
  above,
  aboveMinRoom = 0,
  children,
  compactMarkerSelector = '[data-compact-end]',
  revealSelector = '.condition-row',
}, ref) {
  const sheetRef = useRef(null)
  const headerRef = useRef(null)
  const bodyRef = useRef(null)
  const grabberRef = useRef(null)
  const drag = useRef(null)
  const suppressClick = useRef(false)
  const previousState = useRef(state)
  const expandedByFocus = useRef(false)
  // True while the body's scroll position was set by the sheet itself.
  const autoScrolled = useRef(true)
  const [compactHeight, setCompactHeight] = useState(260)
  const [dragOffset, setDragOffset] = useState(null)

  // Visible heights for each state, within the stage.
  const fullHeight = Math.max(0, stageHeight)
  const compact = clamp(
    compactHeight,
    MIN_COMPACT_PX,
    Math.max(MIN_COMPACT_PX, Math.min(fullHeight * 0.62, fullHeight - MIN_VIEWER_PX)),
  )
  const reading = clamp(
    Math.round(fullHeight * READING_SHARE),
    Math.min(fullHeight, compact + 96),
    Math.max(compact + 96, fullHeight - 140),
  )
  const heights = {
    compact: Math.min(compact, fullHeight),
    reading: Math.min(reading, fullHeight),
    full: fullHeight,
  }

  const visible = dragOffset ?? heights[state] ?? heights.compact

  // Reading size, opened from compact: bring the first results into view.
  // Where the first three rows fit below the details, nothing moves (as on
  // the board); otherwise the results start at the top, from their heading,
  // with the details one scroll up (never half of them).
  const revealResults = useCallback(({ smooth = true } = {}) => {
    const body = bodyRef.current
    const marker = body?.querySelector(compactMarkerSelector)
    const rows = body?.querySelectorAll(revealSelector) ?? []

    if (!body || !marker || rows.length === 0) return

    const bodyTop = body.getBoundingClientRect().top
    const within = (element) => element.getBoundingClientRect().top - bodyTop + body.scrollTop
    const last = rows[Math.min(2, rows.length - 1)]
    const fitsFromTop = within(last) + last.offsetHeight + 8 <= body.clientHeight

    body.scrollTo({
      top: fitsFromTop ? 0 : Math.max(0, within(marker) - 4),
      behavior: smooth && !prefersReducedMotion() ? 'smooth' : 'auto',
    })
    autoScrolled.current = true
  }, [compactMarkerSelector, revealSelector])

  useImperativeHandle(ref, () => ({
    element: sheetRef.current,
    body: bodyRef.current,
    state,
    revealResults,
    // How much of the stage the sheet covers right now (CSS px), including
    // while it slides (measured, not computed).
    coveredHeight(stageBottom) {
      const sheet = sheetRef.current

      if (!sheet || hidden) return 0

      return Math.max(0, stageBottom - sheet.getBoundingClientRect().top)
    },
  }), [hidden, state, revealResults])

  // Measure how tall "compact" must be: down to the marker the content sets.
  useLayoutEffect(() => {
    const sheet = sheetRef.current

    if (!sheet) return undefined

    function measure() {
      const marker = sheet.querySelector(compactMarkerSelector)
      const headerHeight = headerRef.current?.offsetHeight ?? 0

      // Before a location is chosen: just the prompt in the header.
      if (!marker) {
        setCompactHeight(headerHeight + 2)
        return
      }

      // offsetTop is measured from the scrolling body (position: relative),
      // so it does not depend on how far the body is scrolled.
      const markerBottom = marker.offsetTop + marker.offsetHeight

      setCompactHeight(Math.round(headerHeight + markerBottom + 12))
    }

    measure()

    const observer = new ResizeObserver(measure)

    observer.observe(sheet)
    if (bodyRef.current?.firstElementChild) observer.observe(bodyRef.current.firstElementChild)
    if (headerRef.current) observer.observe(headerRef.current)

    return () => observer.disconnect()
  }, [compactMarkerSelector, state])

  const step = useCallback((direction) => {
    const index = SHEET_STATES.indexOf(state)
    const next = SHEET_STATES[clamp(index + direction, 0, SHEET_STATES.length - 1)]

    if (next !== state) {
      onStateChange(next, { source: 'keyboard' })
      announceSize(next)
    }
  }, [state, onStateChange])

  // Dragging the header.
  function handlePointerDown(event) {
    if (event.button !== 0 && event.pointerType === 'mouse') return

    drag.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startVisible: heights[state] ?? heights.compact,
      lastY: event.clientY,
      lastTime: event.timeStamp,
      velocity: 0,
      dragging: false,
    }
  }

  function handlePointerMove(event) {
    const current = drag.current

    if (!current || current.pointerId !== event.pointerId) return

    const dy = event.clientY - current.startY

    if (!current.dragging) {
      if (Math.abs(dy) < DRAG_THRESHOLD_PX) return

      current.dragging = true
      suppressClick.current = true
      headerRef.current?.setPointerCapture?.(event.pointerId)
    }

    const dt = Math.max(1, event.timeStamp - current.lastTime)

    current.velocity = (event.clientY - current.lastY) / dt
    current.lastY = event.clientY
    current.lastTime = event.timeStamp

    setDragOffset(clamp(current.startVisible - dy, heights.compact * 0.6, heights.full))
  }

  function finishDrag(event) {
    const current = drag.current

    drag.current = null

    if (!current || current.pointerId !== event.pointerId || !current.dragging) {
      return
    }

    headerRef.current?.releasePointerCapture?.(event.pointerId)

    // A quick flick moves exactly one size in its direction; a slow drag
    // settles on the nearest size.
    const position = current.startVisible - (event.clientY - current.startY)
    const index = SHEET_STATES.indexOf(state)
    let best = state

    if (Math.abs(current.velocity) > FLICK_SPEED) {
      const direction = current.velocity < 0 ? 1 : -1

      best = SHEET_STATES[clamp(index + direction, 0, SHEET_STATES.length - 1)]
    } else {
      let bestDistance = Infinity

      for (const name of SHEET_STATES) {
        const distance = Math.abs(heights[name] - position)

        if (distance < bestDistance) {
          best = name
          bestDistance = distance
        }
      }
    }

    setDragOffset(null)

    if (best !== state) onStateChange(best, { source: 'drag' })

    // Let the click that follows a drag be ignored, then re-arm.
    window.setTimeout(() => {
      suppressClick.current = false
    }, 0)
  }

  function handleClickCapture(event) {
    if (suppressClick.current) {
      event.preventDefault()
      event.stopPropagation()
      suppressClick.current = false
    }
  }

  function handleGrabberKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        step(1)
        break
      case 'ArrowDown':
        event.preventDefault()
        step(-1)
        break
      case 'Home':
        event.preventDefault()
        onStateChange('compact', { source: 'keyboard' })
        announceSize('compact')
        break
      case 'End':
        event.preventDefault()
        onStateChange('full', { source: 'keyboard' })
        announceSize('full')
        break
      default:
        break
    }
  }

  // Tabbing into content that compact hides opens the panel to reading.
  // Positions are measured within the content (independent of any scrolling
  // the browser does to reveal the focused element).
  function handleFocusCapture(event) {
    if (state !== 'compact' || hidden) return

    const body = bodyRef.current
    const target = event.target

    if (!body || !body.contains(target)) return

    const bodyRect = body.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const contentBottom = targetRect.bottom - bodyRect.top + body.scrollTop
    const visibleBody = heights.compact - (headerRef.current?.offsetHeight ?? 0)

    if (contentBottom > visibleBody) {
      // The browser keeps the focused element in view; no results reveal.
      expandedByFocus.current = true
      onStateChange('reading', { source: 'focus' })
    } else if (body.scrollTop !== 0) {
      body.scrollTop = 0
    }
  }

  // Compact always shows the top of the content (location and details),
  // even if the list was scrolled in a larger size. While the learner has
  // not scrolled the panel themselves, each size shows the boards'
  // arrangement: reading (opened with Expand, the grabber, a drag or the
  // keys) reveals the first results, and full shows everything from the
  // top. Once they scroll, their position is kept; opening and closing an
  // editor never moves it.
  useEffect(() => {
    const from = previousState.current
    const body = bodyRef.current

    previousState.current = state

    if (!body) return

    if (state === 'compact') {
      body.scrollTo({ top: 0 })
      autoScrolled.current = true
    } else if (state === 'reading' && !expandedByFocus.current
      && (from === 'compact' || (from === 'full' && autoScrolled.current))) {
      revealResults()
    } else if (state === 'full' && from === 'reading' && autoScrolled.current) {
      body.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }

    expandedByFocus.current = false
  }, [state, revealResults])

  // Scrolling by the learner (wheel, touch, keys) ends the automatic
  // positions above.
  function handleUserScroll() {
    autoScrolled.current = false
  }

  // Spoken feedback for size changes made from the keyboard.
  const [announced, setAnnounced] = useState('')

  function announceSize(next) {
    setAnnounced(`Panel ${next === 'full' ? 'at full height' : next}`)
  }

  useEffect(() => registerDevHook('sheet', () => ({
    state,
    hidden,
    heights,
    coveredTop: sheetRef.current?.getBoundingClientRect().top ?? null,
    scrollTop: bodyRef.current?.scrollTop ?? 0,
  })))

  // How much of the stage the panel covers, for what the viewer shows above
  // it (its loading and error cards).
  useLayoutEffect(() => {
    sheetRef.current?.parentElement?.style.setProperty('--sheet-cover', `${hidden ? 0 : visible}px`)
  }, [hidden, visible])

  const reduced = prefersReducedMotion()
  const offscreen = hidden ? fullHeight + 24 : fullHeight - visible
  const bodyHeight = Math.max(0, (dragOffset ?? heights[state]) - (headerRef.current?.offsetHeight ?? 0))

  const grabberLabel = state === 'compact'
    ? 'Expand panel'
    : 'Collapse panel'

  return (
    <section
      ref={sheetRef}
      className={[
        'sheet',
        `sheet-${state}`,
        dragOffset !== null ? 'is-dragging' : '',
        hidden ? 'is-hidden' : '',
        reduced ? 'no-motion' : '',
      ].join(' ')}
      style={{
        height: `${fullHeight}px`,
        transform: `translate3d(0, ${offscreen}px, 0)`,
        '--sheet-body-height': `${bodyHeight}px`,
      }}
      aria-label={label}
      inert={hidden}
      onClickCapture={handleClickCapture}
      onFocusCapture={handleFocusCapture}
    >
      {/* Rides on the sheet's top edge (e.g. the miniature body locator),
          only where the uncovered stage has room for it. */}
      {above && fullHeight - (heights[state] ?? heights.compact) >= aboveMinRoom && (
        <div className="sheet-above">{above}</div>
      )}

      <div
        ref={headerRef}
        className="sheet-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="sheet-grabber-row">
          <button
            ref={grabberRef}
            type="button"
            className="sheet-grabber"
            aria-label={grabberLabel}
            aria-describedby="sheet-grabber-help"
            onClick={() => onStateChange(state === 'compact' ? 'reading' : 'compact', { source: 'grabber' })}
            onKeyDown={handleGrabberKeyDown}
          >
            <span className="sheet-grabber-bar" aria-hidden="true" />
          </button>

          <span
            id="sheet-grabber-help"
            className="visually-hidden"
          >
            Panel size: {state === 'full' ? 'full height' : state}. Up and Down arrows change the size.
          </span>

          <span
            className="visually-hidden"
            aria-live="polite"
          >
            {announced}
          </span>

          {header?.actions}
        </div>

        {header?.content}
      </div>

      <div
        ref={bodyRef}
        className="sheet-body"
        onWheel={handleUserScroll}
        onTouchMove={handleUserScroll}
        onKeyDown={handleUserScroll}
      >
        {children}
      </div>
    </section>
  )
})

export default BottomSheet
