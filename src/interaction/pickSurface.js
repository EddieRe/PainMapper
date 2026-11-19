import {
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Vector3,
} from 'three'

/*
 * Skin, nails and clothing form the clickable body surface.
 * Hair, eyes, teeth and eyelashes are ignored when clicking.
 */
export const PICK_SURFACE_MATERIAL = /^(Std_Skin_|Std_Nails|Boxers)/

function ignoreRaycast() {}

/*
 * The model is a posed skeleton mesh. Hit-testing it directly re-poses
 * every vertex on every pointer move (about 5 ms each time). Because the
 * pose never changes, we copy ("bake") the visible pose once into plain
 * geometry, in the scene's own coordinates, used only for hit-testing
 * (about 0.04 ms).
 *
 * Side effect: the visible model's meshes are excluded from hit-testing.
 */
export function buildPickSurface(scene) {
  scene.updateMatrixWorld(true)

  const sceneToLocal = new Matrix4()
    .copy(scene.matrixWorld)
    .invert()
  const meshToScene = new Matrix4()
  const vertex = new Vector3()
  const geometries = []

  scene.traverse((object) => {
    if (!object.isMesh) return

    object.raycast = ignoreRaycast

    if (!PICK_SURFACE_MATERIAL.test(object.material?.name ?? '')) {
      return
    }

    meshToScene.multiplyMatrices(sceneToLocal, object.matrixWorld)

    const source = object.geometry.attributes.position
    const positions = new Float32Array(source.count * 3)

    for (let index = 0; index < source.count; index += 1) {
      object.getVertexPosition(index, vertex)
      vertex.applyMatrix4(meshToScene)
      positions[index * 3] = vertex.x
      positions[index * 3 + 1] = vertex.y
      positions[index * 3 + 2] = vertex.z
    }

    const geometry = new BufferGeometry()
    geometry.setAttribute(
      'position',
      new BufferAttribute(positions, 3),
    )

    if (object.geometry.index) {
      geometry.setIndex(object.geometry.index.clone())
    }

    geometry.computeBoundingSphere()
    geometries.push(geometry)
  })

  return geometries
}
