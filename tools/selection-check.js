/*
 * PainMapper selection check (developer tool; not part of the app).
 *
 * Simulates pointing at every anatomical location from many camera angles,
 * using the app's real body model, location placements and selection code,
 * and reports:
 *   - locations that can never be selected (should be none)
 *   - locations reachable only through the sidebar's "Nearby locations"
 *   - wrong-side selections: pointer on the patient's left but a right-side
 *     location chosen, or vice versa (should be zero)
 *   - what a click on the belly button from the default front view selects
 *
 * How to run:
 *   1. Start the dev server (npm run dev) and open
 *      http://localhost:5173/PainMapper/
 *   2. Open the browser console and run:
 *      (await import('/PainMapper/tools/selection-check.js')).runSelectionCheck()
 *   It takes about 30 seconds; the page is unresponsive meanwhile.
 *   The first run may reload the page once while new modules are prepared;
 *   if so, run the command again.
 *
 * Re-run this whenever nodePlacements.js, the model, or zonePicking.js
 * changes.
 */
import * as THREE from 'three'
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  loadCsv,
  LOCATION_CSV_PATH,
  parseLocationsCsv,
} from '../src/data/csvLoader.js'
import { buildZones } from '../src/data/zones.js'
import { buildPickSurface } from '../src/interaction/pickSurface.js'
import { pickZones } from '../src/interaction/zonePicking.js'

// Must match src/components/Model.jsx.
const MODEL_URL = '/PainMapper/models/model.glb'
const MODEL_SCALE = 1.2
const MODEL_POSITION = [0, -1.5, 0]

// Default camera in src/App.jsx: position (0, 0, 5.5), looking at the model centre.
const FRONT_CAMERA = new THREE.Vector3(0, 0, 5.5)
const BELLY_BUTTON = new THREE.Vector3(0, -0.235, 0.15)

const AZIMUTH_STEP_DEGREES = 20
const ELEVATIONS_DEGREES = [-45, -20, 0, 25, 55]
const CAMERA_DISTANCE = 3
const AIM_OFFSETS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]

async function buildScene() {
  const gltf = await new GLTFLoader().loadAsync(MODEL_URL)
  const bodyMeshes = buildPickSurface(gltf.scene).map((geometry) => {
    geometry.boundsTree = new MeshBVH(geometry)

    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
    )

    mesh.raycast = acceleratedRaycast
    mesh.scale.setScalar(MODEL_SCALE)
    mesh.position.set(...MODEL_POSITION)
    mesh.userData.pickRole = 'body'
    mesh.updateMatrixWorld(true)

    return mesh
  })

  const zones = buildZones(
    parseLocationsCsv(await loadCsv(LOCATION_CSV_PATH)),
  )

  const zoneMeshes = zones.map((zone) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(zone.radius, 24, 24),
      new THREE.MeshBasicMaterial(),
    )

    mesh.position.set(...zone.position)
    mesh.scale.set(...zone.scale)
    mesh.userData = { pickRole: 'zone', zoneId: zone.id }
    mesh.updateMatrixWorld(true)

    return mesh
  })

  return { zones, objects: [...bodyMeshes, ...zoneMeshes] }
}

function cameraDirections() {
  const directions = []

  for (let azimuth = 0; azimuth < 360; azimuth += AZIMUTH_STEP_DEGREES) {
    for (const elevation of ELEVATIONS_DEGREES) {
      const a = THREE.MathUtils.degToRad(azimuth)
      const e = THREE.MathUtils.degToRad(elevation)

      directions.push(new THREE.Vector3(
        Math.sin(a) * Math.cos(e),
        Math.sin(e),
        Math.cos(a) * Math.cos(e),
      ))
    }
  }

  return directions
}

export async function runSelectionCheck() {
  const startedAt = performance.now()
  const { zones, objects } = await buildScene()
  const raycaster = new THREE.Raycaster()

  function pickAlong(origin, target) {
    const direction = target.clone().sub(origin).normalize()

    raycaster.set(origin, direction)

    const hits = raycaster.intersectObjects(objects, false)

    return { hits, result: pickZones(hits, zones) }
  }

  const belly = pickAlong(FRONT_CAMERA, BELLY_BUTTON).result

  const chosenCount = {}
  const offeredCount = {}
  const wrongSide = []
  let rays = 0

  for (const zone of zones) {
    chosenCount[zone.locationName] = 0
    offeredCount[zone.locationName] = 0
  }

  for (const zone of zones) {
    const center = new THREE.Vector3(...zone.position)
    const aimRadius = zone.radius
      * ((zone.scale[0] + zone.scale[1] + zone.scale[2]) / 3)
      * 0.6

    for (const direction of cameraDirections()) {
      const origin = center.clone().addScaledVector(direction, CAMERA_DISTANCE)
      const up = Math.abs(direction.y) > 0.9
        ? new THREE.Vector3(1, 0, 0)
        : new THREE.Vector3(0, 1, 0)
      const across = new THREE.Vector3().crossVectors(direction, up).normalize()
      const upward = new THREE.Vector3().crossVectors(across, direction).normalize()

      for (const [s, t] of AIM_OFFSETS) {
        const target = center.clone()
          .addScaledVector(across, s * aimRadius)
          .addScaledVector(upward, t * aimRadius)

        const { hits, result } = pickAlong(origin, target)

        rays += 1

        if (!result.zone) continue

        chosenCount[result.zone.locationName] += 1

        for (const option of result.options) {
          if (option !== result.zone) {
            offeredCount[option.locationName] += 1
          }
        }

        // Wrong side: the skin point is clearly on one side of the body but
        // a location on the other side was chosen without its sphere being
        // directly under the pointer in front of the skin.
        const bodyIndex = hits.findIndex((hit) => hit.object.userData.pickRole === 'body')
        const zoneIndex = hits.findIndex((hit) => hit.object.userData.zoneId === result.zone.id)
        const inFront = zoneIndex !== -1 && (bodyIndex === -1 || zoneIndex < bodyIndex)
        const skinX = bodyIndex === -1 ? 0 : hits[bodyIndex].point.x

        if (
          bodyIndex !== -1
          && !inFront
          && result.zone.side !== 'center'
          && Math.abs(skinX) > 0.06
          && Math.sign(skinX) !== Math.sign(result.zone.position[0])
        ) {
          wrongSide.push(`${result.zone.locationName} (${result.zone.side}) at skin x=${skinX.toFixed(2)}`)
        }
      }
    }
  }

  const names = Object.keys(chosenCount)
  const report = {
    simulatedClicks: rays,
    seconds: Math.round((performance.now() - startedAt) / 1000),
    bellyButtonFromFront: belly.zone
      ? `${belly.zone.locationName} (${belly.zone.region})`
      : 'nothing',
    neverSelectable: names.filter(
      (name) => chosenCount[name] === 0 && offeredCount[name] === 0,
    ),
    onlyViaNearbyLocations: names.filter(
      (name) => chosenCount[name] === 0 && offeredCount[name] > 0,
    ),
    rarelySelected: names
      .filter((name) => chosenCount[name] > 0 && chosenCount[name] < 15)
      .map((name) => `${name}: ${chosenCount[name]}`),
    wrongSideSelections: wrongSide.length,
    wrongSideExamples: [...new Set(wrongSide)].slice(0, 10),
  }

  console.log('PainMapper selection check', report)

  return report
}
