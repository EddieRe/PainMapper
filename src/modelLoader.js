import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODEL_PATH } from './modelAsset'
import { SHARED_WITH_NEUTRAL } from './viewer/bodyMaterial'

/*
 * Loads the 3D patient once and reports honest download progress.
 *
 * The file is read as a stream so received bytes can be counted. A
 * percentage is reported only when the server states the file size and
 * sends the file uncompressed. With a compressed response (as GitHub Pages
 * sends), the stated size and the received bytes measure different things,
 * so only the megabytes received are reported.
 *
 * Progress lives in a tiny store read with useSyncExternalStore; the model
 * itself is a promise read with React's use().
 *
 * The start-up read leaves out the textures only the Original skin uses
 * (see stripForNeutral), so they are not decoded at start-up only to be
 * thrown away by the gray clay. The file's bytes and the materials' full
 * description are kept (gltf.userData.pmOriginalMaterials), so the Original
 * skin is later built from this same read, without downloading or parsing
 * the model again (viewer/originalSkin.js).
 */

const GLB_MAGIC = 0x46546c67
const CHUNK_JSON = 0x4e4f534a

// Removes, in one material description, every texture the gray clay does
// not read (it keeps the skin and clothing normal maps and the hair, scalp
// and lash cut-out maps; see SHARED_WITH_NEUTRAL in viewer/bodyMaterial.js).
function stripForNeutral(material) {
  const keepNormal = SHARED_WITH_NEUTRAL.normalMap.test(material.name ?? '')
  const keepColor = SHARED_WITH_NEUTRAL.map.test(material.name ?? '')
  const pbr = material.pbrMetallicRoughness

  if (!keepNormal) delete material.normalTexture

  delete material.occlusionTexture
  delete material.emissiveTexture

  if (pbr) {
    if (!keepColor) delete pbr.baseColorTexture

    delete pbr.metallicRoughnessTexture
  }

  for (const extension of Object.values(material.extensions ?? {})) {
    if (!extension || typeof extension !== 'object') continue

    for (const [key, value] of Object.entries(extension)) {
      if (value && typeof value === 'object' && 'index' in value) delete extension[key]
    }
  }
}

/*
 * Rewrites the GLB's JSON chunk in place (same length, padded with spaces,
 * so the binary chunk is not copied) with the clay-only texture list, and
 * returns the original material descriptions; null (file untouched) if
 * anything is unexpected.
 */
function prepareStartupRead(buffer) {
  try {
    const view = new DataView(buffer)

    if (view.getUint32(0, true) !== GLB_MAGIC || view.getUint32(16, true) !== CHUNK_JSON) return null

    const length = view.getUint32(12, true)
    const bytes = new Uint8Array(buffer, 20, length)
    const json = JSON.parse(new TextDecoder().decode(bytes))

    if (!Array.isArray(json.materials)) return null

    const originalMaterials = structuredClone(json.materials)

    json.materials.forEach(stripForNeutral)

    const text = new TextEncoder().encode(JSON.stringify(json))

    if (text.length > length) return null

    bytes.set(text)
    bytes.fill(0x20, text.length)

    return originalMaterials
  } catch {
    return null
  }
}

let progress = Object.freeze({ phase: 'idle', received: 0, total: 0 })
const listeners = new Set()
let pending = null
let loaded = null

// The loaded model, or null while it is still loading (lets the Original
// skin start decoding when the pointer reaches its button).
export function loadedModel() {
  return loaded
}

const REPORT_EVERY_BYTES = 512 * 1024

function report(changes) {
  progress = Object.freeze({ ...progress, ...changes })
  listeners.forEach((listener) => listener())
}

export function subscribeToModelProgress(listener) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function getModelProgress() {
  return progress
}

async function download() {
  report({ phase: 'downloading', received: 0, total: 0 })

  const response = await fetch(MODEL_PATH)

  if (!response.ok) {
    throw new Error(`The model request failed (HTTP ${response.status}).`)
  }

  // Some servers answer a missing file with their web page instead of a 404.
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    throw new Error('The model file could not be loaded (the server sent a web page instead).')
  }

  const statedSize = Number(response.headers.get('Content-Length')) || 0
  const compressed = Boolean(response.headers.get('Content-Encoding'))
  const total = statedSize > 0 && !compressed ? statedSize : 0

  report({ total })

  if (!response.body) {
    const buffer = await response.arrayBuffer()

    report({ received: buffer.byteLength })

    return buffer
  }

  const reader = response.body.getReader()
  const chunks = []
  let received = 0
  let lastReported = 0

  for (;;) {
    const { done, value } = await reader.read()

    if (done) break

    chunks.push(value)
    received += value.byteLength

    if (received - lastReported >= REPORT_EVERY_BYTES) {
      lastReported = received
      report({ received })
    }
  }

  report({ received })

  const bytes = new Uint8Array(received)
  let offset = 0

  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  return bytes.buffer
}

// Development only, for checks: '?pmExperiment=no-strip' reads the model
// exactly as Milestone 4 did (every texture decoded at start-up), which is
// also what happens if the start-up read cannot be prepared.
function startupStripOff() {
  return import.meta.env.DEV
    && typeof location !== 'undefined'
    && new URLSearchParams(location.search).getAll('pmExperiment').includes('no-strip')
}

async function downloadAndParse() {
  const buffer = await download()

  report({ phase: 'processing' })

  const originalMaterials = startupStripOff() ? null : prepareStartupRead(buffer)
  const gltf = await new GLTFLoader().parseAsync(buffer, '')

  // null: the start-up read decoded every texture (the Original skin then
  // re-decodes the ones the clay released).
  gltf.userData.pmOriginalMaterials = originalMaterials
  loaded = gltf

  report({ phase: 'ready' })

  return gltf
}

// The same promise is returned until retryModel() is called.
export function loadModel() {
  if (!pending) {
    pending = downloadAndParse().catch((error) => {
      report({ phase: 'error' })
      throw error
    })
  }

  return pending
}

export function retryModel() {
  pending = null
  loaded = null
  report({ phase: 'idle', received: 0, total: 0 })
}
