import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { memo, useEffect, useRef } from 'react'
import { Spherical, Vector3 } from 'three'
import { registerDevHook } from '../devHooks'
import {
  DEFAULT_VIEW_DIRECTION,
  findBodySurfaces,
  MODEL_CENTER,
  viewDirectionIfHidden,
} from '../interaction/viewDirection'
import { describeLocation } from '../data/locationSearch'
import { useReducedMotion } from '../layout/useLayout'
import { readViewInsets } from '../layout/viewInsets'
import { prefersReducedMotion } from '../motion'
import {
  BASE_FOV_DEGREES,
  distanceToFrame,
  PATIENT_FRAME,
  viewOffsetFor,
  visibleRect,
} from '../viewer/framing'
import { surfaceAnchorFor } from '../viewer/surfaceAnchor'
import { viewForSpot } from '../viewer/viewForSpot'

/*
 * The 3D view's camera: orbit controls (drag to rotate, scroll or pinch to
 * zoom, no panning) plus the moves the interface asks for.
 *
 * Requests come from App:
 *   { id,
 *     target?: [x, y, z]            look at this point (orbit around it)
 *     zone?: zone                   the location being shown, if any
 *     direction?: [x, y, z]         look from this side
 *              | 'auto-if-hidden'   keep the view unless the spot is hidden
 *                                   or seen edge-on (viewer/viewForSpot.js)
 *              | 'level'            keep the facing, default height
 *     frame?: 'fit' | [w, h]        show the whole patient / a w × h region
 *     frameMode?: 'exact' | 'closer-only'   'closer-only' never zooms out
 *     zoomBy?: factor               multiply the distance (zoom buttons)
 *     resetView?: true }            the default view: keep it fitted
 * Each request is handled once (resizing never replays it).
 *
 * Framing always uses the part of the viewer the learner can see (see
 * viewer/framing.js): the target is centred in the uncovered area. When a
 * panel or the keyboard moves, only that centring changes; the camera
 * itself stays where it is, so the learner's own rotation and zoom are kept
 * and the body is not shrunk.
 *
 * Moves glide, or happen at once when reduced motion is requested.
 */

export const MIN_DISTANCE = 0.4
export const MAX_DISTANCE = 12

function clampDistance(distance) {
  return Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance))
}

function orientationFor(offset) {
  const azimuth = Math.atan2(offset.x, offset.z) * (180 / Math.PI)

  if (Math.abs(azimuth) <= 45) return 'front'
  if (Math.abs(azimuth) >= 135) return 'back'

  return azimuth > 0 ? 'left' : 'right'
}

function shortestAngle(from, to) {
  let difference = to - from

  while (difference > Math.PI) difference -= Math.PI * 2
  while (difference < -Math.PI) difference += Math.PI * 2

  return difference
}

function rectOf(projection, size) {
  return projection.rect ?? visibleRect(size.width, size.height)
}

// The camera distance a goal asks for, in the given uncovered area.
function wantedDistance(goal, rect, canvasHeight) {
  if (goal.zoomTo) return goal.zoomTo
  if (!rect) return null

  let distance = null

  if (goal.frame === 'fit') {
    distance = distanceToFrame(PATIENT_FRAME[0], PATIENT_FRAME[1], rect, canvasHeight)
  } else if (Array.isArray(goal.frame)) {
    distance = distanceToFrame(goal.frame[0], goal.frame[1], rect, canvasHeight)
  }

  if (distance === null) return null

  if (goal.frameMode === 'closer-only' && goal.fromDistance !== null) {
    distance = Math.min(goal.fromDistance, distance)
  }

  return distance
}

/*
 * Moves the centre of projection to the middle of the uncovered area
 * (only when it changed). Returns that area.
 */
function applyProjection(camera, gl, size, projection) {
  const { width, height } = size

  if (!(width > 0 && height > 0)) return projection.rect

  const insets = readViewInsets(gl.domElement.getBoundingClientRect())
  const rect = visibleRect(width, height, insets)
    ?? projection.rect
    ?? visibleRect(width, height)
  const settings = viewOffsetFor(width, height, rect, BASE_FOV_DEGREES)
  const key = [
    settings.fullWidth,
    settings.fullHeight,
    settings.offsetX,
    settings.offsetY,
    width,
    height,
  ].map((value) => Math.round(value * 4)).join(',')

  if (key !== projection.key) {
    camera.fov = settings.fov
    camera.aspect = settings.aspect
    camera.setViewOffset(
      settings.fullWidth,
      settings.fullHeight,
      settings.offsetX,
      settings.offsetY,
      width,
      height,
    )
    camera.updateProjectionMatrix()
    projection.key = key
  }

  projection.rect = rect

  return rect
}

const scratchOffset = new Vector3()
const scratchSpherical = new Spherical()
const wantedSpherical = new Spherical()

/*
 * One frame of an automatic move. Returns true when the goal is reached.
 */
function stepTowards(goal, camera, controls, rect, canvasHeight, delta) {
  const step = goal.instant ? 1 : 1 - Math.exp(-7.5 * Math.min(delta, 0.1))

  // Read the view before moving the target, so the glide never tilts it.
  scratchOffset.copy(camera.position).sub(controls.target)
  scratchSpherical.setFromVector3(scratchOffset)

  controls.target.lerp(goal.target, step)

  const radius = clampDistance(
    wantedDistance(goal, rect, canvasHeight) ?? scratchSpherical.radius,
  )
  let theta = scratchSpherical.theta
  let phi = scratchSpherical.phi
  let directionDone = true

  if (goal.direction) {
    wantedSpherical.setFromVector3(goal.direction)
    theta += shortestAngle(theta, wantedSpherical.theta) * step
    phi += (wantedSpherical.phi - phi) * step
    directionDone = Math.abs(shortestAngle(theta, wantedSpherical.theta)) < 0.002
      && Math.abs(wantedSpherical.phi - phi) < 0.002
  }

  const nextRadius = scratchSpherical.radius + (radius - scratchSpherical.radius) * step

  scratchSpherical.set(nextRadius, phi, theta).makeSafe()
  camera.position
    .copy(controls.target)
    .add(scratchOffset.setFromSpherical(scratchSpherical))

  const targetDone = controls.target.distanceToSquared(goal.target) < 1e-8
  const radiusDone = Math.abs(radius - nextRadius) < 0.0015

  if (targetDone && radiusDone && directionDone) {
    controls.target.copy(goal.target)
    return true
  }

  return false
}

// Memoised: the viewer re-renders as the view turns; the rig need not.
export default memo(function CameraRig({
  request,
  onOrientationChange,
  onUserMove,
}) {
  const controlsRef = useRef()
  const camera = useThree((state) => state.camera)
  const scene = useThree((state) => state.scene)
  const size = useThree((state) => state.size)
  // Follows the system setting live (not only when the page opened).
  const damping = !useReducedMotion()

  // The projection last applied, and the uncovered area it was built for.
  const projection = useRef({ key: '', rect: null })

  // Where the camera is heading. `active` is false once it has arrived or
  // the learner takes over.
  const goal = useRef({
    target: new Vector3(...MODEL_CENTER),
    direction: new Vector3(...DEFAULT_VIEW_DIRECTION).normalize(),
    frame: 'fit',
    frameMode: 'exact',
    fromDistance: null,
    zoomTo: null,
    instant: true,
    active: true,
  })

  // True while the untouched whole-patient view is shown: it is kept fitted
  // to the uncovered area as that changes.
  const defaultView = useRef(true)
  const orientation = useRef(null)
  const lastDecision = useRef(null)
  const callbacks = useRef({ onOrientationChange, onUserMove })

  useEffect(() => {
    callbacks.current = { onOrientationChange, onUserMove }
  }, [onOrientationChange, onUserMove])

  // Requests from the interface.
  useEffect(() => {
    const controls = controlsRef.current

    if (!request || !controls) return

    const rect = rectOf(projection.current, size)
    const offset = camera.position.clone().sub(controls.target)
    const previous = goal.current
    const currentDistance = previous.active
      ? (wantedDistance(previous, rect, size.height) ?? offset.length())
      : offset.length()

    const target = request.target
      ? new Vector3(...request.target)
      : (previous.active ? previous.target.clone() : controls.target.clone())

    let direction = null

    if (Array.isArray(request.direction)) {
      direction = new Vector3(...request.direction).normalize()
    } else if (request.direction === 'auto-if-hidden') {
      const surfaces = findBodySurfaces(scene)
      const anchor = request.zone ? surfaceAnchorFor(request.zone, scene) : null
      const plannedDistance = Array.isArray(request.frame) && rect
        ? clampDistance(distanceToFrame(request.frame[0], request.frame[1], rect, size.height))
        : currentDistance

      if (surfaces.length > 0 && anchor) {
        // Face the spot squarely, unless the current view already does.
        direction = viewForSpot(anchor, offset.clone().normalize(), plannedDistance, surfaces, {
          face: describeLocation(request.zone.locationName).face,
        })
        lastDecision.current = {
          zone: request.zone.id,
          from: offset.clone().normalize().toArray(),
          to: direction?.toArray() ?? null,
          plannedDistance,
        }
      } else if (surfaces.length > 0) {
        const viewpoint = target.clone().addScaledVector(
          offset.clone().normalize(),
          currentDistance,
        )

        direction = viewDirectionIfHidden(target, viewpoint, surfaces)
      }
    } else if (request.direction === 'level') {
      const flat = new Vector3(offset.x, 0, offset.z)

      if (flat.lengthSq() < 1e-8) flat.set(0, 0, 1)

      flat.normalize()
      direction = new Vector3(flat.x, DEFAULT_VIEW_DIRECTION[1], flat.z).normalize()
    }

    defaultView.current = Boolean(request.resetView)
    goal.current = {
      target,
      // No new direction: keep the one the camera has now (as the target
      // glides, the view would otherwise tilt towards it).
      direction: direction
        ?? (previous.active ? previous.direction : null)
        ?? offset.clone().normalize(),
      frame: request.frame ?? null,
      frameMode: request.frameMode ?? 'exact',
      fromDistance: currentDistance,
      zoomTo: request.zoomBy
        ? clampDistance(currentDistance * request.zoomBy)
        : null,
      instant: prefersReducedMotion(),
      active: true,
    }
    // Each request is handled once (by identity); layout changes must not
    // replay it, so size and camera are read but are not dependencies.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  useEffect(() => registerDevHook('camera', () => {
    const controls = controlsRef.current

    if (!controls) return null

    const offset = camera.position.clone().sub(controls.target)

    return {
      orientation: orientation.current,
      distance: offset.length(),
      target: controls.target.toArray(),
      position: camera.position.toArray(),
      moving: goal.current.active,
      lastDecision: lastDecision.current,
      visibleRect: projection.current.rect,
      canvas: { width: size.width, height: size.height },
    }
  }), [camera, size])

  // Screen position (CSS px within the canvas) of a world point, for
  // automated checks that click on the body.
  useEffect(() => registerDevHook('projectPoint', (position) => {
    const point = new Vector3(...position).project(camera)

    return {
      x: ((point.x + 1) / 2) * size.width,
      y: ((1 - point.y) / 2) * size.height,
      inFront: point.z < 1,
    }
  }), [camera, size])

  useFrame((state, delta) => {
    const controls = controlsRef.current

    if (!controls) return

    const view = projection.current
    const rect = applyProjection(state.camera, state.gl, state.size, view)
    const current = goal.current

    // Keep the untouched default view fitted to the uncovered area.
    if (!current.active && defaultView.current && rect) {
      const fit = clampDistance(
        distanceToFrame(PATIENT_FRAME[0], PATIENT_FRAME[1], rect, state.size.height),
      )
      const distance = state.camera.position.distanceTo(controls.target)

      if (Math.abs(fit - distance) / fit > 0.01) {
        goal.current = {
          ...current,
          frame: 'fit',
          frameMode: 'exact',
          zoomTo: null,
          direction: null,
          instant: prefersReducedMotion(),
          active: true,
        }
      }
    }

    const now = goal.current

    if (now.active && stepTowards(now, state.camera, controls, rect, state.size.height, delta)) {
      goal.current = { ...now, active: false }
    }

    controls.update()

    const next = orientationFor(scratchOffset.copy(state.camera.position).sub(controls.target))

    if (next !== orientation.current) {
      orientation.current = next
      callbacks.current.onOrientationChange?.(next)
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      target={MODEL_CENTER}
      enablePan={false}
      enableDamping={damping}
      dampingFactor={0.12}
      rotateSpeed={0.8}
      minDistance={MIN_DISTANCE}
      maxDistance={MAX_DISTANCE}
      onStart={() => {
        // The learner took over: stop any automatic move, and stop keeping
        // the default view fitted.
        goal.current = { ...goal.current, active: false }
        defaultView.current = false
        callbacks.current.onUserMove?.()
      }}
    />
  )
})
