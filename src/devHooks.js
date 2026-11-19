/*
 * Development-only read-outs for automated checks of the interface
 * (camera framing, panel state, selection). Production builds strip this:
 * import.meta.env.DEV is false there, so nothing is attached to window.
 *
 *   window.__painmapper.camera()      orientation, distance, target, visible area
 *   window.__painmapper.selection()   the selected location and its screen point
 *   window.__painmapper.sheet()       the phone panel's state
 */
const hooks = {}

export function registerDevHook(name, read) {
  if (!import.meta.env.DEV || typeof window === 'undefined') return () => {}

  hooks[name] = read
  window.__painmapper = hooks

  return () => {
    if (hooks[name] === read) delete hooks[name]
  }
}
