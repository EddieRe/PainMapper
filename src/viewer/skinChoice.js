import { useSyncExternalStore } from 'react'
import { loadedModel } from '../modelLoader'
import {
  getOriginalSkinStatus,
  resetOriginalError,
  subscribeToOriginalSkin,
  warmOriginal,
} from './originalSkin'

/*
 * Which skin is asked for: Gray ('neutral', the default) or Original. Kept
 * here, outside the components, because two places offer the choice: the
 * Skin control in the 3D view's corner and the header's "•••" menu (the way
 * to it where a small screen leaves the corner control no room). It is not
 * saved: every load starts Gray.
 *
 * - attempt restarts a failed preparation ("Try again");
 * - available: the 3D patient is ready and in view (there is nothing to
 *   re-skin before, and no point behind a panel that covers it);
 * - viaMenu: Original was last asked for from the menu, so the menu button
 *   shows how it is going (the corner control may not be on screen);
 * - changed: the learner has changed the skin since the model loaded (so
 *   a return to Gray is announced, but the Gray every load starts with is
 *   not).
 *
 * Only the 3D view and the header read this, so a change of skin does not
 * re-render the rest of the app.
 */
const START = { appearance: 'neutral', attempt: 0, available: false, viaMenu: false, changed: false }

let choice = Object.freeze({ ...START })

const listeners = new Set()

function update(next) {
  choice = Object.freeze({ ...choice, ...next })
  listeners.forEach((listener) => listener())
}

export function subscribeToSkinChoice(listener) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function getSkinChoice() {
  return choice
}

// Choosing Gray after a failed preparation also leaves the failure behind
// (the next Original starts afresh, with no stale error on screen).
export function chooseSkin(next, { viaMenu = false } = {}) {
  if (next === 'neutral' && getOriginalSkinStatus().phase === 'error') resetOriginalError()

  const fromMenu = next === 'original' && viaMenu

  if (next !== choice.appearance || fromMenu !== choice.viaMenu) {
    update({ appearance: next, viaMenu: fromMenu, changed: true })
  }
}

export function retryOriginalSkin({ viaMenu = false } = {}) {
  resetOriginalError()
  update({ appearance: 'original', attempt: choice.attempt + 1, viaMenu, changed: true })
}

// A (re)loaded model starts Gray, as every load does.
export function resetSkinChoice() {
  if (choice.appearance !== 'neutral' || choice.viaMenu || choice.changed) {
    update({ appearance: 'neutral', viaMenu: false, changed: false })
  }
}

export function setSkinAvailable(available) {
  if (available !== choice.available) update({ available })
}

const originalPhase = () => getOriginalSkinStatus().phase

function warm() {
  warmOriginal(loadedModel())
}

const ONLY_THE_PICTURE = 'Changes only the picture'

/*
 * The "•••" menu's Skin entries, each named for what it will do, and the
 * mark on the menu button while an Original asked for from the menu is
 * being prepared ('busy') or has failed ('alert'). After a failure there are
 * two entries: keep Gray (first, where "Show gray skin" was, so a press
 * meant for that one still ends in Gray) or try again.
 *
 * Reads the preparation's phase only (not its progress steps).
 */
export function useSkinMenu() {
  const { appearance, available, viaMenu } = useSyncExternalStore(subscribeToSkinChoice, getSkinChoice)
  const phase = useSyncExternalStore(subscribeToOriginalSkin, originalPhase)
  const failed = appearance === 'original' && phase === 'error'
  const pending = appearance === 'original' && phase !== 'ready' && phase !== 'error'

  let items

  if (appearance !== 'original') {
    items = [{
      id: 'skin-original',
      label: 'Show original skin',
      hint: ONLY_THE_PICTURE,
      onSelect: () => chooseSkin('original', { viaMenu: true }),
      onIntent: warm,
    }]
  } else if (failed) {
    items = [{
      id: 'skin-gray',
      label: 'Keep gray skin',
      hint: 'The original skin couldn’t be prepared',
      onSelect: () => chooseSkin('neutral'),
    }, {
      id: 'skin-retry',
      label: 'Try original skin again',
      hint: 'The body stays gray until it is ready',
      onSelect: () => retryOriginalSkin({ viaMenu: true }),
    }]
  } else {
    items = [{
      id: 'skin-gray',
      label: 'Show gray skin',
      hint: pending ? 'Preparing the original skin…' : ONLY_THE_PICTURE,
      onSelect: () => chooseSkin('neutral'),
    }]
  }

  if (!available) {
    items = items.map((item) => ({
      ...item,
      hint: 'When the 3D patient is showing',
      disabled: true,
      onIntent: undefined,
    }))
  }

  let mark = null

  if (viaMenu && failed) mark = { kind: 'alert', text: 'The original skin couldn’t be prepared' }
  else if (viaMenu && pending) mark = { kind: 'busy', text: 'Preparing the original skin' }

  return { items, mark }
}
