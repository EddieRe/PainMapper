/*
 * Which part of the 3D viewer is covered by other parts of the interface.
 *
 * The layout registers a function that measures its covers (the phone
 * panel, a detail editor, the floating toolbar); the camera rig asks for the
 * current covers every frame, so the selected location stays centred in the
 * uncovered area while a panel moves. Nothing here causes React renders.
 */

const NONE = Object.freeze({ top: 0, bottom: 0, left: 0, right: 0 })

let provider = null

/*
 * fn(canvasRect: DOMRect) => { top, bottom, left, right } in CSS px.
 * Returns an unregister function.
 */
export function setViewInsetsProvider(fn) {
  provider = fn

  return () => {
    if (provider === fn) provider = null
  }
}

export function readViewInsets(canvasRect) {
  if (!provider || !canvasRect) return NONE

  try {
    return provider(canvasRect) ?? NONE
  } catch {
    return NONE
  }
}

/*
 * How far the on-screen keyboard (or other browser UI) pushes up from the
 * bottom of the layout viewport, in CSS px. Uses the Visual Viewport API,
 * which reports the keyboard on both iOS Safari and Android Chrome.
 *
 * Development builds accept window.__painmapperTestKeyboard = <px> so the
 * keyboard can be simulated in automated checks (no real keyboard there).
 */
export function keyboardInset() {
  if (typeof window === 'undefined') return 0

  if (import.meta.env.DEV && typeof window.__painmapperTestKeyboard === 'number') {
    return Math.max(0, window.__painmapperTestKeyboard)
  }

  const viewport = window.visualViewport

  if (!viewport) return 0

  const covered = window.innerHeight - (viewport.height + viewport.offsetTop)

  // Ignore small differences (browser toolbars collapsing while scrolling).
  return covered > 80 ? Math.round(covered) : 0
}

const keyboardListeners = new Set()

function notifyKeyboard() {
  keyboardListeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.visualViewport?.addEventListener('resize', notifyKeyboard)
  window.visualViewport?.addEventListener('scroll', notifyKeyboard)
  window.addEventListener('resize', notifyKeyboard)

  if (import.meta.env.DEV) {
    window.addEventListener('painmapper-test-keyboard', notifyKeyboard)
  }
}

export function subscribeToKeyboard(listener) {
  keyboardListeners.add(listener)

  return () => keyboardListeners.delete(listener)
}
