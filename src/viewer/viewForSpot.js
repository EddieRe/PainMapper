import { Raycaster, Vector3 } from 'three'
import { DEFAULT_VIEW_DIRECTION } from '../interaction/viewDirection'

/*
 * A viewpoint from which a chosen location is seen face-on, for locations
 * chosen by name (search, nearby, side switch).
 *
 * Milestone 3 turned the patient only when a spot was completely hidden.
 * Spots on the side of a limb or the trunk (lateral shoulder, flank, the
 * inner wrist) could then end up seen edge-on. Here each candidate direction
 * is scored by how squarely it faces the skin at the spot (its surface
 * normal) and rejected if another part of the body is in the way; the
 * current view is kept whenever it already faces the spot well, so the
 * learner's own viewpoint is preserved where possible.
 */

const KEEP_IF_FACING = 0.5
const ELEVATION = DEFAULT_VIEW_DIRECTION[1]
// Steepest downward tilt (as a direction's y) for locations on the front or
// back of the body.
const MAX_DROP = -0.35

/*
 * Locations the names data places on the front or back of the body are
 * looked at from that side, and never from below: a fold in the clothing or
 * the curve of the back can tilt the surface normal downwards (the pubic
 * area, the mid back), which would otherwise call for a view from between
 * the legs or from below the waist.
 */
function suitsFace(direction, face) {
  if (face !== 'front' && face !== 'back') return true
  if (direction.y < MAX_DROP) return false

  return face === 'front' ? direction.z > 0.1 : direction.z < -0.1
}

const raycaster = new Raycaster()

function horizontal(x, z) {
  const length = Math.hypot(x, z)

  return length < 1e-6 ? null : new Vector3(x / length, ELEVATION, z / length).normalize()
}

function candidatesFor(normal, current) {
  const list = [
    { direction: current.clone(), change: 0 },
    { direction: normal.clone(), change: 0.04 },
  ]

  const level = horizontal(normal.x, normal.z)

  if (level) list.push({ direction: level, change: 0.02 })

  for (let step = 0; step < 8; step += 1) {
    const angle = (step / 8) * Math.PI * 2

    list.push({
      direction: new Vector3(Math.sin(angle), ELEVATION, Math.cos(angle)).normalize(),
      change: 0.05,
    })
  }

  // From below (soles, inner thighs) and above (shoulders, top of the foot).
  list.push(
    { direction: new Vector3(0, -1, 0.35).normalize(), change: 0.12 },
    { direction: new Vector3(0, -1, -0.35).normalize(), change: 0.12 },
    { direction: new Vector3(0, 0.9, 0.45).normalize(), change: 0.12 },
  )

  return list
}

// Hits this close to the spot are its own skin or clothing layer, not
// another part of the body in the way.
const SAME_LAYER = 0.03

function blocked(point, normal, direction, distance, surfaces) {
  // Start just off the skin so the spot itself is not counted.
  const origin = point.clone().addScaledVector(normal, 0.012)

  raycaster.set(origin, direction)
  raycaster.near = SAME_LAYER
  raycaster.far = Math.max(0.2, distance)

  return raycaster.intersectObjects(surfaces, false).length > 0
}

/*
 * anchor: { point, normal } (world), currentDirection: unit vector from the
 * target to the camera, distance: the camera distance about to be used,
 * face: 'front' | 'back' | other (from the location names data).
 * Returns a unit direction to look from, or null to keep the current one.
 */
export function viewForSpot(anchor, currentDirection, distance, surfaces, { face = null } = {}) {
  if (!anchor || surfaces.length === 0) return null

  const point = new Vector3(...anchor.point)
  const normal = new Vector3(...anchor.normal).normalize()
  const current = currentDirection.clone().normalize()

  const currentFacing = current.dot(normal)
  const currentSuits = suitsFace(current, face)

  if (currentSuits && currentFacing >= KEEP_IF_FACING && !blocked(point, normal, current, distance, surfaces)) {
    return null
  }

  let best = null

  for (const { direction, change } of candidatesFor(normal, current)) {
    const facing = direction.dot(normal)

    if (facing <= 0.15) continue
    if (!suitsFace(direction, face)) continue
    if (blocked(point, normal, direction, distance, surfaces)) continue

    // Prefer facing the spot; break near-ties towards smaller turns and
    // familiar near-horizontal views.
    const turn = 1 - direction.dot(current)
    const score = facing - change - turn * 0.06 - Math.abs(direction.y) * 0.05

    if (!best || score > best.score) best = { direction, score }
  }

  if (!best) return null

  // Keep the current view if the best alternative is barely better.
  if (best.direction.equals(current) || best.score - currentFacing < 0.08) {
    return currentSuits && currentFacing > 0.15 && !blocked(point, normal, current, distance, surfaces)
      ? null
      : best.direction
  }

  return best.direction
}
