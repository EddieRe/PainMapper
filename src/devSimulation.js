/*
 * Development-only switches for checking error screens locally:
 *   http://localhost:5173/PainMapper/?simulate=model-error
 *   http://localhost:5173/PainMapper/?simulate=data-error
 * They are ignored in production builds (import.meta.env.DEV is false).
 */
function simulated() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null

  return new URLSearchParams(window.location.search).get('simulate')
}

export function simulateModelError() {
  return simulated() === 'model-error'
}

export function simulateDataError() {
  return simulated() === 'data-error'
}
