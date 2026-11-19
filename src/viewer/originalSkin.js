import { Frustum, Matrix4 } from 'three'

/*
 * ORIGINAL SKIN: the mannequin's own textured materials for the Skin control
 * (Gray / Original), prepared so that the page never freezes.
 *
 * Why the first switch used to take seconds (the anatomy pilot's first
 * version): it downloaded and parsed the whole 54 MB model a second time,
 * then let the first Original frame compile its shaders and upload its
 * textures all at once.
 *
 * Here, on the first request (or already when the pointer reaches the
 * Original button, see warmOriginal):
 * 1. decoding: the materials are created from the model read at start-up
 *    (modelLoader.js kept the file's bytes and full material list); only the
 *    textures the clay does not already hold are decoded, off the main
 *    thread (ImageBitmap); nothing is downloaded and no geometry is parsed;
 * 2. compiling: the shader programs of the meshes in view are compiled in
 *    the background (renderer.compileAsync, parallel compilation where the
 *    browser has it);
 * 3. uploading: each mesh in view is drawn once into a single hidden pixel,
 *    one per frame, which uploads its textures and finishes its shaders for
 *    its real vertex format (see preparingDraws), so frames keep flowing;
 * 4. showing: only then are the materials switched, and the status turns
 *    'ready' after the first Original frame has been drawn;
 * 5. afterwards, in the background: the meshes outside the view (the head,
 *    in the knee view) get the same treatment, one texture or one mesh per
 *    frame, so a later zoom-out does not stall either.
 * The latest choice wins: choosing Gray during any step stops (before the
 * switch, or the background step after it). A failure shows an error with a
 * "Try again" button that really starts again. Back to Gray, the GPU copies
 * of the original-only textures are released after a minute in Gray (a
 * quick return is instant; after the release the decoded pictures are still
 * there, so the next switch only uploads them again, a few meshes per
 * frame).
 *
 * Status lives in a tiny store read with useSyncExternalStore.
 */

let status = Object.freeze({ phase: 'idle', step: null, done: 0, total: 0, error: null, timings: null })
const listeners = new Set()

let materialsPromise = null
// Every program compiled, warmed and checked, for this renderer's current
// graphics state (renderer.properties: a new 3D view after the model is
// reloaded has a new renderer, and when the browser restores a lost
// graphics context three.js starts with new state; both need everything
// prepared again).
let compiled = false
let compiledFor = null
let request = 0
let simulatedFailures = null

function isCompiled(gl) {
  return compiled && compiledFor === gl.properties
}

// Per-frame work limits while preparing (keep each frame short).
const MATERIALS_PER_FRAME = 4
const PROGRAMS_PER_FRAME = 3

function report(changes) {
  status = Object.freeze({ ...status, ...changes })
  listeners.forEach((listener) => listener())
}

export function subscribeToOriginalSkin(listener) {
  listeners.add(listener)

  return () => listeners.delete(listener)
}

export function getOriginalSkinStatus() {
  return status
}

// Development only, for measurements: '?pmExperiment=no-draws' skips the
// preparing draws (three.js then uploads the textures and finishes the
// shaders on the first Original frame, as the first version did);
// '?pmExperiment=no-background' skips step 5 (the meshes outside the view
// are then prepared by their first real draw, for example at a zoom-out).
function experiment(name) {
  return import.meta.env.DEV
    && typeof location !== 'undefined'
    && new URLSearchParams(location.search).getAll('pmExperiment').includes(name)
}

// Development only: '?pmSimulate=original-error' makes the first attempt fail
// (to check the error and "Try again" path).
function simulatedFailure() {
  if (!import.meta.env.DEV) return false

  if (simulatedFailures === null) {
    const wanted = typeof location !== 'undefined'
      && new URLSearchParams(location.search).get('pmSimulate') === 'original-error'

    simulatedFailures = wanted ? 1 : 0
  }

  if (simulatedFailures > 0) {
    simulatedFailures -= 1
    return true
  }

  return false
}

// Resolves inside the next animation frame, after React Three Fiber has
// drawn it (its frame callback was requested earlier).
function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}

// A step that never finishes (for example a lost graphics context) ends in
// the error state with "Try again", never in an endless "Preparing". Only
// time with the page visible counts: in a background tab the browser pauses
// the frames the steps wait for, which is not a failure.
const STEP_TIMEOUT_MS = 20000
const TIMEOUT_TICK_MS = 250

function pageVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

function withinTime(promise, what) {
  let timer = null
  const timeout = new Promise((_, reject) => {
    let visibleMs = 0
    let last = performance.now()
    let wasVisible = pageVisible()

    timer = setInterval(() => {
      const now = performance.now()
      const visible = pageVisible()

      // Counted only between two visible ticks (and at most a second per
      // tick: a throttled background timer can fire late).
      if (wasVisible && visible) visibleMs += Math.min(now - last, 1000)
      last = now
      wasVisible = visible

      if (visibleMs >= STEP_TIMEOUT_MS) reject(new Error(`${what} took longer than ${STEP_TIMEOUT_MS / 1000} s.`))
    }, TIMEOUT_TICK_MS)
  })

  return Promise.race([promise, timeout]).finally(() => clearInterval(timer))
}

// glTF material slots and the three.js properties they become.
const SLOT_PROPERTIES = [
  [(def) => def.pbrMetallicRoughness?.baseColorTexture, 'map'],
  [(def) => def.pbrMetallicRoughness?.metallicRoughnessTexture, 'roughnessMap'],
  [(def) => def.normalTexture, 'normalMap'],
  [(def) => def.occlusionTexture, 'aoMap'],
  [(def) => def.emissiveTexture, 'emissiveMap'],
  [(def) => def.extensions?.KHR_materials_specular?.specularTexture, 'specularIntensityMap'],
  [(def) => def.extensions?.KHR_materials_specular?.specularColorTexture, 'specularColorMap'],
]

// Textures whose decoded picture was released (only if the start-up read
// could not leave them out): forget them, so they are decoded again.
async function forgetReleasedTextures(parser) {
  const count = parser.json.textures?.length ?? 0

  for (let index = 0; index < count; index += 1) {
    const cached = parser.cache.get(`texture:${index}`)

    if (!cached) continue

    const texture = await cached.catch(() => null)
    const image = texture?.image

    // A texture that failed to decode is cached as null: forget it too, so
    // "Try again" decodes it again.
    if (!texture || !(image && image.width > 0)) {
      const def = parser.json.textures[index]
      const source = parser.json.images?.[def.source] ?? {}

      parser.cache.remove(`texture:${index}`)
      delete parser.textureCache[`${source.uri || source.bufferView}:${def.sampler}`]
      delete parser.sourceCache[def.source]
    }
  }
}

// The loader reads a material's description synchronously when asked for
// it, so the full (unstripped) list is put in place only for that call:
// never across a frame, so overlapping attempts cannot see the wrong list.
function originalMaterial(parser, defs, index) {
  const startup = parser.json.materials

  parser.json.materials = defs

  try {
    parser.cache.remove(`material:${index}`)

    return parser.getDependency('material', index)
  } finally {
    parser.json.materials = startup
  }
}

async function createMaterials(gltf) {
  const parser = gltf.parser
  const defs = gltf.userData.pmOriginalMaterials ?? parser.json.materials

  if (!gltf.userData.pmOriginalMaterials) await forgetReleasedTextures(parser)

  // 1. Their textures, a few materials' worth per frame: starting a texture
  //    copies its bytes and starts its (background) decoding; all at once
  //    that was one long main-thread task. (A texture that fails comes back
  //    as null and is reported below.)
  const textures = []

  for (let index = 0; index < defs.length; index += 1) {
    for (const [slot] of SLOT_PROPERTIES) {
      const def = slot(defs[index])

      if (def) textures.push(parser.getDependency('texture', def.index).catch(() => null))
    }

    if (index % MATERIALS_PER_FRAME === MATERIALS_PER_FRAME - 1) await nextFrame()
  }

  await Promise.all(textures)

  // 2. Then the materials, one after another in the model file's order.
  //    three.js breaks ties between overlapping surfaces by the order the
  //    materials were made; made as their textures happened to finish, a
  //    few hairline and eye pixels differed from one visit to the next.
  const materials = []

  for (let index = 0; index < defs.length; index += 1) {
    materials.push(await originalMaterial(parser, defs, index))
  }

  const missing = []

  materials.forEach((material, index) => {
    for (const [slot, property] of SLOT_PROPERTIES) {
      if (slot(defs[index]) && !material[property]) missing.push(`${material.name}.${property}`)
    }
  })

  if (missing.length) {
    // A texture failed to decode: forget it so "Try again" decodes it again.
    defs.forEach((_, index) => parser.cache.remove(`material:${index}`))
    await forgetReleasedTextures(parser)
    throw new Error(`Some textures could not be decoded (${missing.slice(0, 3).join(', ')}).`)
  }

  return new Map(materials.map((material) => [material.name, material]))
}

// The materials belong to one loaded model: after the 3D view reloads the
// model ("Try again" on its error screen) they are made again from the new
// read, and its shaders are prepared again.
let materialsModel = null
// The model whose materials are made (decoded) already.
let materialsDoneFor = null

function materialsFor(gltf) {
  if (!materialsPromise || materialsModel !== gltf) {
    materialsModel = gltf
    materialsDoneFor = null
    compiled = false

    const attempt = createMaterials(gltf).then((materials) => {
      if (materialsPromise === attempt) materialsDoneFor = gltf
      return materials
    }, (error) => {
      // Forget only this attempt (a newer one may have started meanwhile).
      if (materialsPromise === attempt) materialsPromise = null
      throw error
    })

    materialsPromise = attempt
  }

  return materialsPromise
}

/*
 * Starts step 1 early (pointer over or focus on the Original button): it
 * runs off the main thread and needs no GPU memory; nothing is shown.
 */
export function warmOriginal(gltf) {
  if (!gltf || status.phase === 'error') return

  materialsFor(gltf).catch(() => {})
}

/*
 * Which stand-ins are prepared before the switch: those whose real mesh the
 * camera sees now (the same test three.js uses to skip drawing a mesh).
 * The rest is prepared in the background after the switch.
 */
const frustum = new Frustum()
const viewProjection = new Matrix4()

function splitByView(proxies, camera) {
  camera.updateMatrixWorld()
  viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
  frustum.setFromProjectionMatrix(viewProjection, camera.coordinateSystem, camera.reversedDepth)

  const inView = []
  const outOfView = []

  for (const proxy of proxies) {
    const real = proxy.userData.pmSource ?? proxy
    const seen = real.frustumCulled === false || frustum.intersectsObject(real)

    ;(seen ? inView : outOfView).push(proxy)
  }

  return { inView, outOfView }
}

// The textures a material samples through its maps (small textures held in
// shader uniforms are uploaded by the mesh's preparing draw).
function texturesOf(material) {
  return [...new Set(Object.values(material).filter((value) => value?.isTexture))]
}

function uploaded(gl, texture) {
  return gl.properties.get(texture).__version === texture.version
}

/*
 * Step 3, preparing draws: each stand-in mesh is drawn once, one per frame,
 * into a single pixel of the view (scissored, after the frame was drawn,
 * nothing cleared), while the body keeps turning:
 * - the draw uploads that mesh's textures that are not on the GPU yet;
 * - on Windows the browser draws WebGL through Direct3D (ANGLE), which
 *   finishes a shader for each mesh's exact vertex format only at that
 *   mesh's first draw; with a cold shader cache that froze the first
 *   Original frame for about 0.4 s; here it happens in small pieces.
 * Drawn with the real scene's lights and environment (a spare layer), so
 * the programs are exactly those of the real meshes.
 */
const WARM_LAYER = 4
const HIDDEN_LAYER = 31

// The first time, one mesh per frame (each may finish a shader). Later
// (shaders done, only textures to upload again after Gray), meshes are
// drawn until this much time was spent in the frame.
const REPEAT_DRAW_BUDGET_MS = 8

async function preparingDraws(gl, camera, scene, group, isCurrent, { list = group.children, onePerFrame, progress = true }) {
  const proxies = [...group.children]
  const lights = []
  let done = 0
  let frameStart = -Infinity

  scene.traverse((object) => {
    if (object.isLight) lights.push(object)
  })

  for (const proxy of list) {
    if (onePerFrame || performance.now() - frameStart > REPEAT_DRAW_BUDGET_MS) {
      await nextFrame()
      frameStart = performance.now()
    }

    if (!isCurrent()) return false

    done += 1
    if (progress) report({ done })

    const mask = camera.layers.mask
    const autoClear = gl.autoClear
    const scissorTest = gl.getScissorTest()
    const checkErrors = gl.debug.checkShaderErrors
    const lightsWithout = lights.filter((light) => !light.layers.isEnabled(WARM_LAYER))

    proxies.forEach((other) => other.layers.set(other === proxy ? WARM_LAYER : HIDDEN_LAYER))
    lightsWithout.forEach((light) => light.layers.enable(WARM_LAYER))
    scene.add(group)

    try {
      camera.layers.set(WARM_LAYER)
      gl.autoClear = false
      gl.setScissorTest(true)
      gl.setScissor(0, 0, 1, 1)
      // three.js's error check on a program's first use reads its info log,
      // which makes the page WAIT while the browser's graphics process
      // finishes that shader (measured: up to 0.1 s per program). Skipped
      // here, then done afterwards (verifyPrograms), when it no longer waits.
      gl.debug.checkShaderErrors = false
      gl.render(scene, camera)
    } finally {
      gl.debug.checkShaderErrors = checkErrors
      scene.remove(group)
      camera.layers.mask = mask
      gl.autoClear = autoClear
      gl.setScissorTest(scissorTest)
      lightsWithout.forEach((light) => light.layers.disable(WARM_LAYER))
    }
  }

  return isCurrent()
}

// After warming: every program these meshes use must have linked (by now
// the shaders are compiled, so asking does not wait). A failure before the
// switch is reported as an error and the body stays gray.
function verifyPrograms(gl, proxies) {
  const context = gl.getContext()

  for (const proxy of proxies) {
    const programs = gl.properties.get(proxy.material).programs

    for (const program of programs?.values() ?? []) {
      if (!context.getProgramParameter(program.program, context.LINK_STATUS)) {
        const log = context.getProgramInfoLog(program.program) || 'no log'

        throw new Error(`A shader of ${proxy.material.name} did not link (${log.slice(0, 120)}).`)
      }
    }
  }
}

// Compiles the programs of some stand-ins, a few meshes per frame (the part
// of compiling that runs on the page itself is then short); they finish in
// parallel in the background where the browser supports it. Resolves to
// the list of compile promises, or null if the request was dropped.
async function startCompiling(gl, camera, scene, proxies, isCurrent) {
  const programs = []

  for (let i = 0; i < proxies.length; i += PROGRAMS_PER_FRAME) {
    await nextFrame()

    if (!isCurrent()) return null

    proxies.slice(i, i + PROGRAMS_PER_FRAME).forEach((proxy) => programs.push(gl.compileAsync(proxy, camera, scene)))
  }

  return programs
}

/*
 * Step 5, after the switch, in the background: the meshes outside the view
 * get their programs compiled, their textures uploaded one per frame (a
 * head material has several large ones; all in one frame was a hitch of up
 * to 0.1 s on the test PC), then one draw each, one per frame, to finish
 * their shaders. Stops as soon as the request is dropped (Gray chosen).
 */
async function prepareOutOfView(gl, camera, scene, group, proxies, isCurrent) {
  if (!isCompiled(gl)) {
    const programs = await startCompiling(gl, camera, scene, proxies, isCurrent)

    if (!programs) return false

    await withinTime(Promise.all(programs), 'Compiling the shaders')
  }

  for (const proxy of proxies) {
    for (const texture of texturesOf(proxy.material)) {
      if (uploaded(gl, texture)) continue

      await nextFrame()

      if (!isCurrent()) return false

      gl.initTexture(texture)
    }
  }

  if (!(await preparingDraws(gl, camera, scene, group, isCurrent, { list: proxies, onePerFrame: !isCompiled(gl), progress: false }))) return false

  verifyPrograms(gl, proxies)

  return isCurrent()
}

/*
 * Prepares and shows the Original skin. Returns a cancel function (the
 * caller cancels when the choice changes). `look` is the body look handle
 * (viewer/bodyMaterial.js), gl/camera/scene the R3F renderer state.
 */
export function requestOriginal({ gltf, look, gl, camera, scene }) {
  const id = ++request
  const isCurrent = () => id === request
  const started = performance.now()
  const timings = {}
  let mark = started

  const lap = (name) => {
    const now = performance.now()

    timings[name] = Math.round(now - mark)
    mark = now
  }

  async function run() {
    if (look.appearance === 'original') {
      report({ phase: 'ready', step: null, error: null })
      return
    }

    // "Getting ready" until it is known what is left to do (a quick return,
    // or a click after the pointer rested on the button, decodes nothing).
    report({ phase: 'preparing', step: null, done: 0, total: 0, error: null, timings: null })

    // Let the "Preparing" state paint before any work starts.
    await nextFrame()

    if (!isCurrent()) return

    // (A failure while warming up on hover is silent and simply retried
    // here; the development simulation fails this request itself.)
    if (import.meta.env.DEV && simulatedFailure()) throw new Error('Simulated failure (development check).')

    if (materialsDoneFor !== gltf) report({ step: 'decoding' })

    const byName = await withinTime(materialsFor(gltf), 'Decoding the textures')

    lap('decodeMs')

    if (!isCurrent()) return

    // The graphics state this preparation is for (decoding does no graphics
    // work): if the browser loses and restores the graphics context from
    // here on, what was prepared is gone.
    const graphics = gl.properties

    look.adoptOriginals(byName)

    const group = look.originalCompileGroup()
    const prepare = Boolean(group) && !look.originalTexturesResidentOn(gl) && !experiment('no-draws')
    // Before the switch only the meshes in view; the rest after it.
    const { inView } = group ? splitByView(group.children, camera) : { inView: [] }

    if (!isCompiled(gl) && group) {
      report({ step: 'compiling' })

      const programs = await startCompiling(gl, camera, scene, prepare ? inView : group.children, isCurrent)

      if (!programs) return

      await withinTime(Promise.all(programs), 'Compiling the shaders')
      lap('compileMs')

      if (!isCurrent()) return
    }

    // Textures go to the GPU (again, after Gray released them) and the
    // shaders are finished for each mesh in view, one mesh per frame.
    if (prepare) {
      report({ step: 'uploading', done: 0, total: inView.length })
      look.cancelOriginalRelease()

      if (!(await preparingDraws(gl, camera, scene, group, isCurrent, { list: inView, onePerFrame: !isCompiled(gl) }))) return

      verifyPrograms(gl, inView)

      if (!isCurrent()) return

      // The camera may have moved meanwhile (Whole body, Centre, a drag):
      // meshes that came into view are prepared now as well, before the
      // switch, so none of them is first drawn unprepared.
      const late = splitByView(group.children, camera).inView.filter((proxy) => !inView.includes(proxy))

      if (late.length) {
        if (!isCompiled(gl)) {
          const programs = await startCompiling(gl, camera, scene, late, isCurrent)

          if (!programs) return

          await withinTime(Promise.all(programs), 'Compiling the shaders')
        }

        if (!(await preparingDraws(gl, camera, scene, group, isCurrent, { list: late, onePerFrame: !isCompiled(gl), progress: false }))) return

        verifyPrograms(gl, late)
        inView.push(...late)

        if (!isCurrent()) return
      }

      lap('drawsMs')
    }

    // Switching now would make the next frame prepare everything at once
    // (the freeze this file avoids): end in the error state; "Try again"
    // prepares again for the new graphics state.
    if (gl.properties !== graphics) throw new Error('The graphics context was reset while preparing.')

    look.setAppearance('original')
    report({ step: 'showing' })

    // The next animation frame draws Original; the one after shows it.
    await nextFrame()
    await nextFrame()

    if (!isCurrent()) return

    lap('showMs')
    timings.totalMs = Math.round(performance.now() - started)
    report({ phase: 'ready', step: null, timings })

    if (!prepare || experiment('no-background')) return

    // Step 5: the meshes outside the view, in the background. A problem
    // here does not undo the switch (the body already shows Original); it
    // is logged, and the mesh is then prepared by its first real draw.
    try {
      const rest = group.children.filter((proxy) => !inView.includes(proxy))

      // Only if the graphics state is still the one prepared for.
      if (await prepareOutOfView(gl, camera, scene, group, rest, isCurrent) && gl.properties === graphics) {
        compiled = true
        compiledFor = graphics
        look.markOriginalTexturesResident(gl)
      }
    } catch (error) {
      console.warn('Part of the original skin could not be prepared in advance:', error)
    }
  }

  run().catch((error) => {
    if (!isCurrent()) return

    console.warn('The original skin could not be prepared:', error)
    // The body stays (or goes back to) gray; textures a failed attempt may
    // have uploaded are released like after any return to Gray.
    look.setAppearance('neutral')
    report({ phase: 'error', step: null, error: error?.message ?? String(error) })
  })

  return () => {
    if (isCurrent()) {
      request += 1

      if (status.phase !== 'error') report({ phase: 'idle', step: null, done: 0, total: 0 })
    }
  }
}

// After an error: forget the failed attempt so the next request starts over.
export function resetOriginalError() {
  materialsPromise = null
  materialsDoneFor = null

  if (status.phase === 'error') report({ phase: 'idle', error: null })
}

// The 3D view reloads the model (its error screen's "Try again"): forget
// everything made for the old model and renderer, so that neither stays in
// memory, and start over on the next request.
export function forgetOriginalModel() {
  request += 1
  materialsPromise = null
  materialsModel = null
  materialsDoneFor = null
  compiled = false
  compiledFor = null
  report({ phase: 'idle', step: null, done: 0, total: 0, error: null, timings: null })
}
