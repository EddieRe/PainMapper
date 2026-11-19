/*
 * PainMapper camera-framing checks (developer tool; not part of the app).
 *
 * The 3D view keeps the selected location in the middle of the part of the
 * viewer the learner can see (src/viewer/framing.js). These checks project
 * points with the same maths three.js uses for camera.setViewOffset and
 * confirm that:
 *   1. the look-at point lands in the middle of the uncovered area, for
 *      phone, desktop and keyboard-open layouts;
 *   2. the on-screen scale does not change when only the covers change
 *      (so a growing panel never shrinks the body);
 *   3. a region framed with distanceToFrame fits inside the uncovered area;
 *   4. fully covered viewers are reported as such.
 *
 * Run from the project folder:   node tools/framing-checks.mjs
 */
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const framing = await import(pathToFileURL(path.join(projectDir, 'src', 'viewer', 'framing.js')).href)

let failures = 0
let passes = 0

function check(description, condition, detail = '') {
  if (condition) {
    passes += 1
  } else {
    failures += 1
    console.log(`FAIL  ${description}${detail ? ` — ${detail}` : ''}`)
  }
}

const near = (a, b, tolerance = 0.5) => Math.abs(a - b) <= tolerance

/*
 * Screen position (CSS px) of a camera-space point (x right, y up, z = the
 * distance in front of the camera), following PerspectiveCamera's
 * updateProjectionMatrix with a view offset.
 */
function project(settings, point) {
  const top = Math.tan(((settings.fov * Math.PI) / 180) / 2)
  const height = 2 * top
  const width = settings.aspect * height
  let left = -0.5 * width
  let viewTop = top

  left += (settings.offsetX * width) / settings.fullWidth
  viewTop -= (settings.offsetY * height) / settings.fullHeight
  const viewWidth = width * (settings.width / settings.fullWidth)
  const viewHeight = height * (settings.height / settings.fullHeight)

  const x = point.x / point.z
  const y = point.y / point.z

  return {
    x: ((x - left) / viewWidth) * settings.width,
    y: ((viewTop - y) / viewHeight) * settings.height,
  }
}

const layouts = [
  { name: 'phone, compact panel', width: 390, height: 788, insets: { top: 118, bottom: 300 } },
  { name: 'phone, reading panel', width: 390, height: 788, insets: { top: 52, bottom: 465 } },
  { name: 'phone, editor + keyboard', width: 390, height: 788, insets: { top: 52, bottom: 560 } },
  { name: 'desktop', width: 834, height: 838, insets: { top: 84, bottom: 44 } },
  { name: 'landscape phone', width: 464, height: 328, insets: { top: 60, bottom: 20 } },
]

for (const layout of layouts) {
  const rect = framing.visibleRect(layout.width, layout.height, layout.insets)
  const settings = framing.viewOffsetFor(layout.width, layout.height, rect)

  check(`${layout.name}: an uncovered area is found`, rect !== null)

  const centre = project(settings, { x: 0, y: 0, z: 2 })

  check(`${layout.name}: look-at point is centred horizontally`, near(centre.x, rect.cx), `${centre.x.toFixed(1)} vs ${rect.cx}`)
  check(`${layout.name}: look-at point is centred vertically`, near(centre.y, rect.cy), `${centre.y.toFixed(1)} vs ${rect.cy}`)

  // Same scale as an uncovered canvas: 0.1 units at distance 2.
  const open = framing.viewOffsetFor(layout.width, layout.height, framing.visibleRect(layout.width, layout.height))
  const a = project(settings, { x: 0, y: 0.1, z: 2 })
  const b = project(open, { x: 0, y: 0.1, z: 2 })
  const scaleCovered = centre.y - a.y
  const scaleOpen = project(open, { x: 0, y: 0, z: 2 }).y - b.y

  check(`${layout.name}: covers do not change the on-screen size`, near(scaleCovered, scaleOpen, 0.01), `${scaleCovered.toFixed(3)} vs ${scaleOpen.toFixed(3)}`)

  // A knee-sized region framed at distanceToFrame fits the uncovered area.
  const [frameWidth, frameHeight] = framing.frameSizeFor('Knee')
  const distance = framing.distanceToFrame(frameWidth, frameHeight, rect, layout.height)
  const topEdge = project(settings, { x: 0, y: frameHeight / 2, z: distance })
  const bottomEdge = project(settings, { x: 0, y: -frameHeight / 2, z: distance })
  const leftEdge = project(settings, { x: -frameWidth / 2, y: 0, z: distance })
  const rightEdge = project(settings, { x: frameWidth / 2, y: 0, z: distance })

  check(`${layout.name}: framed region fits vertically`, topEdge.y >= rect.y0 - 0.5 && bottomEdge.y <= rect.y1 + 0.5,
    `${topEdge.y.toFixed(1)}–${bottomEdge.y.toFixed(1)} in ${rect.y0}–${rect.y1}`)
  check(`${layout.name}: framed region fits horizontally`, leftEdge.x >= rect.x0 - 0.5 && rightEdge.x <= rect.x1 + 0.5,
    `${leftEdge.x.toFixed(1)}–${rightEdge.x.toFixed(1)} in ${rect.x0}–${rect.x1}`)
  check(`${layout.name}: framed region fills one dimension`,
    near(bottomEdge.y - topEdge.y, rect.height, 1) || near(rightEdge.x - leftEdge.x, rect.width, 1))
}

check('a fully covered viewer has no uncovered area', framing.visibleRect(390, 788, { top: 0, bottom: 788 }) === null)
check('a zero-size canvas has no uncovered area', framing.visibleRect(0, 0) === null)

const thin = framing.visibleRect(390, 788, { top: 100, bottom: 640 })
check('a very thin uncovered strip is treated as at least the minimum height', thin && thin.height >= framing.MIN_VISIBLE_PX)

console.log(`\nFraming checks: ${passes} passed, ${failures} failed`)
process.exitCode = failures > 0 ? 1 : 0
