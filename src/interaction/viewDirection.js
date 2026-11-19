import { Raycaster, Vector3 } from 'three'

/*
 * Chooses a camera direction from which a location can actually be seen,
 * for locations chosen from the list rather than clicked on the body.
 *
 * Location centres sit at or just under the skin. From the centre we look
 * outwards in a few standard directions and keep those where the ray leaves
 * the body once and nothing else (another limb, the torso) lies beyond.
 * Among those, the direction with the shortest way out to the skin wins,
 * with a slight preference for the standard front and back views.
 *
 * The current view is kept unless the location is clearly on the far side:
 * its way out towards the camera is blocked, or more than FAR_SIDE_MARGIN
 * longer than the shortest way out.
 */

// About 3 cm on this model (2.3 units tall).
const FAR_SIDE_MARGIN = 0.04

// Default framing: the whole patient, seen from the front, slightly above.
export const MODEL_CENTER = Object.freeze([0, -0.45, 0])
export const DEFAULT_CAMERA_DISTANCE = 4.3
export const DEFAULT_VIEW_DIRECTION = Object.freeze([0, 0.082, 1])

export const DEFAULT_CAMERA_POSITION = Object.freeze(
  new Vector3(...DEFAULT_VIEW_DIRECTION)
    .normalize()
    .multiplyScalar(DEFAULT_CAMERA_DISTANCE)
    .add(new Vector3(...MODEL_CENTER))
    .toArray(),
)

const CANDIDATES = [
  { direction: new Vector3(0, 0, 1), penalty: 0 }, // front
  { direction: new Vector3(0, 0, -1), penalty: 0 }, // back
  { direction: new Vector3(1, 0, 0), penalty: 0.01 }, // patient's left side
  { direction: new Vector3(-1, 0, 0), penalty: 0.01 }, // patient's right side
  { direction: new Vector3(0, -1, 0.35).normalize(), penalty: 0.02 }, // from below, front
  { direction: new Vector3(0, -1, -0.35).normalize(), penalty: 0.02 }, // from below, back
]

// Surfaces closer together than this count as one layer (skin and boxers).
const SAME_LAYER = 0.03

const raycaster = new Raycaster()

export function findBodySurfaces(scene) {
  const meshes = []

  scene.traverse((object) => {
    if (object.userData?.pickRole === 'body') meshes.push(object)
  })

  return meshes
}

function exitDistance(origin, direction, surfaces) {
  raycaster.set(origin, direction)

  const hits = raycaster.intersectObjects(surfaces, false)

  if (hits.length === 0) return 0

  const blocked = hits.some(
    (hit) => hit.distance > hits[0].distance + SAME_LAYER,
  )

  return blocked ? Infinity : hits[0].distance
}

function bestCandidate(point, surfaces) {
  let best = null

  for (const { direction, penalty } of CANDIDATES) {
    const exit = exitDistance(point, direction, surfaces)
    const score = exit + penalty

    if (exit !== Infinity && (!best || score < best.score)) {
      best = { direction, exit, score }
    }
  }

  return best
}

export function chooseViewDirection(point, surfaces) {
  return bestCandidate(point, surfaces)?.direction.clone() ?? null
}

/*
 * Returns a better viewing direction if the point is on the far side of the
 * body from the camera, or null if the current view already shows it.
 */
export function viewDirectionIfHidden(point, cameraPosition, surfaces) {
  const best = bestCandidate(point, surfaces)

  if (!best) return null

  const towardsCamera = cameraPosition.clone().sub(point).normalize()
  const currentExit = exitDistance(point, towardsCamera, surfaces)

  if (currentExit === Infinity || currentExit > best.exit + FAR_SIDE_MARGIN) {
    return best.direction.clone()
  }

  return null
}
