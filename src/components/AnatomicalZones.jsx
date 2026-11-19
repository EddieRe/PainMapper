import { memo } from 'react'
import Zone from './Zone'

// Memoised: rotating the view re-renders the viewer, not the 173 spheres.
export default memo(function AnatomicalZones({
  zones,
  selectedZoneId,
  hoveredZoneId,
  showDebugNodes,
}) {
  return (
    // A fixed container: its (identity) transform never needs recomputing.
    <group matrixAutoUpdate={false}>
      {zones.map((zone) => (
        <Zone
          key={zone.id}
          zone={zone}
          selected={selectedZoneId === zone.id}
          hovered={hoveredZoneId === zone.id}
          showDebugNodes={showDebugNodes}
        />
      ))}
    </group>
  )
})
