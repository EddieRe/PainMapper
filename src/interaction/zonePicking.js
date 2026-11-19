/*
 * Decides which anatomical location is under the pointer.
 *
 * The patient's visible skin decides. We take the first point where the
 * pointer's ray meets the body surface, then choose the location sphere
 * whose centre is closest to that point. Closeness is measured relative to
 * each sphere's own size ("relative distance"): 1.0 means exactly on the
 * sphere's edge, 2.0 means one radius beyond it.
 *
 * Locations on the far side of the body are never close to the skin you
 * are pointing at, so they cannot be selected through the body.
 *
 * Several location spheres sit slightly inside the skin, so a location may
 * be chosen a little beyond its sphere's edge:
 * - up to PICK_RADIUS in relative distance, or
 * - up to PICK_GAP in model units for small spheres (the model is about
 *   2.3 units tall, so 0.035 units is roughly 2.5 cm on this adult model).
 * These values were tuned by simulating clicks on every location from many
 * angles (see docs/milestone-1-selection.md). A relative allowance of 2.0
 * or more began choosing locations on the wrong limb, so re-run that check
 * before changing these values or the placements in nodePlacements.js.
 *
 * Two fallbacks keep small targets usable:
 * - A sphere that sticks out in front of the skin (e.g. around a finger)
 *   still counts when the ray passes through it before reaching the skin.
 * - If the ray misses the skin entirely but touches a sphere, the point
 *   where it enters that first sphere is used instead of a skin point.
 *
 * Other locations close to the same point are returned as "options", so
 * overlapping locations (for example Patellar Facet under Patella) can be
 * chosen from the sidebar.
 *
 * Meshes are tagged by the components that create them:
 *   object.userData.pickRole === 'body'  the patient's skin / clothing
 *   object.userData.pickRole === 'zone'  a location sphere (with zoneId)
 */

export const PICK_RADIUS = 1.75
export const PICK_GAP = 0.035

export const NEARBY_RADIUS = 2.35
export const NEARBY_GAP = 0.05

// Maximum number of locations returned for one spot (chosen + alternatives).
export const MAX_SPOT_OPTIONS = 5

const NO_PICK = Object.freeze({ zone: null, options: [] })

export function zoneDistance(point, zone) {
  const [centerX, centerY, centerZ] = zone.position
  const [scaleX, scaleY, scaleZ] = zone.scale
  const { radius } = zone

  return Math.hypot(
    (point.x - centerX) / (radius * scaleX),
    (point.y - centerY) / (radius * scaleY),
    (point.z - centerZ) / (radius * scaleZ),
  )
}

// Distance in model units from the sphere's surface out to the point.
function surfaceGap(point, zone, relativeDistance) {
  if (relativeDistance <= 1) return 0

  const [centerX, centerY, centerZ] = zone.position
  const fromCenter = Math.hypot(
    point.x - centerX,
    point.y - centerY,
    point.z - centerZ,
  )

  return fromCenter * (1 - 1 / relativeDistance)
}

const NO_ZONE_IDS = new Set()

export function pickZones(
  intersections,
  zones,
  options = {},
) {
  let bodyHit = null
  let firstZoneHit = null
  const zoneIdsInFrontOfSkin = new Set()

  // Intersections arrive sorted nearest-first.
  for (const hit of intersections) {
    const { pickRole, zoneId } = hit.object.userData ?? {}

    if (pickRole === 'body') {
      bodyHit = hit
      break
    }

    if (pickRole === 'zone') {
      firstZoneHit ??= hit
      zoneIdsInFrontOfSkin.add(zoneId)
    }
  }

  const referenceHit = bodyHit ?? firstZoneHit

  if (!referenceHit) return NO_PICK

  return rankZonesAtPoint(referenceHit.point, zones, {
    ...options,
    inFrontIds: bodyHit !== null ? zoneIdsInFrontOfSkin : NO_ZONE_IDS,
  })
}

/*
 * Locations near a zone chosen without clicking (from the location list or
 * the side switch), so the sidebar can offer the same "Nearby locations".
 * The zone itself is always first.
 */
export function nearbyZonesFor(zone, zones) {
  const [x, y, z] = zone.position
  const { options } = rankZonesAtPoint({ x, y, z }, zones)

  return [zone, ...options.filter((option) => option.id !== zone.id)]
    .slice(0, MAX_SPOT_OPTIONS)
}

export function rankZonesAtPoint(
  point,
  zones,
  {
    pickRadius = PICK_RADIUS,
    pickGap = PICK_GAP,
    nearbyRadius = NEARBY_RADIUS,
    nearbyGap = NEARBY_GAP,
    maxOptions = MAX_SPOT_OPTIONS,
    inFrontIds = NO_ZONE_IDS,
  } = {},
) {
  const scored = zones
    .map((zone) => {
      const distance = zoneDistance(point, zone)

      return {
        zone,
        distance,
        gap: surfaceGap(point, zone, distance),
        inFront: inFrontIds.has(zone.id),
      }
    })
    .sort((a, b) => a.distance - b.distance)

  const underPointer = scored.filter(
    (entry) =>
      entry.inFront
      || entry.distance <= pickRadius
      || entry.gap <= pickGap,
  )

  if (underPointer.length === 0) return NO_PICK

  const chosen = underPointer[0]

  const options = scored
    .filter(
      (entry) =>
        entry === chosen
        || entry.inFront
        || entry.distance <= nearbyRadius
        || entry.gap <= nearbyGap,
    )
    .slice(0, maxOptions)
    .map((entry) => entry.zone)

  return {
    zone: chosen.zone,
    options,
  }
}
