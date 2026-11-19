import { memo } from 'react'

/*
 * The sphere for one anatomical location on one side of the body.
 *
 * Zones do not handle clicks themselves: BodyInteraction decides which
 * zone is under the pointer (see interaction/zonePicking.js). The sphere is
 * tagged so that decision can recognise it. It is invisible unless the
 * developer option "Show location spheres" is on; hidden spheres are still
 * hit-tested (three.js ignores visibility when ray casting).
 *
 * The selected and hovered locations are drawn on the skin itself by the
 * body material (viewer/bodyMaterial.js), not by these spheres.
 */

const COLORS = {
  idle: '#f59e0b',
  hovered: '#f5c518',
  selected: '#e2654b',
}

function updateOnce(object) {
  object.updateMatrix()
}

// Re-rendered only when its own state changes (not while the view rotates).
export default memo(function Zone({
  zone,
  selected,
  hovered,
  showDebugNodes,
}) {
  let color = COLORS.idle

  if (hovered) color = COLORS.hovered
  if (selected) color = COLORS.selected

  return (
    <mesh
      position={zone.position}
      scale={zone.scale}
      // Locations never move: compute the transform once, not every frame.
      matrixAutoUpdate={false}
      onUpdate={updateOnce}
      visible={showDebugNodes}
      userData={{
        pickRole: 'zone',
        zoneId: zone.id,
      }}
    >
      <sphereGeometry args={[zone.radius, 24, 24]} />

      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={selected ? 0.35 : 0.15}
        transparent
        opacity={selected ? 0.6 : 0.36}
        depthWrite={false}
      />
    </mesh>
  )
})
