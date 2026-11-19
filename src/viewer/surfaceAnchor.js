import { Raycaster, Vector3 } from 'three'
import { findBodySurfaces } from '../interaction/viewDirection'

/*
 * Where a location meets the skin, and which way the skin faces there.
 *
 * Location centres sit at or just under the skin. From the centre we cast
 * rays in 26 directions against the invisible picking copy of the skin and
 * keep the closest hit: its point is where the selection dot and label
 * attach, and its face normal says which way the spot faces (used to hide
 * the label when the spot faces away, and to keep the highlight on the
 * right side of thin parts such as fingers).
 *
 * Results are cached per scene and location.
 */

const DIRECTIONS = []

for (const x of [-1, 0, 1]) {
  for (const y of [-1, 0, 1]) {
    for (const z of [-1, 0, 1]) {
      if (x || y || z) DIRECTIONS.push(new Vector3(x, y, z).normalize())
    }
  }
}

const raycaster = new Raycaster()
const cache = new WeakMap()

// Skin and the clothing over it count as one layer when this close (world
// units; about 4 cm on this model).
const OUTER_LAYER_GAP = 0.05

export function surfaceAnchorFor(zone, scene) {
  if (!zone || !scene) return null

  let byZone = cache.get(scene)

  if (!byZone) {
    byZone = new Map()
    cache.set(scene, byZone)
  }

  if (byZone.has(zone.id)) return byZone.get(zone.id)

  const surfaces = findBodySurfaces(scene)

  if (surfaces.length === 0) return null

  const center = new Vector3(...zone.position)
  let best = null

  raycaster.near = 0
  raycaster.far = 0.5

  for (const direction of DIRECTIONS) {
    raycaster.set(center, direction)

    const hit = raycaster.intersectObjects(surfaces, false)[0]

    if (hit && (!best || hit.distance < best.distance)) best = { ...hit, ray: direction }
  }

  if (!best?.face) {
    byZone.set(zone.id, null)
    return null
  }

  // Where clothing covers the skin (the boxers), the visible surface is the
  // outer layer: when the closest hit is the skin seen from inside (the
  // centre is under the skin), follow the ray outwards through layers that
  // lie within a few centimetres and anchor on the outermost. A centre
  // outside the skin is anchored where the ray first meets it.
  const ray = best.ray
  const outward = (hit) => hit.face.normal.clone()
    .transformDirection(hit.object.matrixWorld)
    .dot(ray) > 0

  if (outward(best)) {
    raycaster.set(center, ray)
    raycaster.far = best.distance + OUTER_LAYER_GAP

    for (const hit of raycaster.intersectObjects(surfaces, false)) {
      if (!hit.face || hit.distance <= best.distance) continue

      // Entering another surface (a neighbouring finger, the other leg):
      // that is not a covering layer, so stop.
      if (!outward(hit)) break

      best = { ...hit, ray }
    }
  }

  const normal = best.face.normal.clone()
    .transformDirection(best.object.matrixWorld)

  const anchor = {
    point: best.point.toArray(),
    normal: normal.toArray(),
    depth: best.distance,
  }

  byZone.set(zone.id, anchor)

  return anchor
}
