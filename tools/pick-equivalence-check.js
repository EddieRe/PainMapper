/*
 * PainMapper picking-equivalence check (developer tool; not part of the app).
 *
 * Milestone 4 speeds up pointer picking with a spatial index (three-mesh-bvh,
 * through drei's <Bvh>) on the invisible picking copy of the skin. This
 * check proves the index changes nothing: for the same rays the selection
 * check uses (every location, 90 camera directions, 5 aim points), it
 * compares the standard three.js ray test with the indexed one and reports
 * any difference in which surfaces are hit, where, and in what order, and
 * any difference in the location chosen by the app's own picking code.
 *
 * How to run (dev server running, page open):
 *   (await import('/PainMapper/tools/pick-equivalence-check.js')).runPickEquivalenceCheck()
 */
import * as THREE from 'three'
import { acceleratedRaycast, MeshBVH } from 'three-mesh-bvh'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  loadCsv,
  LOCATION_CSV_PATH,
  parseLocationsCsv,
} from '../src/data/csvLoader.js'
import { buildZones } from '../src/data/zones.js'
import { buildPickSurface } from '../src/interaction/pickSurface.js'
import { pickZones } from '../src/interaction/zonePicking.js'

// Must match src/components/Model.jsx and tools/selection-check.js.
const MODEL_URL = '/PainMapper/models/model.glb'
const MODEL_SCALE = 1.2
const MODEL_POSITION = [0, -1.5, 0]

const AZIMUTH_STEP_DEGREES = 20
const ELEVATIONS_DEGREES = [-45, -20, 0, 25, 55]
const CAMERA_DISTANCE = 3
const AIM_OFFSETS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]

function bodyMeshes(geometries, indexed) {
  return geometries.map((source) => {
    const geometry = source.clone()

    if (indexed) geometry.boundsTree = new MeshBVH(geometry)

    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }))

    if (indexed) mesh.raycast = acceleratedRaycast

    mesh.scale.setScalar(MODEL_SCALE)
    mesh.position.set(...MODEL_POSITION)
    mesh.userData.pickRole = 'body'
    mesh.updateMatrixWorld(true)

    return mesh
  })
}

export async function runPickEquivalenceCheck() {
  const startedAt = performance.now()
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const geometries = buildPickSurface(gltf.scene)
  const zones = buildZones(parseLocationsCsv(await loadCsv(LOCATION_CSV_PATH)))

  const zoneMeshes = zones.map((zone) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(zone.radius, 24, 24), new THREE.MeshBasicMaterial())

    mesh.position.set(...zone.position)
    mesh.scale.set(...zone.scale)
    mesh.userData = { pickRole: 'zone', zoneId: zone.id }
    mesh.updateMatrixWorld(true)

    return mesh
  })

  const standard = [...bodyMeshes(geometries, false), ...zoneMeshes]
  const indexed = [...bodyMeshes(geometries, true), ...zoneMeshes]
  const raycaster = new THREE.Raycaster()

  let rays = 0
  let hitDifferences = 0
  let choiceDifferences = 0
  let standardMs = 0
  let indexedMs = 0
  const examples = []

  // The index reorders triangles internally, so hits are compared by what
  // was hit and where (not by triangle number).
  const describe = (hits) => hits
    .map((hit) => [
      hit.object.userData.pickRole,
      hit.object.userData.zoneId ?? '',
      hit.distance.toFixed(5),
      hit.point.x.toFixed(5),
      hit.point.y.toFixed(5),
      hit.point.z.toFixed(5),
    ].join(':'))
    .join('|')

  for (const zone of zones) {
    const center = new THREE.Vector3(...zone.position)
    const aimRadius = zone.radius * ((zone.scale[0] + zone.scale[1] + zone.scale[2]) / 3) * 0.6

    for (let azimuth = 0; azimuth < 360; azimuth += AZIMUTH_STEP_DEGREES) {
      for (const elevation of ELEVATIONS_DEGREES) {
        const a = THREE.MathUtils.degToRad(azimuth)
        const e = THREE.MathUtils.degToRad(elevation)
        const direction = new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e))
        const origin = center.clone().addScaledVector(direction, CAMERA_DISTANCE)
        const up = Math.abs(direction.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)
        const across = new THREE.Vector3().crossVectors(direction, up).normalize()
        const upward = new THREE.Vector3().crossVectors(across, direction).normalize()

        for (const [s, t] of AIM_OFFSETS) {
          const target = center.clone()
            .addScaledVector(across, s * aimRadius)
            .addScaledVector(upward, t * aimRadius)

          raycaster.set(origin, target.clone().sub(origin).normalize())

          let time = performance.now()
          const plain = raycaster.intersectObjects(standard, false)
          standardMs += performance.now() - time

          time = performance.now()
          const fast = raycaster.intersectObjects(indexed, false)
          indexedMs += performance.now() - time

          rays += 1

          if (describe(plain) !== describe(fast)) {
            hitDifferences += 1
            if (examples.length < 5) examples.push({ zone: zone.id, plain: describe(plain).slice(0, 200), fast: describe(fast).slice(0, 200) })
          }

          const a1 = pickZones(plain, zones)
          const a2 = pickZones(fast, zones)

          if (a1.zone?.id !== a2.zone?.id || a1.options.map((z) => z.id).join() !== a2.options.map((z) => z.id).join()) {
            choiceDifferences += 1
          }
        }
      }
    }
  }

  const report = {
    rays,
    hitListDifferences: hitDifferences,
    chosenLocationDifferences: choiceDifferences,
    standardRaycastMs: Math.round(standardMs),
    indexedRaycastMs: Math.round(indexedMs),
    seconds: Math.round((performance.now() - startedAt) / 1000),
    examples,
  }

  console.log('PainMapper picking-equivalence check', report)

  return report
}
