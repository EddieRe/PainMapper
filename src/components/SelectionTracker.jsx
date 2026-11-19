import { useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useMemo, useRef } from 'react'
import { Matrix4, Raycaster, Vector3 } from 'three'
import { registerDevHook } from '../devHooks'
import { findBodySurfaces } from '../interaction/viewDirection'
import { readViewInsets } from '../layout/viewInsets'
import { visibleRect } from '../viewer/framing'
import { surfaceAnchorFor } from '../viewer/surfaceAnchor'

/*
 * Keeps the selected location's label attached to the body.
 *
 * Runs inside the 3D canvas: every frame it projects the point where the
 * location meets the skin to the screen and moves the label elements (which
 * live outside the canvas, in `overlayRef`) without any React render. The
 * label is hidden when the spot faces away from the camera, is behind
 * another part of the body, or lies outside the uncovered part of the view.
 *
 * Label placement: up and to the left of the spot, as on the reference
 * boards, else the first of the other positions around it that stays inside
 * the uncovered area, clear of the highlighted patch (its projected size)
 * and of the viewer's controls. The label keeps its position while that
 * stays clear, so it does not jump about. Where nothing fits, only the dot
 * is shown: the label never covers the spot.
 */

const LABEL_GAP_X = 44
const LABEL_GAP_Y = 24
const LABEL_GAP_X_WIDE = 76
const LABEL_GAP_Y_WIDE = 38
const EDGE_MARGIN = 12
const SPOT_CLEARANCE = 8
const CONTROL_CLEARANCE = 6
const OCCLUSION_INTERVAL_MS = 110
const CONTROLS_INTERVAL_MS = 400
// Frames the preferred position must fit before the label moves back to it.
const SETTLE_FRAMES = 18
// Controls the label keeps clear of (inside the viewer, or riding on the
// phone panel's top edge).
const CONTROLS = [
  '.search-host-narrow',
  '.viewer-search',
  '.viewer-toolbar',
  '.edge-label',
  '.zoom-controls',
  '.mini-locator-corner',
  '.sheet-above',
  // The Skin control and its status (bottom-right corner).
  '.skin-capsule',
  '.skin-status',
]
// The highlight's soft edge reaches a little past its radius.
const SPOT_EDGE = 1.12

const point = new Vector3()
const projected = new Vector3()
const edge = new Vector3()
const screenUp = new Vector3()
const toCamera = new Vector3()
const toSpot = new Vector3()
const normal = new Vector3()
const raycaster = new Raycaster()

function distanceToBox(x, y, box) {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.w))
  const dy = Math.max(box.y - y, 0, y - (box.y + box.h))

  return Math.hypot(dx, dy)
}

function insideRect(box, rect, margin = EDGE_MARGIN) {
  return box.x >= rect.x0 + margin
    && box.y >= rect.y0 + margin
    && box.x + box.w <= rect.x1 - margin
    && box.y + box.h <= rect.y1 - margin
}

function hitsControl(box, controls) {
  return controls.some((control) => !(
    box.x + box.w + CONTROL_CLEARANCE <= control.x0
    || control.x1 + CONTROL_CLEARANCE <= box.x
    || box.y + box.h + CONTROL_CLEARANCE <= control.y0
    || control.y1 + CONTROL_CLEARANCE <= box.y
  ))
}

// Where the label can go, in order of preference. `meet`: how far down the
// label's side the leader meets it (its lower part when the label is above
// the spot, as on the boards).
function placements(x, y, w, h, gapX, gapY, radius) {
  const sideGap = Math.max(gapX, radius + 14)
  const upY = y - gapY - h * 0.65
  const downY = y + gapY - h * 0.35

  return [
    { name: 'upper-left', x: x - sideGap - w, y: upY, meet: 0.65 },
    { name: 'upper-right', x: x + sideGap, y: upY, meet: 0.65 },
    { name: 'lower-left', x: x - sideGap - w, y: downY, meet: 0.35 },
    { name: 'lower-right', x: x + sideGap, y: downY, meet: 0.35 },
    { name: 'above', x: x - w / 2, y: y - radius - 16 - h, meet: 1 },
    { name: 'below', x: x - w / 2, y: y + radius + 16, meet: 0 },
    // Level with the spot (short views).
    { name: 'left', x: x - sideGap - w, y: y - h / 2, meet: 0.5 },
    { name: 'right', x: x + sideGap, y: y - h / 2, meet: 0.5 },
  ].map((place) => ({ ...place, w, h }))
}

// The preferred position that fits, and the current one if it still fits.
function fittingPlacements(options, previous, fits) {
  const current = options.find((place) => place.name === previous)

  return {
    best: options.find(fits) ?? null,
    kept: current && fits(current) ? current : null,
  }
}

// The controls' boxes in the canvas's coordinates.
function measureControls(canvasRect) {
  const boxes = []

  for (const selector of CONTROLS) {
    for (const element of document.querySelectorAll(selector)) {
      const box = element.getBoundingClientRect()

      if (box.width === 0 || box.height === 0) continue

      boxes.push({
        x0: box.left - canvasRect.left,
        y0: box.top - canvasRect.top,
        x1: box.right - canvasRect.left,
        y1: box.bottom - canvasRect.top,
      })
    }
  }

  return boxes
}

export default memo(function SelectionTracker({ zone, overlayRef }) {
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)

  const state = useRef({
    occluded: false,
    lastCheck: 0,
    lastMatrix: new Matrix4(),
    placement: null,
    visible: false,
    labelShown: true,
    screen: null,
    controls: [],
    measuredAt: -Infinity,
  })
  // The label's elements and what was last written to them (written only
  // when it changes).
  const dom = useRef({
    elements: null,
    labelSize: { w: 0, h: 0 },
    labelText: '',
    written: { label: '', dot: '', leader: '' },
  })

  // Re-measure for each selection (cached per location).
  const anchorKey = zone?.id ?? null
  const anchor = useMemo(
    () => (zone ? surfaceAnchorFor(zone, scene) : null),
    // The scene is stable; the anchor depends on which location is chosen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [anchorKey, scene],
  )
  // The highlighted patch's radius (it is drawn as an ellipsoid).
  const spotRadius = zone ? Math.max(...zone.scale) * zone.radius * SPOT_EDGE : 0

  useEffect(() => {
    state.current.placement = null
    state.current.occluded = false
    state.current.lastCheck = 0
    state.current.measuredAt = -Infinity
  }, [anchorKey])

  useEffect(() => registerDevHook('selection', () => ({
    zone: zone ? { id: zone.id, name: zone.locationName, side: zone.side } : null,
    anchor,
    labelVisible: state.current.visible,
    labelShown: state.current.visible && state.current.labelShown,
    placement: state.current.placement,
    screen: state.current.screen,
    spotRadius: state.current.radius ?? null,
  })), [zone, anchor])

  useFrame(({ clock }) => {
    const overlay = overlayRef.current

    if (!overlay) return

    const tracker = state.current

    if (!zone || !anchor) {
      if (tracker.visible) {
        overlay.dataset.visible = 'false'
        tracker.visible = false
      }

      return
    }

    point.fromArray(anchor.point)
    normal.fromArray(anchor.normal)
    toCamera.copy(camera.position).sub(point)

    const distance = toCamera.length()
    const facing = normal.dot(toCamera.normalize()) > 0.08

    // Occlusion: is another part of the body between the camera and the
    // spot? Checked only when the camera has moved, a few times a second.
    const now = clock.elapsedTime * 1000

    if (
      facing
      && (!tracker.lastMatrix.equals(camera.matrixWorld) || tracker.lastCheck === 0)
      && now - tracker.lastCheck > OCCLUSION_INTERVAL_MS
    ) {
      tracker.lastCheck = now
      tracker.lastMatrix.copy(camera.matrixWorld)

      const surfaces = findBodySurfaces(scene)

      raycaster.set(camera.position, toSpot.copy(point).sub(camera.position).normalize())
      raycaster.near = 0
      raycaster.far = distance + 0.05

      const hit = raycaster.intersectObjects(surfaces, false)[0]

      tracker.occluded = Boolean(hit && hit.distance < distance - 0.035)
    }

    projected.copy(point).project(camera)

    const x = ((projected.x + 1) / 2) * size.width
    const y = ((1 - projected.y) / 2) * size.height
    const canvasRect = gl.domElement.getBoundingClientRect()
    const rect = visibleRect(size.width, size.height, readViewInsets(canvasRect))

    const inView = rect
      && projected.z < 1
      && x >= rect.x0 + 4 && x <= rect.x1 - 4
      && y >= rect.y0 + 4 && y <= rect.y1 - 4

    const visible = Boolean(facing && !tracker.occluded && inView)

    if (visible !== tracker.visible) {
      overlay.dataset.visible = visible ? 'true' : 'false'
      tracker.visible = visible
    }

    if (!visible) {
      tracker.screen = null
      return
    }

    tracker.screen = { x, y }

    // The label's parts, looked up once (again if they were replaced).
    const cache = dom.current
    let elements = cache.elements

    if (!elements || !overlay.contains(elements.label)) {
      const label = overlay.querySelector('.selection-label')
      const dot = overlay.querySelector('.selection-dot')
      const leader = overlay.querySelector('.selection-leader line')

      if (!label || !dot || !leader) return

      elements = { label, dot, leader }
      cache.elements = elements
      cache.written = { label: '', dot: '', leader: '' }
      cache.labelText = ''
    }

    // Sizes and the controls' boxes are measured a few times a second, and
    // at once when the label's text or form changes (not every frame).
    const labelText = elements.label.textContent
    const short = overlay.dataset.short === 'true'

    if (
      labelText !== cache.labelText
      || short !== cache.short
      || now - tracker.measuredAt > CONTROLS_INTERVAL_MS
    ) {
      const measured = { w: elements.label.offsetWidth, h: elements.label.offsetHeight }

      cache.labelText = labelText
      cache.short = short
      cache.labelSize = measured
      if (!short) cache.fullSize = measured
      tracker.measuredAt = now
      tracker.controls = measureControls(canvasRect)
    }

    // The patch's size on screen: its radius, projected at the spot.
    screenUp.setFromMatrixColumn(camera.matrixWorld, 1)
    edge.copy(point).addScaledVector(screenUp, spotRadius).project(camera)

    const radius = Math.abs(edge.y - projected.y) * 0.5 * size.height

    tracker.radius = radius

    const { w, h } = cache.labelSize
    // Leader about 50 px long on phones and 86 px on wide screens, at
    // roughly 26° (reference boards); longer for a large patch.
    const wideView = size.width >= 600
    const gapX = wideView ? LABEL_GAP_X_WIDE : LABEL_GAP_X
    const gapY = wideView ? LABEL_GAP_Y_WIDE : LABEL_GAP_Y
    // In the uncovered area; else, in a short view, anywhere above the
    // panel that leaves the controls clear (the band beside the toolbar).
    const aboveCovers = { x0: rect.x0, y0: 0, x1: rect.x1, y1: rect.y1 }

    function placeLabel(labelWidth, labelHeight) {
      const options = placements(x, y, labelWidth, labelHeight, gapX, gapY, radius)
      const clear = (place) => distanceToBox(x, y, place) >= radius + SPOT_CLEARANCE
        && !hitsControl(place, tracker.controls)
      const inView = fittingPlacements(options, tracker.placement, (place) => insideRect(place, rect) && clear(place))
      const inShortView = fittingPlacements(options, tracker.placement, (place) => insideRect(place, aboveCovers, 3) && clear(place))

      return {
        best: inView.best ?? inShortView.best,
        kept: inView.kept ?? inShortView.kept,
      }
    }

    // The label stays where it is while that still fits (no jumping about
    // as the view moves), and returns to the preferred position once that
    // has fitted for a moment.
    const { best, kept } = placeLabel(w, h)
    let placement = best

    if (kept && best && kept.name !== best.name) {
      tracker.betterFrames = (tracker.betterFrames ?? 0) + 1
      placement = tracker.betterFrames > SETTLE_FRAMES ? best : kept
    }

    if (placement === best) tracker.betterFrames = 0

    // No room for "name · area": the name alone; back to the full label as
    // soon as it fits again.
    const hasArea = Boolean(elements.label.querySelector('.selection-label-area'))

    if (short && cache.fullSize && placeLabel(cache.fullSize.w, cache.fullSize.h).best) {
      overlay.dataset.short = 'false'
    } else if (!placement && !short && hasArea) {
      overlay.dataset.short = 'true'
    }

    const labelShown = Boolean(placement)

    if (labelShown !== tracker.labelShown) {
      overlay.dataset.label = labelShown ? 'shown' : 'hidden'
      tracker.labelShown = labelShown
    }

    tracker.placement = placement?.name ?? null

    const dotTransform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`

    if (dotTransform !== cache.written.dot) {
      elements.dot.style.transform = dotTransform
      cache.written.dot = dotTransform
    }

    if (!placement) return

    const labelX = placement.x
    const labelY = placement.y
    const labelTransform = `translate3d(${labelX.toFixed(1)}px, ${labelY.toFixed(1)}px, 0)`

    if (labelTransform !== cache.written.label) {
      elements.label.style.transform = labelTransform
      cache.written.label = labelTransform
    }

    // Leader line: from the dot to the label's near side (in its lower part
    // when the label is above the spot, as on the boards), or to its top or
    // bottom edge when the label sits right above or below the dot.
    let endX
    let endY

    if (x < labelX) {
      endX = labelX
      endY = labelY + h * placement.meet
    } else if (x > labelX + w) {
      endX = labelX + w
      endY = labelY + h * placement.meet
    } else {
      endX = x
      endY = y < labelY ? labelY : labelY + h
    }

    const leader = `${x.toFixed(1)} ${y.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`

    if (leader !== cache.written.leader) {
      const line = elements.leader

      line.setAttribute('x1', x.toFixed(1))
      line.setAttribute('y1', y.toFixed(1))
      line.setAttribute('x2', endX.toFixed(1))
      line.setAttribute('y2', endY.toFixed(1))
      cache.written.leader = leader
    }
  })

  return null
})
