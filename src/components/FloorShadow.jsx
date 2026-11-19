import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'

// The feet rest at about y = -1.62 in world units.
const FLOOR_HEIGHT = -1.625

// Plane size in world units (x across, z front-back).
const WIDTH = 1.5
const DEPTH = 1.0

// Feet centres in texture coordinates (0..1 from the top-left of the
// canvas): x = 0.5 + worldX / WIDTH, y = 0.5 + worldZ / DEPTH (the plane is
// laid flat, so the top of the canvas is behind the patient).
const FEET = [
  { x: 0.5 - 0.08 / WIDTH, y: 0.5 + 0.03 / DEPTH },
  { x: 0.5 + 0.08 / WIDTH, y: 0.5 + 0.03 / DEPTH },
]

function ellipse(context, cx, cy, rx, ry, stops) {
  context.save()
  context.translate(cx, cy)
  context.scale(rx, ry)

  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1)

  stops.forEach(([offset, color]) => gradient.addColorStop(offset, color))
  context.fillStyle = gradient
  context.beginPath()
  context.arc(0, 0, 1, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function createFloorTexture() {
  const width = 256
  const height = Math.round(256 * (DEPTH / WIDTH))
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  // A faint pool of light on the stage floor around the feet.
  ellipse(context, width / 2, height / 2, width * 0.48, height * 0.46, [
    [0, 'rgba(160, 205, 214, 0.13)'],
    [0.55, 'rgba(120, 175, 188, 0.06)'],
    [1, 'rgba(120, 175, 188, 0)'],
  ])

  // Soft shadow under the whole figure.
  ellipse(context, width / 2, height * 0.47, width * 0.2, height * 0.22, [
    [0, 'rgba(2, 12, 18, 0.5)'],
    [0.6, 'rgba(2, 12, 18, 0.2)'],
    [1, 'rgba(2, 12, 18, 0)'],
  ])

  // Darker contact shadow right under each foot.
  FEET.forEach(({ x, y }) => {
    ellipse(context, x * width, y * height, width * 0.055, height * 0.12, [
      [0, 'rgba(1, 8, 12, 0.62)'],
      [0.55, 'rgba(1, 8, 12, 0.3)'],
      [1, 'rgba(1, 8, 12, 0)'],
    ])
  })

  const texture = new CanvasTexture(canvas)

  texture.colorSpace = SRGBColorSpace

  return texture
}

function ignoreRaycast() {}

/*
 * A soft contact shadow under the feet, with a faint pool of light on the
 * stage floor, so the standing patient is grounded on the dark stage.
 * Purely decorative: it sits outside the clickable group, is never hit-tested
 * (raycast is a no-op) and is single-sided, so it disappears in views from
 * below.
 */
export default function FloorShadow() {
  // Disposed with the material by React Three Fiber when this unmounts.
  const texture = useMemo(() => createFloorTexture(), [])

  return (
    <mesh
      position={[0, FLOOR_HEIGHT, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={-1}
      raycast={ignoreRaycast}
    >
      <planeGeometry args={[WIDTH, DEPTH]} />

      <meshBasicMaterial
        map={texture}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
