import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { keyboardInset as readKeyboardInset, subscribeToKeyboard } from '../../layout/viewInsets'
import { prefersReducedMotion } from '../../motion'

/*
 * The container for one case-detail editor.
 *   narrow layout: a small sheet that slides up from the bottom (above the
 *                  on-screen keyboard), leaving the 3D view visible above it;
 *   wide layout:   a popover under the control that opened it.
 *
 * It is a modal dialog: focus moves into it, Tab stays inside, and Escape,
 * Done or a click outside closes it. On close, focus returns to the control
 * that opened it (the parent passes that element as `returnFocusTo`).
 */

const FOCUSABLE = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

const POPOVER_GAP = 8
const POPOVER_MARGIN = 12

const EditorSurface = forwardRef(function EditorSurface({
  layout,
  title,
  tag = 'Optional',
  subtitle,
  anchor,
  keyboardInset = 0,
  initialFocusRef,
  onClose,
  children,
}, ref) {
  const titleId = useId()
  const surfaceRef = useRef(null)
  const [position, setPosition] = useState(null)
  const [entered, setEntered] = useState(prefersReducedMotion())

  useImperativeHandle(ref, () => surfaceRef.current, [])

  // Slide/fade in on the next frame (skipped with reduced motion).
  useEffect(() => {
    if (entered) return undefined

    const frame = window.requestAnimationFrame(() => setEntered(true))

    return () => window.cancelAnimationFrame(frame)
  }, [entered])

  // Wide layout: place the popover under (or above) the control.
  useLayoutEffect(() => {
    if (layout !== 'wide' || !anchor) return undefined

    function place() {
      const surface = surfaceRef.current

      if (!surface) return

      const box = anchor.getBoundingClientRect()
      const width = surface.offsetWidth
      const viewportWidth = window.innerWidth
      // Above the on-screen keyboard where there is one (landscape phones).
      const visual = window.visualViewport
      const viewportHeight = Math.min(
        visual ? visual.offsetTop + visual.height : window.innerHeight,
        window.innerHeight - readKeyboardInset(),
      )
      // Never under the app header; in short windows the popover scrolls.
      const headerBottom = document.querySelector('.app-header')?.getBoundingClientRect().bottom ?? 0
      const minTop = Math.max(POPOVER_MARGIN, headerBottom + POPOVER_GAP)
      const maxHeight = Math.max(96, viewportHeight - minTop - POPOVER_MARGIN)
      // scrollHeight is the full content height, even while capped.
      const height = Math.min(surface.scrollHeight, maxHeight)

      let top = box.bottom + POPOVER_GAP

      if (top + height > viewportHeight - POPOVER_MARGIN && box.top - POPOVER_GAP - height >= minTop) {
        top = box.top - POPOVER_GAP - height
      }

      top = Math.max(minTop, Math.min(top, viewportHeight - height - POPOVER_MARGIN))

      const left = Math.max(
        POPOVER_MARGIN,
        Math.min(box.left, viewportWidth - width - POPOVER_MARGIN),
      )

      setPosition({ top, left, maxHeight })
    }

    place()

    // Also when the keyboard comes or goes, and when the content grows (an
    // error line).
    const unsubscribe = subscribeToKeyboard(place)
    const observer = new ResizeObserver(place)

    for (const child of surfaceRef.current?.children ?? []) observer.observe(child)

    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    window.visualViewport?.addEventListener('resize', place)

    return () => {
      unsubscribe()
      observer.disconnect()
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [layout, anchor])

  // Wide, once placed: a chosen option below the visible part of a popover
  // capped by a short window is scrolled into view (inside the popover only).
  const revealedFocus = useRef(false)

  useEffect(() => {
    const surface = surfaceRef.current
    const active = document.activeElement

    if (layout !== 'wide' || !position || revealedFocus.current) return
    if (!surface?.contains(active) || active === surface) return

    revealedFocus.current = true

    const surfaceBox = surface.getBoundingClientRect()
    const box = active.getBoundingClientRect()

    if (box.bottom > surfaceBox.bottom) surface.scrollTop += box.bottom - surfaceBox.bottom + POPOVER_MARGIN
  }, [layout, position])

  // Escape closes the editor even if focus has somehow left it (the
  // editor's own handler covers everything inside it).
  useEffect(() => {
    function handleDocumentKeyDown(event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (surfaceRef.current?.contains(document.activeElement)) return

      event.preventDefault()
      onClose()
    }

    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => document.removeEventListener('keydown', handleDocumentKeyDown)
  }, [onClose])

  // Move focus in.
  useEffect(() => {
    const surface = surfaceRef.current

    if (!surface) return

    const first = initialFocusRef?.current ?? surface.querySelector(FOCUSABLE)

    first?.focus({ preventScroll: true })
    // Only when the editor opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab') return

    const items = [...surfaceRef.current.querySelectorAll(FOCUSABLE)]
      .filter((element) => element.offsetParent !== null || element === document.activeElement)

    if (items.length === 0) return

    const first = items[0]
    const last = items[items.length - 1]

    // Focus on the dialog itself (a click on its text): into its controls.
    if (document.activeElement === surfaceRef.current) {
      event.preventDefault()
      ;(event.shiftKey ? last : first).focus()
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const style = layout === 'wide'
    ? {
      top: position ? `${position.top}px` : '-9999px',
      left: position ? `${position.left}px` : '-9999px',
      maxHeight: position ? `${position.maxHeight}px` : undefined,
    }
    : { '--keyboard-inset': `${keyboardInset}px` }

  return (
    <>
      {/* Closes on the full tap (click), so the tap that dismisses the
          editor is never passed on to whatever lies underneath. */}
      <div
        className={`editor-backdrop editor-backdrop-${layout}`}
        aria-hidden="true"
        onPointerDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onClose()
        }}
      />

      <div
        ref={surfaceRef}
        className={[
          'editor',
          `editor-${layout}`,
          entered ? 'is-entered' : '',
        ].join(' ')}
        style={style}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        // A click on the dialog's text keeps focus in the dialog.
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        {layout === 'narrow' && (
          <span
            className="editor-grabber"
            aria-hidden="true"
          />
        )}

        <div className="editor-header">
          <div className="editor-heading">
            <h2
              id={titleId}
              className="editor-title"
            >
              {title}
              {tag && (
                <span className="editor-tag">
                  <span aria-hidden="true"> · </span>
                  {tag}
                </span>
              )}
            </h2>

            {subtitle && <p className="editor-subtitle">{subtitle}</p>}
          </div>

          <button
            type="button"
            className="editor-done"
            onClick={onClose}
          >
            Done
          </button>
        </div>

        <div className="editor-body">
          {children}
        </div>
      </div>
    </>
  )
})

export default EditorSurface
