import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  OrthographicCamera,
  Scene,
  Vector3,
  WebGLRenderTarget,
} from 'three'

/*
 * Front and back pictures of the posed patient for the miniature locator.
 *
 * Rendered once, offscreen, with the app's own renderer (no second 3D
 * context), from the invisible picking copy of the skin. That copy is
 * already baked in the displayed pose and has no hair or eyes, so the
 * picture is a clean silhouette in exactly the shape the learner sees, and
 * a location can be placed on it by plain projection.
 *
 * Returns { front: { url, aspect }, back: { url, aspect },
 *           project(worldPosition, face) -> { u, v } }   (0..1 in the image)
 */

// A mid grey-blue figure: reads on the navy viewer and on light tiles.
const FIGURE_COLOR = '#a9b5bc'
const MARGIN = 1.04

function linearToSrgb(value) {
  const v = value / 255

  const encoded = v <= 0.0031308
    ? v * 12.92
    : 1.055 * (v ** (1 / 2.4)) - 0.055

  return Math.round(Math.min(1, Math.max(0, encoded)) * 255)
}

function pickMeshesIn(root) {
  const meshes = []

  root.traverse((object) => {
    if (object.isMesh && object.userData?.pickRole === 'body') meshes.push(object)
  })

  return meshes
}

export function createLocatorSnapshots(renderer, root, { height = 480 } = {}) {
  root.updateWorldMatrix(true, true)

  const sources = pickMeshesIn(root)

  if (sources.length === 0) throw new Error('No body surface to draw.')

  // A small scene of its own: flat-lit copies of the posed skin.
  const scene = new Scene()
  const material = new MeshStandardMaterial({
    color: new Color(FIGURE_COLOR),
    roughness: 0.85,
    metalness: 0,
  })
  const geometries = []
  const box = new Box3()

  for (const source of sources) {
    const geometry = source.geometry.clone()

    geometry.computeVertexNormals()
    geometries.push(geometry)

    const mesh = new Mesh(geometry, material)

    mesh.matrixAutoUpdate = false
    mesh.matrix.copy(source.matrixWorld)
    mesh.matrixWorld.copy(source.matrixWorld)
    scene.add(mesh)

    geometry.computeBoundingBox()
    box.union(geometry.boundingBox.clone().applyMatrix4(source.matrixWorld))
  }

  const center = box.getCenter(new Vector3())
  const size = box.getSize(new Vector3())
  const halfHeight = (size.y / 2) * MARGIN
  const halfWidth = (size.x / 2) * MARGIN
  const aspect = halfWidth / halfHeight
  const width = Math.max(16, Math.round(height * aspect))

  const camera = new OrthographicCamera(-halfWidth, halfWidth, halfHeight, -halfHeight, 0.01, 100)
  const hemisphere = new HemisphereLight('#ffffff', '#8a98a2', 1.6)
  const key = new DirectionalLight('#ffffff', 1.7)

  scene.add(hemisphere, key, key.target)

  const target = new WebGLRenderTarget(width, height)
  const pixels = new Uint8Array(width * height * 4)
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')

  const previousTarget = renderer.getRenderTarget()
  const previousClearColor = renderer.getClearColor(new Color())
  const previousClearAlpha = renderer.getClearAlpha()

  function draw(face) {
    const towards = face === 'back' ? -1 : 1

    camera.position.set(center.x, center.y, center.z + towards * 10)
    camera.lookAt(center)
    camera.updateMatrixWorld()

    // Light from above, slightly to the viewer's left, as in the 3D view.
    key.position.set(center.x - towards * 3, center.y + 4, center.z + towards * 6)
    key.target.position.copy(center)
    key.target.updateMatrixWorld()

    renderer.setRenderTarget(target)
    renderer.setClearColor(0x000000, 0)
    renderer.clear(true, true, true)
    renderer.render(scene, camera)
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels)

    // Rows come bottom-up and in linear colour: flip and encode for display.
    const image = context.createImageData(width, height)

    for (let y = 0; y < height; y += 1) {
      const from = (height - 1 - y) * width * 4
      const to = y * width * 4

      for (let x = 0; x < width * 4; x += 4) {
        image.data[to + x] = linearToSrgb(pixels[from + x])
        image.data[to + x + 1] = linearToSrgb(pixels[from + x + 1])
        image.data[to + x + 2] = linearToSrgb(pixels[from + x + 2])
        image.data[to + x + 3] = pixels[from + x + 3]
      }
    }

    context.clearRect(0, 0, width, height)
    context.putImageData(image, 0, 0)

    return { url: canvas.toDataURL('image/png'), aspect: width / height }
  }

  let front
  let back

  try {
    front = draw('front')
    back = draw('back')
  } finally {
    renderer.setRenderTarget(previousTarget)
    renderer.setClearColor(previousClearColor, previousClearAlpha)
    target.dispose()
    material.dispose()
    geometries.forEach((geometry) => geometry.dispose())
  }

  const minX = center.x - halfWidth
  const maxY = center.y + halfHeight

  return {
    front,
    back,
    // From the front the patient's right (-x) is on the image's left;
    // from the back it is on the right.
    project(position, face = 'front') {
      const [x, y] = position
      const u = face === 'back'
        ? 1 - (x - minX) / (2 * halfWidth)
        : (x - minX) / (2 * halfWidth)

      return {
        u: Math.min(1, Math.max(0, u)),
        v: Math.min(1, Math.max(0, (maxY - y) / (2 * halfHeight))),
      }
    },
  }
}
