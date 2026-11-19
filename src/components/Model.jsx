import { Bvh } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { use, useEffect, useMemo, useRef } from 'react'
import {
  DoubleSide,
  MeshBasicMaterial,
} from 'three'
import { registerDevHook } from '../devHooks'
import { buildPickSurface } from '../interaction/pickSurface'
import { useReducedMotion } from '../layout/useLayout'
import { loadModel } from '../modelLoader'
import { applyBodyLook } from '../viewer/bodyMaterial'
import { requestOriginal } from '../viewer/originalSkin'
import { surfaceAnchorFor } from '../viewer/surfaceAnchor'

// Keep in sync with tools/selection-check.js.
const MODEL_SCALE = 1.2
const MODEL_POSITION = [0, -1.5, 0]

const PICK_SURFACE_MATERIAL = new MeshBasicMaterial({
  side: DoubleSide,
})

// Start downloading as soon as the app starts.
loadModel()

/*
 * The patient never moves, so its parts' transforms are computed once
 * instead of on every frame (a measurable saving on slower processors;
 * nothing changes on screen or in picking).
 */
function freezeTransforms(root) {
  root.updateMatrixWorld(true)
  root.traverse((object) => {
    object.matrixAutoUpdate = false
  })
}

function updateOnce(object) {
  object.updateMatrix()
}

const looks = new WeakMap()

function bodyLookFor(model, renderer) {
  if (!looks.has(model)) {
    fixScalpLayer(model)
    looks.set(model, applyBodyLook(model, { renderer }))
  }

  return looks.get(model)
}

/*
 * The "light speck" on the back of the head (Milestone 3): the transparent
 * scalp layer, which has a mirror-like finish, was sometimes drawn on top of
 * the hair. Drawing it first and removing its shine fixes both the speck
 * and the dark cap. The model file is unchanged.
 */
function fixScalpLayer(model) {
  model.traverse((object) => {
    if (!object.isMesh || object.material?.name !== 'Scalp') return

    object.renderOrder = -1

    if ('specularIntensity' in object.material) {
      object.material.specularIntensity = 0
    }
  })
}

/*
 * What the body material needs to draw a location on the skin: where and
 * how large (the location sphere as an ellipsoid, in world units) and which
 * way the skin faces there.
 *
 * About half of the location centres sit slightly inside or outside the skin
 * (up to about 6 cm on this model), so the mark is centred on the nearest
 * visible surface point instead; otherwise buried spots (Superior Shoulder,
 * the upper-back quadrants) would not show and floating ones (toes) would
 * miss the skin. Which location is selected, and where it is, is unchanged.
 */
function highlightFor(zone, scene) {
  if (!zone) return null

  const anchor = surfaceAnchorFor(zone, scene)

  return {
    center: anchor?.point ?? zone.position,
    radii: zone.scale.map((scale) => scale * zone.radius),
    normal: anchor?.normal ?? [0, 0, 1],
    surfacePoint: anchor?.point ?? zone.position,
    zoneCenter: zone.position,
  }
}

/*
 * The posed patient, drawn with PainMapper's body material (which also
 * draws the selected and hovered locations on the skin itself), plus the
 * invisible copy of the skin used for picking (see interaction/).
 * The model file, pose, scale and position are unchanged.
 */
export default function Model({
  selectedZone,
  hoveredZone,
  onReady,
  // The chosen skin (the switch happens once Original is prepared;
  // originalAttempt restarts a failed attempt).
  appearance = 'neutral',
  originalAttempt = 0,
}) {
  const gltf = use(loadModel())
  const { scene: model } = gltf
  const rootScene = useThree((state) => state.scene)
  const gl = useThree((state) => state.gl)
  const camera = useThree((state) => state.camera)
  const groupRef = useRef(null)
  const reducedMotion = useReducedMotion()

  // Invisible copy of the posed skin used to decide what is under the
  // pointer (see interaction/pickSurface.js and zonePicking.js).
  const pickSurface = useMemo(() => {
    const surfaces = buildPickSurface(model)

    freezeTransforms(model)

    return surfaces
  }, [model])

  // Applied once per loaded model (React's development double rendering
  // must not patch the materials twice), and kept for the model's lifetime.
  const look = useMemo(() => bodyLookFor(model, gl), [model, gl])

  useEffect(() => {
    look.setReducedMotion?.(reducedMotion)
  }, [look, reducedMotion])

  useEffect(() => {
    look.setSelection(highlightFor(selectedZone, rootScene))
  }, [look, selectedZone, rootScene])

  const hoverKey = hoveredZone && hoveredZone.id !== selectedZone?.id
    ? hoveredZone.id
    : null

  useEffect(() => {
    look.setHover(hoverKey ? highlightFor(hoveredZone, rootScene) : null)
    // hoverKey captures hoveredZone and selectedZone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [look, hoverKey, rootScene])

  // The Original skin is prepared step by step on first request
  // (viewer/originalSkin.js) and shown only when ready; choosing Gray (or
  // trying again after an error) supersedes an unfinished request.
  useEffect(() => {
    if (appearance !== 'original') {
      look.setAppearance('neutral')
      return undefined
    }

    return requestOriginal({ gltf, look, gl, camera, scene: rootScene })
  }, [look, appearance, originalAttempt, gltf, gl, camera, rootScene])

  // Development read-out for automated checks: the skin shown and what each
  // mesh is drawn with (production builds have no read-outs).
  useEffect(() => registerDevHook('model', () => {
    const materials = []

    model.traverse((object) => {
      if (!object.isMesh || !object.material || Array.isArray(object.material)) return

      const { material } = object
      const image = material.map?.image

      materials.push({
        mesh: object.name,
        name: material.name,
        id: material.id,
        type: material.type,
        side: material.side,
        map: image ? { width: image.width, height: image.height } : null,
        normalMap: Boolean(material.normalMap),
        color: material.color?.getHexString?.() ?? null,
      })
    })

    return {
      appearance: look.appearance,
      startupKeptOriginalList: Boolean(gltf.userData.pmOriginalMaterials),
      materials,
    }
  }), [model, look, gltf])

  useFrame(({ clock }) => {
    look.update?.(clock.elapsedTime)
  })

  useEffect(() => {
    onReady?.({ group: groupRef.current, look })
  }, [onReady, look])

  return (
    <group
      ref={groupRef}
      scale={MODEL_SCALE}
      position={MODEL_POSITION}
      matrixAutoUpdate={false}
      onUpdate={updateOnce}
    >
      <primitive object={model} />

      {/* A spatial index (BVH) on the invisible picking copy: the same hits
          in the same order, found much faster on every pointer move. The
          selection check (tools/selection-check.js) already picks this way. */}
      <Bvh matrixAutoUpdate={false}>
        {pickSurface.map((geometry) => (
          <mesh
            key={geometry.uuid}
            geometry={geometry}
            material={PICK_SURFACE_MATERIAL}
            visible={false}
            matrixAutoUpdate={false}
            userData={{ pickRole: 'body' }}
          />
        ))}
      </Bvh>
    </group>
  )
}
