/*
 * Camera framing for a viewer that is partly covered.
 *
 * On phones the information panel, a detail editor and the on-screen
 * keyboard cover the lower part of the 3D view; on wide screens the floating
 * toolbar covers its top edge. Instead of shrinking the canvas (slow, and the
 * covers move while a panel is dragged), the camera's centre of projection is
 * moved to the middle of the uncovered area with camera.setViewOffset. Whatever
 * the camera looks at (the selected location, or the middle of the patient)
 * then appears in the middle of what the learner can actually see, at the
 * same size it had before the panel moved.
 *
 * Pure functions (no three.js), so they can be checked in Node.
 */

// Vertical field of view of the uncovered canvas, as in Milestones 1–3.
export const BASE_FOV_DEGREES = 38

// The uncovered area is never treated as smaller than this (CSS px), so an
// almost closed viewer cannot produce an extreme projection.
export const MIN_VISIBLE_PX = 96

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/*
 * The uncovered part of a width × height canvas, given how much each edge
 * is covered (CSS px). Returns null when there is nothing useful left to
 * frame (for example, the phone panel at full height).
 */
export function visibleRect(width, height, insets = {}) {
  if (!(width > 0) || !(height > 0)) return null

  const left = clamp(insets.left ?? 0, 0, width)
  const right = clamp(insets.right ?? 0, 0, width)
  const top = clamp(insets.top ?? 0, 0, height)
  const bottom = clamp(insets.bottom ?? 0, 0, height)

  const x0 = left
  const x1 = Math.max(x0, width - right)
  const y0 = top
  const y1 = Math.max(y0, height - bottom)

  if (x1 - x0 < MIN_VISIBLE_PX / 2 || y1 - y0 < MIN_VISIBLE_PX / 2) {
    return null
  }

  // Grow a thin area around its own centre, staying on the canvas.
  const w = Math.min(width, Math.max(MIN_VISIBLE_PX, x1 - x0))
  const h = Math.min(height, Math.max(MIN_VISIBLE_PX, y1 - y0))
  const cx = clamp((x0 + x1) / 2, w / 2, width - w / 2)
  const cy = clamp((y0 + y1) / 2, h / 2, height - h / 2)

  return {
    x0: cx - w / 2,
    y0: cy - h / 2,
    x1: cx + w / 2,
    y1: cy + h / 2,
    width: w,
    height: h,
    cx,
    cy,
  }
}

// Pixels per world unit at distance 1, for a canvas of this height.
export function focalLengthPx(canvasHeight, fovDegrees = BASE_FOV_DEGREES) {
  return (canvasHeight / 2) / Math.tan(((fovDegrees * Math.PI) / 180) / 2)
}

/*
 * Projection settings that put the centre of projection at the middle of
 * the uncovered rect while keeping the on-screen scale of an uncovered
 * canvas. Apply with:
 *   camera.fov = fov; camera.aspect = aspect
 *   camera.setViewOffset(fullWidth, fullHeight, offsetX, offsetY, width, height)
 */
export function viewOffsetFor(width, height, rect, fovDegrees = BASE_FOV_DEGREES) {
  const focal = focalLengthPx(height, fovDegrees)
  const cx = rect ? rect.cx : width / 2
  const cy = rect ? rect.cy : height / 2
  const halfWidth = Math.max(cx, width - cx)
  const halfHeight = Math.max(cy, height - cy)

  return {
    fullWidth: 2 * halfWidth,
    fullHeight: 2 * halfHeight,
    offsetX: halfWidth - cx,
    offsetY: halfHeight - cy,
    width,
    height,
    aspect: halfWidth / halfHeight,
    fov: (2 * Math.atan(halfHeight / focal) * 180) / Math.PI,
  }
}

/*
 * Camera distance (world units) at which a region frameWidth × frameHeight,
 * centred on what the camera looks at, fits inside the uncovered rect.
 */
export function distanceToFrame(
  frameWidth,
  frameHeight,
  rect,
  canvasHeight,
  fovDegrees = BASE_FOV_DEGREES,
) {
  const focal = focalLengthPx(canvasHeight, fovDegrees)

  return Math.max(
    (frameHeight * focal) / rect.height,
    (frameWidth * focal) / rect.width,
  )
}

/*
 * How much of the body to show around a selected location (world units;
 * the whole patient is about 2.34 tall). Closer than Milestone 3, so the
 * chosen area reads clearly on a phone, while keeping a little of its
 * surroundings for orientation. Camera framing only: these values do not
 * change which location or conditions are chosen.
 */
const FRAME_BY_REGION = {
  Finger: [0.27, 0.27],
  Toe: [0.3, 0.3],
  Hand: [0.37, 0.37],
  Foot: [0.42, 0.39],
  Wrist: [0.37, 0.37],
  Ankle: [0.43, 0.43],
  Elbow: [0.45, 0.45],
  Knee: [0.46, 0.5],
  Neck: [0.5, 0.5],
  Shoulder: [0.58, 0.58],
  Hip: [0.7, 0.7],
  Chest: [0.76, 0.76],
  Abdomen: [0.76, 0.76],
  'Upper Back': [0.76, 0.76],
  'Lower Back': [0.76, 0.76],
}

const DEFAULT_FRAME = [0.7, 0.7]

// [width, height] in world units for a zone's region.
export function frameSizeFor(region) {
  return FRAME_BY_REGION[region] ?? DEFAULT_FRAME
}

// The whole standing patient, with a little room around it.
export const PATIENT_FRAME = Object.freeze([2.05 * 1.08, 2.34 * 1.1])
