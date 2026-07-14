import { useEffect, useState } from 'react'

export default function Zone({
  id,
  locationName,
  region,
  side,
  position,
  scale,
  radius = 0.085,
  selected,
  showDebugNodes,
  onSelect,
}) {
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'default'
    }
  }, [])

  function handlePointerOver(event) {
    event.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  function handlePointerOut() {
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  function handleClick(event) {
    event.stopPropagation()

    onSelect({
      id,
      locationName,
      region,
      side,
      position,
    })
  }

let color = '#f59e0b'
let opacity = showDebugNodes ? 0.32 : 0

if (selected && showDebugNodes) {
  color = '#ef4444'
  opacity = 0.52
}

if (hovered) {
  color = '#facc15'
  opacity = showDebugNodes ? 0.34 : 0.18
}

  return (
    <mesh
      position={position}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onClick={handleClick}
    >
      <sphereGeometry args={[radius, 24, 24]} />

      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  )
}