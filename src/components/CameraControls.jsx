import { OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'

export default function CameraControls({
  focusTarget,
}) {
  const controlsRef = useRef()

  useFrame((_, delta) => {
    if (!controlsRef.current) return

    const interpolation = 1 - Math.exp(-8 * delta)

    controlsRef.current.target.lerp(
      focusTarget,
      interpolation,
    )

    controlsRef.current.update()
  })

  return (
    <OrbitControls
    ref={controlsRef}
    enablePan={false}
    minDistance={2.5}
    maxDistance={9}
    />
  )
}