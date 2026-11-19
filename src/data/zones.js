import {
  DEFAULT_NODE_SCALE,
  nodePlacements,
} from './nodePlacements'

const DEFAULT_ZONE_RADIUS = 0.085

function createZoneId(side, locationName) {
  const normalizedLocation = String(locationName)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return `${side}_${normalizedLocation}`
}

/*
 * One "zone" is one clickable sphere on the model: a location from
 * locations.csv placed on one side of the body (left, right or center).
 */
export function buildZones(locations) {
  return locations.flatMap((location) => {
    const placements = nodePlacements[location.name]

    if (!placements) {
      console.warn(
        `No placement is configured for "${location.name}".`,
      )

      return []
    }

    return placements.map((placement, index) => {
      const side = placement.side ?? `node_${index}`

      return {
        id: createZoneId(side, location.name),
        locationName: location.name,
        region: location.region,
        side,
        position: placement.position,
        scale: placement.scale ?? DEFAULT_NODE_SCALE,
        radius: placement.radius ?? DEFAULT_ZONE_RADIUS,
      }
    })
  })
}

// Head-to-toe order used when listing locations by body region.
export const REGION_ORDER = Object.freeze([
  'Neck',
  'Chest',
  'Upper Back',
  'Abdomen',
  'Lower Back',
  'Shoulder',
  'Elbow',
  'Wrist',
  'Hand',
  'Finger',
  'Hip',
  'Knee',
  'Ankle',
  'Foot',
  'Toe',
])

/*
 * How much of the body to show (height, in model units; the whole patient
 * is about 2.3) when the camera turns to a location chosen from the list or
 * "Show selected". Small regions get a closer view.
 */
const FRAME_HEIGHT_BY_REGION = {
  Finger: 0.5,
  Toe: 0.5,
  Hand: 0.7,
  Foot: 0.7,
  Wrist: 0.75,
  Ankle: 0.95,
  Elbow: 1.0,
  Knee: 1.1,
  Neck: 1.2,
  Shoulder: 1.3,
  Hip: 1.4,
  Chest: 1.5,
  Abdomen: 1.5,
  'Upper Back': 1.5,
  'Lower Back': 1.5,
}

export function frameHeightFor(zone) {
  return FRAME_HEIGHT_BY_REGION[zone?.region] ?? 1.4
}

// "R" / "L" marker used on screen edges and on the location card.
export function sideLetter(side) {
  if (side === 'left') return 'L'
  if (side === 'right') return 'R'

  return null
}

export function regionRank(region) {
  const index = REGION_ORDER.indexOf(region)

  return index === -1 ? REGION_ORDER.length : index
}

/*
 * One entry per location (not per side) for the searchable location list,
 * with how many conditions the dataset maps to it.
 */
export function buildLocationEntries(locations, zones, conditionCountFor) {
  return locations
    .map((location) => ({
      name: location.name,
      region: location.region,
      zones: zones.filter((zone) => zone.locationName === location.name),
      conditionCount: conditionCountFor(location.name),
    }))
    .filter((entry) => entry.zones.length > 0)
    .sort((a, b) =>
      regionRank(a.region) - regionRank(b.region)
      || a.region.localeCompare(b.region),
    )
}

/*
 * The same location on the other side of the body, if it has one: either
 * the other side of a bilateral location (Patella), or the mirror-named
 * location ("Left Flank" <-> "Right Flank").
 */
export function counterpartZone(zone, zones) {
  if (!zone || (zone.side !== 'left' && zone.side !== 'right')) return null

  const otherSide = zone.side === 'left' ? 'right' : 'left'

  const sameLocation = zones.find(
    (candidate) =>
      candidate.locationName === zone.locationName
      && candidate.side === otherSide,
  )

  if (sameLocation) return sameLocation

  const mirroredName = zone.locationName.replace(
    /^(Left|Right)\b/,
    (word) => (word === 'Left' ? 'Right' : 'Left'),
  )

  if (mirroredName === zone.locationName) return null

  return zones.find(
    (candidate) =>
      candidate.locationName === mirroredName
      && candidate.side === otherSide,
  ) ?? null
}

export function describeSide(side) {
  if (side === 'left') return "Patient's left"
  if (side === 'right') return "Patient's right"

  return 'Midline'
}

/*
 * Plain-language body area for a zone, from the patient's perspective:
 * "Left knee", "Right upper back", or just "Lower back" for midline zones.
 */
export function describeZoneArea(zone) {
  if (!zone) return ''

  const region = zone.region.toLowerCase()

  if (zone.side === 'left') return `Left ${region}`
  if (zone.side === 'right') return `Right ${region}`

  return region.charAt(0).toUpperCase() + region.slice(1)
}
