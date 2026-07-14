export const DEFAULT_NODE_SCALE = [0.7, 0.7, 0.7]
export const DEFAULT_NODE_RADIUS = 0.075

/*
 * Global model alignment.
 *
 * These values were tuned against the current model:
 * - narrower than the original estimate
 * - shorter than the original estimate
 * - shallower anterior/posterior depth
 */
const BODY_CENTER_Y = -0.56
const BODY_WIDTH_SCALE = 0.60
const BODY_HEIGHT_SCALE = 0.68
const BODY_DEPTH_SCALE = 0.70

/*
 * The arms are abducted approximately 48 degrees from the plumb line.
 *
 * Source coordinates were initially estimated for arms positioned much
 * closer to vertical, so upper-extremity coordinates are rotated around
 * this shoulder anchor before global model scaling is applied.
 */
const ARM_SOURCE_SHOULDER_X = 0.36
const ARM_SOURCE_SHOULDER_Y = 0.66
const ARM_OUTWARD_ROTATION_DEGREES = 48

/*
 * Moves the full upper-extremity node chain posteriorly.
 * This value is applied before BODY_DEPTH_SCALE.
 */
const ARM_DEPTH_OFFSET = -0.12

const TOE_DEPTH_OFFSET = -0.10

function toeBilateral(
  x,
  y,
  z,
  scale = DEFAULT_NODE_SCALE,
  options,
) {
  return bilateral(
    x,
    y,
    z + TOE_DEPTH_OFFSET,
    scale,
    options,
  )
}

const FOREFOOT_DEPTH_OFFSET = -0.06

function forefootBilateral(
  x,
  y,
  z,
  scale = DEFAULT_NODE_SCALE,
  options,
) {
  return bilateral(
    x,
    y,
    z + FOREFOOT_DEPTH_OFFSET,
    scale,
    options,
  )
}

/*
 * Default visual/click-target radii by anatomical density.
 *
 * Broad regions use larger nodes.
 * Crowded regions use smaller nodes for more precise selection.
 */
const RADII = {
  broadTorso: 0.10,
  torso: 0.085,
  largeJoint: 0.075,
  knee: 0.055,
  ankle: 0.052,
  shoulder: 0.065,
  elbow: 0.055,
  wrist: 0.045,
  hand: 0.045,
  finger: 0.028,
  fingerGroup: 0.035,
  foot: 0.05,
  toe: 0.028,
  toeGroup: 0.035,
}

function adjustPosition(
  [x, y, z],
  {
    widthScale = BODY_WIDTH_SCALE,
    heightScale = BODY_HEIGHT_SCALE,
    depthScale = BODY_DEPTH_SCALE,
  } = {},
) {
  return [
    x * widthScale,
    BODY_CENTER_Y + ((y - BODY_CENTER_Y) * heightScale),
    z * depthScale,
  ]
}

function rotateArmPosition([x, y, z]) {
  const radians = ARM_OUTWARD_ROTATION_DEGREES * Math.PI / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)

  const offsetX = x - ARM_SOURCE_SHOULDER_X
  const offsetY = y - ARM_SOURCE_SHOULDER_Y

    return [
    ARM_SOURCE_SHOULDER_X + (offsetX * cos) - (offsetY * sin),
    ARM_SOURCE_SHOULDER_Y + (offsetX * sin) + (offsetY * cos),
    z + ARM_DEPTH_OFFSET,
    ]
}

function node(
  side,
  position,
  scale = DEFAULT_NODE_SCALE,
  {
    adjustment,
    radius = DEFAULT_NODE_RADIUS,
  } = {},
) {
  return {
    side,
    position: adjustPosition(position, adjustment),
    scale,
    radius,
  }
}

function bilateral(
  x,
  y,
  z,
  scale = DEFAULT_NODE_SCALE,
  options,
) {
  return [
    node('left', [x, y, z], scale, options),
    node('right', [-x, y, z], scale, options),
  ]
}

function midline(
  y,
  z,
  scale = DEFAULT_NODE_SCALE,
  options,
) {
  return [
    node('center', [0, y, z], scale, options),
  ]
}

function armBilateral(
  x,
  y,
  z,
  scale = DEFAULT_NODE_SCALE,
  options,
) {
  const [rotatedX, rotatedY, rotatedZ] = rotateArmPosition([x, y, z])

  return bilateral(
    rotatedX,
    rotatedY,
    rotatedZ,
    scale,
    options,
  )
}

/*
 * Coordinate convention:
 *
 * +x = patient left
 * -x = patient right
 * +y = superior
 * -y = inferior
 * +z = anterior
 * -z = posterior
 *
 * Patient left appears on the viewer's right when facing the model.
 *
 * Every key must exactly match a Name value in locations.csv.
 */
export const nodePlacements = {
  // ============================================================
  // KNEE
  // ============================================================

  'Tibial Tubercle': bilateral(
    0.18,
    -1.24,
    0.06,
    [0.62, 0.62, 0.62],
    { radius: RADII.knee },
  ),

  'Patellar Tendon': bilateral(
    0.18,
    -1.17,
    0.085,
    [0.45, 0.8, 0.42],
    { radius: 0.05 },
  ),

  'Distal Pole of Patella': bilateral(
    0.18,
    -1.12,
    0.09,
    [0.52, 0.42, 0.42],
    { radius: 0.05 },
  ),

  'Quadriceps Tendon': bilateral(
    0.18,
    -1,
    0.075,
    [0.5, 0.78, 0.42],
    { radius: 0.052 },
  ),

  'Lateral Knee Joint Line': bilateral(
    0.26,
    -1.08,
    -0.02,
    [0.62, 0.52, 0.52],
    { radius: 0.05 },
  ),

  'Medial Knee Joint Line': bilateral(
    0.1,
    -1.08,
    -0.02,
    [0.62, 0.52, 0.52],
    { radius: 0.05 },
  ),

  'Popliteal Fossa': bilateral(
    0.18,
    -1.08,
    -0.12,
    [0.72, 0.65, 0.42],
    { radius: 0.058 },
  ),

  'Patellar Facet': bilateral(
    0.18,
    -1.08,
    0.08,
    [0.7, 0.62, 0.5],
    { radius: 0.052 },
  ),

  Patella: bilateral(
    0.18,
    -1.075,
    0.105,
    [0.68, 0.72, 0.48],
    { radius: 0.055 },
  ),

  'Distal IT Band': bilateral(
    0.3,
    -0.96,
    0,
    [0.48, 0.75, 0.45],
    { radius: 0.052 },
  ),

  "Hoffa's Fat Pad": bilateral(
    0.18,
    -1.145,
    0.105,
    [0.55, 0.4, 0.42],
    { radius: 0.048 },
  ),

  'Distal Femur': bilateral(
    0.18,
    -0.92,
    0.015,
    [0.8, 0.72, 0.6],
    { radius: 0.065 },
  ),

  'Proximal Tibia': bilateral(
    0.18,
    -1.28,
    0,
    [0.75, 0.68, 0.58],
    { radius: 0.062 },
  ),

  'Proximal Fibula': bilateral(
    0.285,
    -1.24,
    -0.025,
    [0.48, 0.58, 0.48],
    { radius: 0.05 },
  ),

  // ============================================================
  // ANKLE
  // ============================================================

  'Lateral Malleolus': bilateral(
    0.235,
    -1.82,
    0,
    [0.52, 0.65, 0.52],
    { radius: RADII.ankle },
  ),

  'Medial Malleolus': bilateral(
    0.125,
    -1.8,
    0,
    [0.52, 0.65, 0.52],
    { radius: RADII.ankle },
  ),

  'Tibiotalar Articulation': bilateral(
    0.18,
    -1.78,
    0.075,
    [0.7, 0.42, 0.5],
    { radius: 0.05 },
  ),

  'Distal Achilles': bilateral(
    0.18,
    -1.82,
    -0.12,
    [0.48, 0.78, 0.42],
    { radius: 0.05 },
  ),

  'Fibulotalar Articulation': bilateral(
    0.235,
    -1.77,
    0.025,
    [0.48, 0.48, 0.48],
    { radius: 0.048 },
  ),

  'Anterior Ankle': bilateral(
    0.18,
    -1.78,
    0.105,
    [0.75, 0.4, 0.42],
    { radius: 0.05 },
  ),

  'Distal Tibia': bilateral(
    0.16,
    -1.68,
    0,
    [0.6, 0.78, 0.52],
    { radius: 0.055 },
  ),

  'Distal Fibula': bilateral(
    0.225,
    -1.68,
    -0.01,
    [0.45, 0.78, 0.45],
    { radius: 0.05 },
  ),

  'Calcaneal Region': bilateral(
    0.18,
    -1.92,
    -0.07,
    [0.72, 0.62, 0.75],
    { radius: 0.058 },
  ),

  // ============================================================
  // HIP
  // ============================================================

  Groin: bilateral(
    0.17,
    -0.53,
    0.12,
    [0.72, 0.68, 0.58],
    { radius: RADII.largeJoint },
  ),

  'Anterior Proximal Thigh': bilateral(
    0.22,
    -0.66,
    0.11,
    [0.82, 1.08, 0.58],
    { radius: 0.075 },
  ),

  'Lateral Proximal Thigh/Greater Trochanteric Region': bilateral(
    0.34,
    -0.55,
    0,
    [0.7, 0.82, 0.62],
    { radius: 0.07 },
  ),

  'Gluteal Region': bilateral(
    0.22,
    -0.52,
    -0.16,
    [1, 0.88, 0.55],
    { radius: 0.085 },
  ),

  'Pubic Region': midline(
    -0.48,
    0.13,
    [0.85, 0.55, 0.52],
    { radius: 0.075 },
  ),

  // ============================================================
  // ABDOMEN
  // ============================================================

  'Epigastric Region': midline(
    0.1,
    0.18,
    [1.25, 0.9, 0.45],
    { radius: RADII.broadTorso },
  ),

  'Suprapubic Region': midline(
    -0.35,
    0.16,
    [1.15, 0.68, 0.45],
    { radius: RADII.broadTorso },
  ),

  'Left Flank': [
    node(
      'left',
      [0.31, -0.05, 0],
      [0.65, 1.1, 0.52],
      { radius: RADII.torso },
    ),
  ],

  'Right Flank': [
    node(
      'right',
      [-0.31, -0.05, 0],
      [0.65, 1.1, 0.52],
      { radius: RADII.torso },
    ),
  ],

  'Right Lower Abdomen': [
    node(
      'right',
      [-0.19, -0.27, 0.16],
      [0.82, 0.72, 0.45],
      { radius: RADII.torso },
    ),
  ],

  'Left Lower Abdomen': [
    node(
      'left',
      [0.19, -0.27, 0.16],
      [0.82, 0.72, 0.45],
      { radius: RADII.torso },
    ),
  ],

  // ============================================================
  // CHEST
  // ============================================================

  'Left Chest': [
    node(
      'left',
      [0.2, 0.36, 0.19],
      [1.05, 1.1, 0.45],
      { radius: RADII.broadTorso },
    ),
  ],

  'Right Chest': [
    node(
      'right',
      [-0.2, 0.36, 0.19],
      [1.05, 1.1, 0.45],
      { radius: RADII.broadTorso },
    ),
  ],

'Right Axillary': [
  node(
    'right',
    [-0.29, 0.48, 0],
    [0.48, 0.68, 0.5],
    { radius: 0.06 },
  ),
],

'Left Axillary': [
  node(
    'left',
    [0.29, 0.48, 0],
    [0.48, 0.68, 0.5],
    { radius: 0.06 },
  ),
],

  'Sternal Area': midline(
    0.37,
    0.205,
    [0.52, 1.25, 0.4],
    { radius: 0.072 },
  ),

  // ============================================================
  // NECK
  // ============================================================

  'Posterior Neck': midline(
    0.87,
    -0.12,
    [0.82, 0.78, 0.5],
    { radius: 0.075 },
  ),

  'Lateral Neck': bilateral(
    0.11,
    0.87,
    0,
    [0.52, 0.82, 0.52],
    { radius: 0.065 },
  ),

  'Anterior Neck': midline(
    0.87,
    0.12,
    [0.78, 0.78, 0.45],
    { radius: 0.07 },
  ),

  // ============================================================
  // UPPER BACK
  // ============================================================

  'Left Upper Quadrant': [
    node(
      'left',
      [0.22, 0.54, -0.16],
      [0.95, 0.82, 0.45],
      { radius: RADII.torso },
    ),
  ],

  'Midline Upper Quadrant': midline(
    0.54,
    -0.18,
    [0.65, 0.82, 0.42],
    { radius: RADII.torso },
  ),

  'Right Upper Quadrant': [
    node(
      'right',
      [-0.22, 0.54, -0.16],
      [0.95, 0.82, 0.45],
      { radius: RADII.torso },
    ),
  ],

  'Left Center Quadrant': [
    node(
      'left',
      [0.22, 0.27, -0.17],
      [0.95, 0.82, 0.45],
      { radius: RADII.torso },
    ),
  ],

  'Midline Center Quadrant': midline(
    0.27,
    -0.19,
    [0.65, 0.82, 0.42],
    { radius: RADII.torso },
  ),

  'Right Center Quadrant': [
    node(
      'right',
      [-0.22, 0.27, -0.17],
      [0.95, 0.82, 0.45],
      { radius: RADII.torso },
    ),
  ],

  // ============================================================
  // LOWER BACK
  // ============================================================

  'Left Lower Quadrant': [
    node(
      'left',
      [0.19, -0.08, -0.16],
      [0.95, 0.95, 0.45],
      { radius: RADII.torso },
    ),
  ],

  'Midline Lower Quadrant': midline(
    -0.08,
    -0.18,
    [0.68, 0.95, 0.42],
    { radius: RADII.torso },
  ),

  'Right Lower Quadrant': [
    node(
      'right',
      [-0.19, -0.08, -0.16],
      [0.95, 0.95, 0.45],
      { radius: RADII.torso },
    ),
  ],

  // ============================================================
  // SHOULDER
  // ============================================================

  'Anterior Shoulder': armBilateral(
    0.39,
    0.56,
    0.105,
    [0.68, 0.68, 0.55],
    { radius: RADII.shoulder },
  ),

  'Lateral Shoulder': armBilateral(
    0.46,
    0.56,
    0,
    [0.65, 0.75, 0.6],
    { radius: RADII.shoulder },
  ),

  'Posterior Shoulder': armBilateral(
    0.39,
    0.56,
    -0.105,
    [0.68, 0.68, 0.55],
    { radius: RADII.shoulder },
  ),

  'Superior Shoulder': armBilateral(
    0.38,
    0.66,
    0,
    [0.75, 0.48, 0.6],
    { radius: 0.062 },
  ),

'Inferior Axillary Region': bilateral(
  0.30,
  0.39,
  0,
  [0.48, 0.72, 0.5],
  { radius: 0.058 },
),

  'Scapular Region': bilateral(
    0.25,
    0.43,
    -0.18,
    [0.9, 1.05, 0.42],
    { radius: 0.075 },
  ),

  // ============================================================
  // ELBOW
  // ============================================================

  'Antecubital Region': armBilateral(
    0.52,
    0.06,
    0.09,
    [0.62, 0.62, 0.45],
    { radius: RADII.elbow },
  ),

  'Medial Epicondyle': armBilateral(
    0.47,
    0.06,
    0,
    [0.48, 0.48, 0.48],
    { radius: 0.048 },
  ),

  'Lateral Epicondyle': armBilateral(
    0.57,
    0.06,
    0,
    [0.48, 0.48, 0.48],
    { radius: 0.048 },
  ),

  'Posterior Cubital Region': armBilateral(
    0.52,
    0.06,
    -0.09,
    [0.62, 0.62, 0.45],
    { radius: RADII.elbow },
  ),

  // ============================================================
  // WRIST
  // ============================================================

  'Anterior Wrist': armBilateral(
    0.66,
    -0.29,
    0.07,
    [0.55, 0.42, 0.42],
    { radius: RADII.wrist },
  ),

  'Posterior Wrist': armBilateral(
    0.66,
    -0.29,
    -0.07,
    [0.55, 0.42, 0.42],
    { radius: RADII.wrist },
  ),

  'Medial Wrist': armBilateral(
    0.61,
    -0.29,
    0,
    [0.42, 0.48, 0.42],
    { radius: 0.042 },
  ),

  'Lateral Wrist': armBilateral(
    0.71,
    -0.29,
    0,
    [0.42, 0.48, 0.42],
    { radius: 0.042 },
  ),

  'Anterior/Posterior Scaphoid Region': armBilateral(
    0.705,
    -0.32,
    0.025,
    [0.42, 0.48, 0.48],
    { radius: 0.04 },
  ),

  // ============================================================
  // HAND
  // ============================================================

  'Radial Hand': armBilateral(
    0.72,
    -0.39,
    0,
    [0.5, 0.72, 0.5],
    { radius: RADII.hand },
  ),

  'Ulnar Hand': armBilateral(
    0.63,
    -0.39,
    0,
    [0.5, 0.72, 0.5],
    { radius: RADII.hand },
  ),

  'Palmar Region': armBilateral(
    0.67,
    -0.39,
    0.075,
    [0.72, 0.88, 0.4],
    { radius: RADII.hand },
  ),

  'Dorsal Hand': armBilateral(
    0.67,
    -0.39,
    -0.075,
    [0.72, 0.88, 0.4],
    { radius: RADII.hand },
  ),

  // ============================================================
  // FINGERS
  // ============================================================

  'Thumb (Anterior/Posterior)': armBilateral(
    0.755,
    -0.4,
    0,
    [0.38, 0.7, 0.38],
    { radius: 0.03 },
  ),

  'Pointer (Anterior/Posterior)': armBilateral(
    0.71,
    -0.52,
    0,
    [0.3, 0.78, 0.32],
    { radius: RADII.finger },
  ),

  'Middle (Anterior/Posterior)': armBilateral(
    0.68,
    -0.54,
    0,
    [0.3, 0.85, 0.32],
    { radius: RADII.finger },
  ),

  'Ring (Anterior/Posterior)': armBilateral(
    0.65,
    -0.52,
    0,
    [0.3, 0.78, 0.32],
    { radius: RADII.finger },
  ),

  'Pinky (Anterior/Posterior)': armBilateral(
    0.62,
    -0.49,
    0,
    [0.3, 0.7, 0.32],
    { radius: RADII.finger },
  ),

  'All Fingers DIP': armBilateral(
    0.67,
    -0.54,
    0,
    [1, 0.3, 0.36],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers PIP (No Thumb)': armBilateral(
    0.67,
    -0.49,
    0,
    [1, 0.3, 0.36],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers MCP': armBilateral(
    0.67,
    -0.42,
    0,
    [1.05, 0.34, 0.38],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers Proximal Phalanx': armBilateral(
    0.67,
    -0.46,
    0,
    [1.05, 0.48, 0.36],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers Middle Phalanx (No Thumb)': armBilateral(
    0.67,
    -0.5,
    0,
    [1.05, 0.44, 0.36],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers Distal Phalanx': armBilateral(
    0.67,
    -0.55,
    0,
    [1.05, 0.4, 0.36],
    { radius: RADII.fingerGroup },
  ),

  'All Fingers Metacarpal': armBilateral(
    0.67,
    -0.38,
    0,
    [1, 0.62, 0.42],
    { radius: 0.04 },
  ),

  'All Fingers Carpal-Metacarpal': armBilateral(
    0.67,
    -0.33,
    0,
    [0.95, 0.38, 0.42],
    { radius: 0.038 },
  ),

  // ============================================================
  // FOOT
  // ============================================================

  'Medial Tarsals (Plantar)': bilateral(
    0.135,
    -1.96,
    0.015,
    [0.58, 0.48, 0.85],
    { radius: RADII.foot },
  ),

  'Lateral Tarsals (Plantar)': bilateral(
    0.225,
    -1.96,
    0.015,
    [0.58, 0.48, 0.85],
    { radius: RADII.foot },
  ),

  'Medial Tarsals (Dorsal)': bilateral(
    0.135,
    -1.91,
    0.08,
    [0.58, 0.45, 0.85],
    { radius: RADII.foot },
  ),

  'Lateral Tarsals (Dorsal)': bilateral(
    0.225,
    -1.91,
    0.08,
    [0.58, 0.45, 0.85],
    { radius: RADII.foot },
  ),

'Plantar Forefoot': forefootBilateral(
  0.18,
  -2,
  0.15,
  [1, 0.42, 0.72],
  { radius: RADII.foot },
),

'Dorsal Forefoot': forefootBilateral(
  0.18,
  -1.94,
  0.17,
  [1, 0.42, 0.72],
  { radius: RADII.foot },
),

  'Plantar Calcaneal Region': bilateral(
    0.18,
    -1.99,
    -0.06,
    [0.85, 0.42, 0.65],
    { radius: RADII.foot },
  ),

  // ============================================================
  // TOES
  // ============================================================

'All Toes Proximal Phalanx': toeBilateral(
  0.18,
  -1.96,
  0.25,
  [1.05, 0.38, 0.5],
  { radius: RADII.toeGroup },
),

'All Toes Middle Phalanx': toeBilateral(
  0.18,
  -1.96,
  0.3,
  [1.05, 0.34, 0.45],
  { radius: RADII.toeGroup },
),

'All Toes Distal Phalanx': toeBilateral(
  0.18,
  -1.96,
  0.35,
  [1.05, 0.34, 0.45],
  { radius: RADII.toeGroup },
),

'PIP Joint': toeBilateral(
  0.18,
  -1.96,
  0.285,
  [1.05, 0.28, 0.42],
  { radius: RADII.toe },
),

'DIP Joint': toeBilateral(
  0.18,
  -1.96,
  0.33,
  [1.05, 0.28, 0.42],
  { radius: RADII.toe },
),

'All Toes Metasarsal': toeBilateral(
  0.18,
  -1.94,
  0.16,
  [1, 0.45, 0.78],
  { radius: 0.042 },
),

'All Toes MTP Joint': toeBilateral(
  0.18,
  -1.95,
  0.22,
  [1.05, 0.34, 0.58],
  { radius: RADII.toeGroup },
),

'All Toes Tarsometatarsal Joint': toeBilateral(
  0.18,
  -1.93,
  0.1,
  [1, 0.34, 0.65],
  { radius: 0.04 },
),
}