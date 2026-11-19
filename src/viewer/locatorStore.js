import { useSyncExternalStore } from 'react'

/*
 * The miniature body pictures (front and back), made once from the loaded
 * 3D patient (see viewer/locatorSnapshot.js) and shared with the interface
 * outside the 3D canvas: the corner locator, the full-height panel and the
 * search results.
 */
let snapshot = null
const listeners = new Set()

export function setLocatorSnapshot(next) {
  snapshot = next
  listeners.forEach((listener) => listener())
}

export function getLocatorSnapshot() {
  return snapshot
}

export function subscribeToLocator(listener) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function useLocatorSnapshot() {
  return useSyncExternalStore(subscribeToLocator, getLocatorSnapshot, () => null)
}
