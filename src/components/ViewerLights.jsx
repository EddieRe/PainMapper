import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PMREMGenerator, Vector3 } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

const right = new Vector3()
const up = new Vector3()
const forward = new Vector3()
const focus = new Vector3()

// Lights aim at a point this far in front of the camera; only their
// direction matters (directional lights).
const FOCUS_DISTANCE = 3

// Soft studio light from a small, blurred room environment (generated once
// on the GPU, no network). Kept low: it only softens the shading.
const ENVIRONMENT_INTENSITY = 0.18
const ENVIRONMENT_SIZE = 128

function place(light, camera, side, lift, ahead) {
  light.position
    .copy(camera.position)
    .addScaledVector(right, side)
    .addScaledVector(up, lift)
    .addScaledVector(forward, ahead)

  light.target.position.copy(focus)
  light.target.updateMatrixWorld()
}

/*
 * Studio lighting for the clay patient on the dark stage. Everything
 * travels with the camera, so the patient is lit the same way from the
 * front, the back or the sides:
 * - key: above and to the left of the viewer;
 * - two rim lights behind the patient, left and right, that brush the
 *   silhouette so it separates from the navy background;
 * - soft fill: a dim room environment (turned with the camera) and a cool
 *   sky / dark teal ground, so the shadow side never goes black.
 */
export default function ViewerLights() {
  const key = useRef()
  const rimLeft = useRef()
  const rimRight = useRef()
  const gl = useThree((state) => state.gl)
  const get = useThree((state) => state.get)

  useEffect(() => {
    const { scene } = get()
    const generator = new PMREMGenerator(gl)
    const room = new RoomEnvironment()
    const target = generator.fromScene(room, 0.04, 0.1, 100, { size: ENVIRONMENT_SIZE })

    room.dispose()
    generator.dispose()

    scene.environment = target.texture
    scene.environmentIntensity = ENVIRONMENT_INTENSITY

    return () => {
      if (scene.environment === target.texture) scene.environment = null
      target.dispose()
    }
  }, [gl, get])

  useFrame(({ camera, scene }) => {
    if (!key.current || !rimLeft.current || !rimRight.current) return

    right.setFromMatrixColumn(camera.matrixWorld, 0)
    up.setFromMatrixColumn(camera.matrixWorld, 1)
    camera.getWorldDirection(forward)
    focus.copy(camera.position).addScaledVector(forward, FOCUS_DISTANCE)

    place(key.current, camera, -3.4, 3.6, 0)
    place(rimLeft.current, camera, -4.2, 1.6, FOCUS_DISTANCE * 3)
    place(rimRight.current, camera, 4.2, 1.6, FOCUS_DISTANCE * 3)

    // Turn the environment with the camera (about the vertical axis).
    scene.environmentRotation.set(0, Math.atan2(-forward.x, -forward.z), 0)
  })

  return (
    <>
      <hemisphereLight args={['#dfeaf2', '#163843', 0.4]} />

      <directionalLight
        ref={key}
        color="#ffffff"
        intensity={1.5}
      />

      <directionalLight
        ref={rimLeft}
        color="#cfe5f2"
        intensity={2.4}
      />

      <directionalLight
        ref={rimRight}
        color="#cfe5f2"
        intensity={2.4}
      />
    </>
  )
}
