import { describeLocation } from './locationSearch'

/*
 * Ordinary-language lines for a selected location (one side of the body),
 * shown under the exact anatomical name:
 *   zoneArea(zone)      "Right kneecap", "Back of the knee · Right"
 *   zoneSubtitle(zone)  "Right kneecap · Front"
 *
 * Short familiar names read naturally after the side ("Right kneecap",
 * "Left heel"); descriptive phrases put the side after them ("Back of the
 * knee · Right"). Without a familiar name, the body region is used ("Right
 * knee"). Familiar names come from data/locationNames.js (lay terms awaiting
 * Eddie's review).
 */

function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

const FACE_WORD = { front: 'Front', back: 'Back' }

function sideWord(zone) {
  if (zone.side === 'left') return 'Left'
  if (zone.side === 'right') return 'Right'

  return null
}

// "kneecap", "ring finger", "shoulder blade": a short noun, not a phrase.
function isShortName(name) {
  return !/[,]| of | the /.test(` ${name} `) && name.split(' ').length <= 3
}

// Mirror-named locations already carry their side ("Left Flank").
function nameHasSide(zone) {
  return /^(Left|Right)\b/.test(zone.locationName)
}

function areaParts(zone) {
  const { commonName, area } = describeLocation(zone.locationName)
  const side = sideWord(zone)
  // No lay name: the body part ("hand" for the metacarpals, which the data
  // files under Finger), else the data's region.
  const thing = commonName ?? area ?? zone.region.toLowerCase()

  if (!side) return { text: capitalizeFirst(thing), long: !isShortName(thing) }

  // The familiar name already says the side ("lower right belly").
  if (nameHasSide(zone) && /\b(left|right)\b/i.test(thing)) {
    return { text: capitalizeFirst(thing), long: !isShortName(thing) }
  }

  if (isShortName(thing)) {
    // "Left left chest" -> "Left chest".
    const clean = nameHasSide(zone)
      ? thing.replace(/^(left|right)\s+/i, '')
      : thing

    return { text: `${side} ${clean}`, long: false }
  }

  return { text: `${capitalizeFirst(thing)} · ${side}`, long: true }
}

export function zoneArea(zone) {
  return zone ? areaParts(zone).text : ''
}

export function zoneSubtitle(zone) {
  if (!zone) return ''

  const { face } = describeLocation(zone.locationName)
  const { text, long } = areaParts(zone)
  const faceWord = FACE_WORD[face]

  // Descriptive phrases already say where they are ("Back of the knee").
  return faceWord && !long ? `${text} · ${faceWord}` : text
}
