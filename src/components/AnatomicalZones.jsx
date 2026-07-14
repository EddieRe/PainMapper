import { useMemo } from 'react'
import {
  DEFAULT_NODE_SCALE,
  nodePlacements,
} from '../data/nodePlacements'
import Zone from './Zone'

function createZoneId(side, locationName) {
  const normalizedLocation = String(locationName)
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

  return `${side}_${normalizedLocation}`
}

export default function AnatomicalZones({
  locations,
  selectedZone,
  showDebugNodes,
  onSelect,
}) {
  const zones = useMemo(() => {
    return locations.flatMap((location) => {
      const placements = nodePlacements[location.name]

      if (!placements) {
        console.warn(
          `No placement is configured for "${location.name}".`,
        )

        return []
      }

      return placements.map((placement, index) => {
        const side = placement.side ?? `node_${index}`

        return {
        id: createZoneId(side, location.name),
        locationName: location.name,
        region: location.region,
        side,
        position: placement.position,
        scale: placement.scale ?? DEFAULT_NODE_SCALE,
        radius: placement.radius ?? 0.085,
        }
      })
    })
  }, [locations])

  return (
    <group>
      {zones.map((zone) => (
        <Zone
          key={zone.id}
          {...zone}
          selected={selectedZone?.id === zone.id}
          showDebugNodes={showDebugNodes}
          onSelect={onSelect}
        />
      ))}
    </group>
  )
}