import { useSyncExternalStore } from 'react'
import { keyboardInset, subscribeToKeyboard } from './viewInsets'

/*
 * Two arrangements:
 *   'wide'   the 3D viewer beside the information panel (desktops, laptops,
 *            landscape tablets and landscape phones);
 *   'narrow' the viewer with a movable panel over its lower part (phones and
 *            portrait tablets).
 * Chosen from the actual window shape, not the device type.
 */
const WIDE_QUERY = '(min-width: 900px), (min-width: 560px) and (min-aspect-ratio: 23/20)'

function subscribeToMedia(query) {
  return (listener) => {
    if (typeof window === 'undefined' || !window.matchMedia) return () => {}

    const list = window.matchMedia(query)

    list.addEventListener('change', listener)

    return () => list.removeEventListener('change', listener)
  }
}

function matches(query) {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(query).matches
}

const subscribeWide = subscribeToMedia(WIDE_QUERY)

export function useLayoutMode() {
  return useSyncExternalStore(
    subscribeWide,
    () => (matches(WIDE_QUERY) ? 'wide' : 'narrow'),
    () => 'wide',
  )
}

const subscribeFinePointer = subscribeToMedia('(pointer: fine)')

// True for a mouse or trackpad; false for touch-first devices.
export function useFinePointer() {
  return useSyncExternalStore(
    subscribeFinePointer,
    () => matches('(pointer: fine)'),
    () => true,
  )
}

const subscribeReducedMotion = subscribeToMedia('(prefers-reduced-motion: reduce)')

export function useReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => matches('(prefers-reduced-motion: reduce)'),
    () => false,
  )
}

// Height of the on-screen keyboard (0 when closed), in CSS px.
export function useKeyboardInset() {
  return useSyncExternalStore(subscribeToKeyboard, keyboardInset, () => 0)
}
