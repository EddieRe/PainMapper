import { Html } from '@react-three/drei'
import { memo, useEffect, useState } from 'react'
import { pickZones } from '../interaction/zonePicking'
import AnatomicalZones from './AnatomicalZones'
import Model from './Model'

/*
 * A click whose pointer moved further than this (in screen pixels) between
 * press and release was a drag to rotate the model, not a selection.
 */
const CLICK_DRAG_TOLERANCE_PX = 6

/*
 * Labels in the 3D view must never intercept clicks. drei's Html ignores
 * its pointerEvents prop in this (non-transform) mode, so the wrapper
 * elements it creates are made click-through explicitly.
 */
const LABEL_WRAPPER_STYLE = { pointerEvents: 'none' }

function HoverLabel({ zone }) {
  return (
    <Html
      position={zone.position}
      wrapperClass="hover-label-anchor"
      style={LABEL_WRAPPER_STYLE}
      zIndexRange={[20, 0]}
    >
      <div className="hover-label">{zone.locationName}</div>
    </Html>
  )
}

/*
 * The patient model plus its anatomical location spheres, with one shared
 * pointer handler. Which location is under the pointer is decided in
 * interaction/zonePicking.js, based on the visible skin.
 *
 * A click on the body where no location is does nothing: clearing the
 * selection is always an explicit action in the panel or the menu.
 *
 * Memoised (with stable callbacks from the parent), so rotating the view,
 * which re-renders the viewer, does not re-render the model and spheres.
 */
export default memo(function BodyInteraction({
  zones,
  selectedZone,
  showDebugNodes,
  hoverEnabled,
  viewRequestId,
  onSelect,
  onModelReady,
  appearance = 'neutral',
  originalAttempt = 0,
}) {
  const [hoveredZone, setHoveredZone] = useState(null)

  // A new selection or a camera move asked for by the interface (Front,
  // Back, zoom buttons) moves the body under a resting mouse: drop the hover
  // label rather than leave it on the wrong spot. The next mouse move picks
  // again.
  const selectedId = selectedZone?.id ?? null
  const [seen, setSeen] = useState({ selectedId, viewRequestId })

  if (seen.selectedId !== selectedId || seen.viewRequestId !== viewRequestId) {
    setSeen({ selectedId, viewRequestId })
    setHoveredZone(null)
  }

  useEffect(() => {
    document.body.style.cursor = hoveredZone
      ? 'pointer'
      : ''
  }, [hoveredZone])

  useEffect(() => () => {
    document.body.style.cursor = ''
  }, [])

  function handlePointerMove(event) {
    event.stopPropagation()

    // Touch screens have no hover, and a drag (rotating the patient) is not
    // hovering: clear the label so it can't be left behind.
    if (!hoverEnabled || (event.pointerType && event.pointerType !== 'mouse') || event.buttons) {
      setHoveredZone((current) => (current ? null : current))
      return
    }

    const { zone } = pickZones(event.intersections, zones)

    setHoveredZone((current) =>
      current?.id === zone?.id ? current : zone,
    )
  }

  function handlePointerOut() {
    setHoveredZone(null)
  }

  function handleClick(event) {
    event.stopPropagation()

    if (event.delta > CLICK_DRAG_TOLERANCE_PX) return

    const { zone, options } = pickZones(
      event.intersections,
      zones,
    )

    if (event.pointerType && event.pointerType !== 'mouse') {
      setHoveredZone(null)
    }

    if (zone) onSelect(zone, options)
  }

  const hoverShown = hoveredZone && hoveredZone.id !== selectedZone?.id

  return (
    <group
      matrixAutoUpdate={false}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      // Zooming with the wheel moves the body under the cursor.
      onWheel={handlePointerOut}
      onClick={handleClick}
    >
      <Model
        selectedZone={selectedZone}
        hoveredZone={hoverShown ? hoveredZone : null}
        onReady={onModelReady}
        appearance={appearance}
        originalAttempt={originalAttempt}
      />

      <AnatomicalZones
        zones={zones}
        selectedZoneId={selectedZone?.id}
        hoveredZoneId={hoveredZone?.id}
        showDebugNodes={showDebugNodes}
      />

      {hoverShown && <HoverLabel zone={hoveredZone} />}
    </group>
  )
})
