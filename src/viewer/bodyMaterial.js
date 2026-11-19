import {
  AddEquation,
  Color,
  CustomBlending,
  DataTexture,
  FloatType,
  Group,
  MaxEquation,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NearestFilter,
  OneFactor,
  RGBAFormat,
  SkinnedMesh,
  Vector3,
  ZeroFactor,
} from 'three'

/*
 * PainMapper's look for the 3D patient (Milestone 4).
 *
 * 1. Clay. The realistic skin, nail and clothing colours are replaced by a
 *    uniform light grey-blue clay (the dark-anatomy boards). The skin keeps
 *    its normal maps, read slightly blurred (sculpted forms stay, pores go)
 *    with smooth per-vertex tangents, so the low-polygon body does not show
 *    triangle facets. Hair, lashes, eyes, teeth and tongue get darker or
 *    lighter clay tints; hair and lashes keep their cut-out shapes. The
 *    colour textures of restyled materials are dropped (never uploaded).
 *
 * 2. The selected and hovered locations are drawn ON the skin by the skin,
 *    nail and boxer materials themselves (onBeforeCompile), from the posed
 *    (skinned) world position of every pixel, so a patch follows the surface
 *    and stays attached from every camera angle: no decal geometry, nothing
 *    that can float, clip or z-fight.
 *    - Selection: one flat coral fill with a soft edge and a thin, slightly
 *      brighter rim. It marks WHERE, never how much (no gradients, no glow
 *      that could read as pain intensity).
 *    - Hover (mouse): a thin light teal-white ring, no fill.
 *    A patch is the location's ellipsoid (radii along the world axes),
 *    centred where the location meets the skin, limited to skin facing the
 *    same way as the spot, so it never shows on the far side of a limb or
 *    through the torso.
 *
 * Nothing here touches geometry, skeleton, pose, transforms, ray casting or
 * the invisible picking copy of the skin, and material names are kept
 * (picking finds its surfaces by material name).
 *
 * 3. Skin appearance: 'neutral' (the clay above, the default, drawn exactly
 *    as before) or 'original' (the model's own textured materials, built on
 *    first use from the start-up read of the model file, with the same
 *    selection and hover drawing; viewer/originalSkin.js runs the loading
 *    steps so that the page never freezes).
 *
 *   const look = applyBodyLook(scene, { renderer })
 *   look.setSelection({ center, radii, normal, surfacePoint, strength? } | null)
 *   look.setHover(same shape | null)
 *   look.setReducedMotion(true | false)
 *   look.adoptOriginals(originalsByName)       // Original: prepare, once
 *   look.originalCompileGroup()                // Original: stand-ins to prepare
 *   look.originalTexturesResidentOn(renderer) / markOriginalTexturesResident(renderer)
 *   look.cancelOriginalRelease()
 *   look.setAppearance('neutral' | 'original')
 *   look.update(elapsedSeconds)      // every frame
 *   look.dispose()
 *
 * The model is loaded once and cached (modelLoader.js), so the clay
 * materials stay on it: applyBodyLook() on a scene it already restyled
 * reuses them, and dispose() only switches this handle's highlights off.
 * That also keeps React StrictMode's double render and effect replay
 * harmless.
 */

// ---------------------------------------------------------------------------
// Palette (sRGB), sampled from the boards.

const CLAY = '#adbac4'
const NAIL_CLAY = '#cad4da'
const BOXER_CLAY = '#7f8e99'
const HAIR_CLAY = '#5f6c76'
const LASH_CLAY = '#414d56'
const EYE_CLAY = '#aab7c0'
const TEETH_CLAY = '#c9d1d6'
const TONGUE_CLAY = '#8b97a0'

const SELECTION_FILL = '#ef8169'
const SELECTION_RIM = '#ffc9bb'
const HOVER_RING = '#d9faf3'
// Original skin: how long its own textures stay on the GPU after going back
// to Gray (a quick return to Original is then instant).
const ORIGINAL_RELEASE_DELAY_MS = 60000

// ---------------------------------------------------------------------------
// Surface.

const SKIN_ROUGHNESS = 0.62
const BOXER_ROUGHNESS = 0.8
// Normal maps: strength, and how many mip levels blurrier they are read.
const NORMAL_STRENGTH = 0.75
const NORMAL_BLUR = 2
// Hair: cut-out threshold (lower = fuller, no scalp showing through), how
// much of the strand pattern shows, and a little self-light so cards facing
// away from every light never read as black holes.
const HAIR_ALPHA_TEST = 0.2
const HAIR_STRAND_MIX = 0.25
const HAIR_GLOW = 0.12
// The scalp under the hair: nearly opaque hair-coloured skin with a soft
// hairline (alpha boosted, blended).
const SCALP_ALPHA_GAIN = 4

// ---------------------------------------------------------------------------
// Highlight, in world units (the patient is about 2.33 units tall, so 0.01 is
// roughly 8 mm). Edge and rim widths are fractions of the patch radius.

const FILL_SCALE = 1.2
const MIN_RADIUS = 0.012
const EDGE_SOFTNESS = 0.03
const RIM_WIDTH = 0.05
const RIM_MIX = 0.8
const HOVER_WIDTH = 0.07
const HOVER_MIX = 0.8
// Facing test: dot(skin normal, spot normal) from FACING_FROM (hidden) to
// FACING_TO (fully shown).
const FACING_FROM = -0.05
const FACING_TO = 0.35
// Self-light (keeps the coral clear in shadow; not a glow).
const FILL_GLOW = 0.3
const RIM_GLOW = 0.25
const HOVER_GLOW = 0.3
// Very gentle rim shimmer (motion allowed only) and fade-in.
const SHIMMER = 0.16
const FADE_SECONDS = 0.18

// ---------------------------------------------------------------------------

const looks = new WeakMap()

function glslColor(hex) {
  const { r, g, b } = new Color(hex) // linear working colour space

  return `vec3( ${r.toFixed(4)}, ${g.toFixed(4)}, ${b.toFixed(4)} )`
}

function glslFloat(value) {
  return value.toFixed(4)
}

const HIGHLIGHT_VERTEX_PARS = /* glsl */`
varying vec3 vPmWorld;
varying vec3 vPmNormal;
`

// After skinning: where this vertex really is (posed), in world space.
const HIGHLIGHT_VERTEX = /* glsl */`
vPmWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
vPmNormal = normalize( mat3( modelMatrix ) * objectNormal );
`

const HIGHLIGHT_FRAGMENT_PARS = /* glsl */`
uniform vec3 pmSelCenter;
uniform vec3 pmSelInvRadii;
uniform vec3 pmSelNormal;
uniform float pmSelAmount;
uniform vec3 pmHovCenter;
uniform vec3 pmHovInvRadii;
uniform vec3 pmHovNormal;
uniform float pmHovAmount;
uniform float pmTime;
uniform float pmShimmer;
uniform float pmNormalBlur;
varying vec3 vPmWorld;
varying vec3 vPmNormal;

// 1 where the skin faces the way the spot faces, 0 on the far side.
// A zero spot normal (unknown) turns the test off.
float pmFacing( vec3 surfaceNormal, vec3 spotNormal ) {
  if ( dot( spotNormal, spotNormal ) < 0.5 ) return 1.0;

  return smoothstep( ${glslFloat(FACING_FROM)}, ${glslFloat(FACING_TO)}, dot( surfaceNormal, spotNormal ) );
}
`

// m = length( ( p - centre ) / radii ): 0 at the spot, 1 at the patch edge.
const HIGHLIGHT_ALBEDO = /* glsl */`
float pmFill = 0.0;
float pmRim = 0.0;
float pmRing = 0.0;

if ( pmSelAmount > 0.0 || pmHovAmount > 0.0 ) {
  vec3 pmN = normalize( vPmNormal );

  if ( pmSelAmount > 0.0 ) {
    float m = length( ( vPmWorld - pmSelCenter ) * pmSelInvRadii );
    float aa = max( fwidth( m ), 1e-4 );
    float soft = max( ${glslFloat(EDGE_SOFTNESS)}, aa );
    float inside = 1.0 - smoothstep( 1.0 - soft, 1.0 + 0.5 * aa, m );
    float rimWidth = max( ${glslFloat(RIM_WIDTH)}, 2.0 * aa );
    float rim = smoothstep( 1.0 - soft - rimWidth, 1.0 - soft - 0.25 * rimWidth, m ) * inside;
    float facing = pmFacing( pmN, pmSelNormal ) * pmSelAmount;

    pmFill = inside * facing;
    pmRim = rim * facing;
  }

  if ( pmHovAmount > 0.0 ) {
    float m = length( ( vPmWorld - pmHovCenter ) * pmHovInvRadii );
    float aa = max( fwidth( m ), 1e-4 );
    float width = max( ${glslFloat(HOVER_WIDTH)}, 1.5 * aa );
    float ring = smoothstep( 1.0 - width - aa, 1.0 - width, m )
      * ( 1.0 - smoothstep( 1.0 - aa, 1.0 + aa, m ) );

    pmRing = ring * pmFacing( pmN, pmHovNormal ) * pmHovAmount;
  }

  diffuseColor.rgb = mix( diffuseColor.rgb, ${glslColor(SELECTION_FILL)}, pmFill );
  diffuseColor.rgb = mix( diffuseColor.rgb, ${glslColor(SELECTION_RIM)}, pmRim * ${glslFloat(RIM_MIX)} );
  diffuseColor.rgb = mix( diffuseColor.rgb, ${glslColor(HOVER_RING)}, pmRing * ${glslFloat(HOVER_MIX)} );
}
`

const HIGHLIGHT_EMISSIVE = /* glsl */`
if ( pmFill + pmRing > 0.0 ) {
  float pmShine = 1.0 + pmShimmer * ${glslFloat(SHIMMER)} * sin( pmTime * 2.2 + dot( vPmWorld, vec3( 37.0, 23.0, 29.0 ) ) );

  totalEmissiveRadiance += ${glslColor(SELECTION_FILL)} * ( pmFill * ${glslFloat(FILL_GLOW)} )
    + ${glslColor(SELECTION_RIM)} * ( pmRim * ${glslFloat(RIM_GLOW)} * pmShine )
    + ${glslColor(HOVER_RING)} * ( pmRing * ${glslFloat(HOVER_GLOW)} );
}
`

// Smooth tangent frames from a per-vertex tangent texture (read by
// gl_VertexID) instead of three's per-pixel derivative frames, which are
// constant per triangle and show facets on this low-polygon body.
const TANGENT_VERTEX_PARS = /* glsl */`
uniform highp sampler2D pmTangents;
uniform int pmTangentsWidth;
varying vec3 vPmTangent;
varying vec3 vPmBitangent;
`

const TANGENT_VERTEX = /* glsl */`
{
  vec4 pmT = texelFetch( pmTangents, ivec2( gl_VertexID % pmTangentsWidth, gl_VertexID / pmTangentsWidth ), 0 );
  vec3 pmObjectTangent = pmT.xyz;

  #ifdef USE_SKINNING
    pmObjectTangent = ( skinMatrix * vec4( pmObjectTangent, 0.0 ) ).xyz;
  #endif

  vPmTangent = normalize( ( modelViewMatrix * vec4( pmObjectTangent, 0.0 ) ).xyz );
  vPmBitangent = normalize( cross( vNormal, vPmTangent ) * pmT.w );
}
`

const TANGENT_FRAGMENT_PARS = /* glsl */`
varying vec3 vPmTangent;
varying vec3 vPmBitangent;
`

const TANGENT_FRAGMENT = /* glsl */`
#ifdef USE_NORMALMAP_TANGENTSPACE
  tbn = mat3( normalize( vPmTangent ), normalize( vPmBitangent ), normal );

  #ifdef DOUBLE_SIDED
    tbn[ 0 ] *= faceDirection;
    tbn[ 1 ] *= faceDirection;
  #endif
#endif
`

// pmNormalBlur: NORMAL_BLUR plus log2(pixel ratio), so the clay looks equally
// smooth on high-density screens (they would otherwise pick sharper mips).
// Blurred mip levels also bleed the empty texture area around each UV island
// (light lavender on the skin maps, black on the boxers) into the island
// edges, which would draw light streaks along the seams: such samples, which
// no real tangent-space normal produces, are flattened.
const BLURRED_NORMAL_MAP = /* glsl */`
#ifdef USE_NORMALMAP_TANGENTSPACE
  vec3 mapN = texture2D( normalMap, vNormalMapUv, pmNormalBlur ).xyz * 2.0 - 1.0;
  float pmGutter = max(
    smoothstep( 0.4, 0.65, min( mapN.x, mapN.y ) ),
    1.0 - smoothstep( 0.2, 0.5, mapN.z )
  );

  mapN = mix( mapN, vec3( 0.0, 0.0, 1.0 ), pmGutter );
  mapN.xy *= normalScale;
  normal = normalize( tbn * mapN );
#endif
`

// Per-vertex tangents (Lengyel's method, as BufferGeometry.computeTangents),
// stored in a small float texture so the geometry itself stays untouched.
const pA = new Vector3()
const pB = new Vector3()
const pC = new Vector3()
const sdir = new Vector3()
const tdir = new Vector3()
const n = new Vector3()
const t = new Vector3()
const du = new Vector3()
const dv = new Vector3()

function addTo(list, vertex, vector) {
  list[vertex * 3] += vector.x
  list[vertex * 3 + 1] += vector.y
  list[vertex * 3 + 2] += vector.z
}

function tangentTexture(geometry) {
  const { index } = geometry
  const { position, normal, uv } = geometry.attributes

  if (!index || !position || !normal || !uv) return null

  const count = position.count
  const tan1 = new Float32Array(count * 3) // sum of dP/du per vertex
  const tan2 = new Float32Array(count * 3) // sum of dP/dv per vertex

  for (let i = 0; i < index.count; i += 3) {
    const a = index.getX(i)
    const b = index.getX(i + 1)
    const c = index.getX(i + 2)

    pA.fromBufferAttribute(position, a)
    pB.fromBufferAttribute(position, b).sub(pA)
    pC.fromBufferAttribute(position, c).sub(pA)

    const u1 = uv.getX(b) - uv.getX(a)
    const v1 = uv.getY(b) - uv.getY(a)
    const u2 = uv.getX(c) - uv.getX(a)
    const v2 = uv.getY(c) - uv.getY(a)
    const r = 1 / (u1 * v2 - u2 * v1)

    if (!Number.isFinite(r)) continue

    sdir.copy(pB).multiplyScalar(v2).addScaledVector(pC, -v1).multiplyScalar(r)
    tdir.copy(pC).multiplyScalar(u1).addScaledVector(pB, -u2).multiplyScalar(r)

    addTo(tan1, a, sdir)
    addTo(tan1, b, sdir)
    addTo(tan1, c, sdir)
    addTo(tan2, a, tdir)
    addTo(tan2, b, tdir)
    addTo(tan2, c, tdir)
  }

  const width = Math.min(1024, count)
  const height = Math.ceil(count / width)
  const data = new Float32Array(width * height * 4)

  for (let vertex = 0; vertex < count; vertex += 1) {
    n.fromBufferAttribute(normal, vertex)
    du.fromArray(tan1, vertex * 3)
    dv.fromArray(tan2, vertex * 3)

    // Gram-Schmidt: the tangent, made perpendicular to the normal.
    t.copy(du).addScaledVector(n, -n.dot(du))

    if (t.lengthSq() < 1e-12) t.set(1, 0, 0)

    t.normalize()

    data[vertex * 4] = t.x
    data[vertex * 4 + 1] = t.y
    data[vertex * 4 + 2] = t.z
    // Handedness: does cross(normal, tangent) follow dP/dv?
    data[vertex * 4 + 3] = du.crossVectors(n, du).dot(dv) < 0 ? -1 : 1
  }

  const texture = new DataTexture(data, width, height, RGBAFormat, FloatType)

  texture.magFilter = NearestFilter
  texture.minFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true

  return { texture, width }
}

function createUniforms() {
  return {
    pmSelCenter: { value: new Vector3() },
    pmSelInvRadii: { value: new Vector3(1, 1, 1) },
    pmSelNormal: { value: new Vector3() },
    pmSelAmount: { value: 0 },
    pmHovCenter: { value: new Vector3() },
    pmHovInvRadii: { value: new Vector3(1, 1, 1) },
    pmHovNormal: { value: new Vector3() },
    pmHovAmount: { value: 0 },
    pmTime: { value: 0 },
    pmShimmer: { value: 1 },
    pmNormalBlur: { value: NORMAL_BLUR },
  }
}

/*
 * Skin, nails and boxers: blurred normal map with smooth tangents (when the
 * material has a normal map) and the selection / hover highlight. All these
 * materials share one program and one set of highlight uniforms.
 *
 * The Original skin uses the same highlight on its own materials, with its
 * normal maps at full strength (blurNormals: false) and its own program
 * (cacheKey). Called without options, this is exactly the clay's shader.
 */
function clayShader(material, uniforms, tangents, { blurNormals = true, cacheKey = 'clay' } = {}) {
  const smoothTangents = Boolean(tangents && material.normalMap)

  // The Original skin reuses the clay's smooth tangents (same geometry).
  material.userData.pmTangents = smoothTangents ? tangents : null

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)

    let vertex = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${HIGHLIGHT_VERTEX_PARS}`)
      .replace('#include <skinning_vertex>', `#include <skinning_vertex>\n${HIGHLIGHT_VERTEX}`)

    let fragment = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HIGHLIGHT_FRAGMENT_PARS}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${HIGHLIGHT_ALBEDO}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${HIGHLIGHT_EMISSIVE}`)

    if (blurNormals) fragment = fragment.replace('#include <normal_fragment_maps>', BLURRED_NORMAL_MAP)

    if (smoothTangents) {
      shader.uniforms.pmTangents = { value: tangents.texture }
      shader.uniforms.pmTangentsWidth = { value: tangents.width }

      vertex = vertex
        .replace('#include <common>', `#include <common>\n${TANGENT_VERTEX_PARS}`)
        .replace('#include <normal_vertex>', `#include <normal_vertex>\n${TANGENT_VERTEX}`)

      fragment = fragment
        .replace('#include <common>', `#include <common>\n${TANGENT_FRAGMENT_PARS}`)
        .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>\n${TANGENT_FRAGMENT}`)
    }

    shader.vertexShader = vertex
    shader.fragmentShader = fragment
  }

  material.customProgramCacheKey = () => `painmapper-${cacheKey}-highlight-1-${smoothTangents ? 't' : 'd'}`

  return material
}

// Hair and lashes: the colour texture only supplies the cut-out alpha; the
// colour is the material's clay tint with a hint of the strand pattern.
function tintFromTexture(material, { alphaGain, strandMix }) {
  const fragment = /* glsl */`
#ifdef USE_MAP
  vec4 pmTexel = texture2D( map, vMapUv );
  float pmStrand = dot( pmTexel.rgb, vec3( 0.2126, 0.7152, 0.0722 ) );

  diffuseColor.rgb *= mix( 1.0, clamp( 0.6 + 3.0 * pmStrand, 0.65, 1.35 ), ${glslFloat(strandMix)} );
  diffuseColor.a *= clamp( pmTexel.a * ${glslFloat(alphaGain)}, 0.0, 1.0 );
#endif
`

  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', fragment)
  }

  material.customProgramCacheKey = () => `painmapper-tint-${alphaGain}-${strandMix}`

  return material
}

function clay(source, { color, roughness, normalMap = false }) {
  const material = new MeshStandardMaterial({
    name: source.name,
    color,
    roughness,
    metalness: 0,
    side: source.side,
  })

  if (normalMap && source.normalMap) {
    material.normalMap = source.normalMap
    material.normalScale.copy(source.normalScale).multiplyScalar(NORMAL_STRENGTH)
  }

  return material
}

function cutout(source, { color, roughness, alphaTest = 0, alphaGain = 1, strandMix = 0, blend = false, glow = 0 }) {
  const material = new MeshStandardMaterial({
    name: source.name,
    color,
    roughness,
    metalness: 0,
    side: source.side,
    map: source.map,
  })

  if (glow) material.emissive.set(color).multiplyScalar(glow)

  if (blend) {
    // Thin shells over opaque skin (scalp, lashes): one pass is enough.
    material.transparent = true
    material.depthWrite = false
    material.forceSinglePass = true
  } else {
    // Depth-tested cut-out, anti-aliased by alpha-to-coverage (MSAA): the
    // layered hair cards no longer depend on draw order. Colour is written
    // as for an opaque surface; alpha keeps the larger of old and new, so
    // the transparent canvas never turns see-through inside the hair.
    material.alphaTest = alphaTest
    material.alphaToCoverage = true
    material.blending = CustomBlending
    material.blendEquation = AddEquation
    material.blendSrc = OneFactor
    material.blendDst = ZeroFactor
    material.blendEquationAlpha = MaxEquation
    material.blendSrcAlpha = OneFactor
    material.blendDstAlpha = OneFactor
  }

  return tintFromTexture(material, { alphaGain, strandMix })
}

function hidden(source) {
  return new MeshBasicMaterial({ name: source.name, visible: false })
}

function restyle(source, uniforms, geometry) {
  const { name } = source

  if (/^Std_Skin_(Head|Body|Arm|Leg)$/.test(name)) {
    return clayShader(
      clay(source, { color: CLAY, roughness: SKIN_ROUGHNESS, normalMap: true }),
      uniforms,
      geometry && tangentTexture(geometry),
    )
  }

  if (name === 'Std_Nails') {
    return clayShader(clay(source, { color: NAIL_CLAY, roughness: 0.5 }), uniforms, null)
  }

  if (name === 'Boxers') {
    return clayShader(
      clay(source, { color: BOXER_CLAY, roughness: BOXER_ROUGHNESS, normalMap: true }),
      uniforms,
      geometry && tangentTexture(geometry),
    )
  }

  if (name === 'Hair') {
    return cutout(source, {
      color: HAIR_CLAY,
      roughness: 0.85,
      alphaTest: HAIR_ALPHA_TEST,
      alphaGain: 1.15,
      strandMix: HAIR_STRAND_MIX,
      glow: HAIR_GLOW,
    })
  }

  if (name === 'Scalp') {
    return cutout(source, { color: HAIR_CLAY, roughness: 0.9, alphaGain: SCALP_ALPHA_GAIN, blend: true, glow: HAIR_GLOW })
  }

  if (name === 'Std_Eyelash') {
    return cutout(source, { color: LASH_CLAY, roughness: 0.9, blend: true })
  }

  if (/^Std_Eye_[LR]$/.test(name)) {
    return clay(source, { color: EYE_CLAY, roughness: 0.55 })
  }

  // Wet-look layers over the eyes: not part of a clay figure.
  if (/^Std_(Cornea|Eye_Occlusion|Tearline)_[LR]$/.test(name)) {
    return hidden(source)
  }

  if (/^Std_(Upper|Lower)_Teeth$/.test(name)) {
    return clay(source, { color: TEETH_CLAY, roughness: 0.6 })
  }

  if (name === 'Std_Tongue') {
    return clay(source, { color: TONGUE_CLAY, roughness: 0.75 })
  }

  // Anything unexpected keeps its own material.
  return null
}

function texturesOf(material) {
  const textures = new Set()

  for (const value of Object.values(material)) {
    if (value?.isTexture) textures.add(value)
  }

  return textures
}

function releaseTexture(texture, imageStillUsed) {
  texture.dispose()

  // The decoded pixels the loader kept (ImageBitmap in Chromium / Firefox),
  // unless a texture that stays in use shares them.
  const image = texture.source?.data ?? texture.image

  if (!imageStillUsed && typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) {
    image.close()
  }
}

/*
 * Texture slots the clay reads from the model file: the skin and clothing
 * normal maps, and the hair, scalp and lash cut-out maps. Every other
 * texture belongs to the Original skin only, so the start-up read
 * (modelLoader.js) leaves it out (it is decoded only if Original is chosen,
 * from the same start-up read; see viewer/originalSkin.js). The Original
 * skin then shares these very texture objects with the clay.
 */
export const SHARED_WITH_NEUTRAL = Object.freeze({
  normalMap: /^(Std_Skin_(Head|Body|Arm|Leg)|Boxers)$/,
  map: /^(Hair|Scalp|Std_Eyelash)$/,
})

/*
 * three.js's glTF loader adjusts a material when it puts it on a mesh
 * (GLTFLoader assignFinalMaterial): without tangents in the geometry it
 * flips the normal map's Y scale (derivative tangents), with vertex colours
 * it turns them on, without normals it shades flat. The Original materials
 * here are made by the loader's material step alone (no mesh is built), so
 * the same adjustments are made by hand: the accepted Original look depends
 * on them.
 */
function finalizeLikeGltfLoader(material, geometry) {
  if (!geometry || material.userData.pmFinalized) return

  material.userData.pmFinalized = true

  if (geometry.attributes.tangent === undefined) {
    if (material.normalScale) material.normalScale.y *= -1
    if (material.clearcoatNormalScale) material.clearcoatNormalScale.y *= -1
  }

  if (geometry.attributes.color !== undefined) material.vertexColors = true
  if (geometry.attributes.normal === undefined) material.flatShading = true
}

/*
 * ORIGINAL skin: the model's own materials (as authored) on the same
 * meshes. Skin, nails and clothing keep their own colour textures and
 * full-strength normal maps (not blurred) and gain the same selection and
 * hover drawing as the clay, with the same smooth tangents (no triangle
 * facets). The hair keeps its own colour texture but is drawn as an
 * anti-aliased cut-out (as the clay hair is); the scalp loses its mirror
 * shine (the Milestone 3 "light speck" fix). Everything else is unchanged.
 * `clayTextures`: every texture the clay holds (shared ones are never
 * released with the Original skin).
 */
function prepareOriginal(material, uniforms, clay, clayTextures, geometry) {
  const { name } = material

  finalizeLikeGltfLoader(material, geometry)
  material.userData.pmShared = new Set([...texturesOf(material)].filter((texture) => clayTextures.has(texture)))

  if (/^Std_Skin_(Head|Body|Arm|Leg)$/.test(name) || name === 'Std_Nails' || name === 'Boxers') {
    const tangents = clay?.userData.pmTangents ?? null

    return clayShader(material, uniforms, tangents, { blurNormals: false, cacheKey: `original-${material.type}` })
  }

  if (name === 'Hair') {
    material.alphaTest = HAIR_ALPHA_TEST
    material.alphaToCoverage = true
    material.transparent = false
    material.depthWrite = true
    material.blending = CustomBlending
    material.blendEquation = AddEquation
    material.blendSrc = OneFactor
    material.blendDst = ZeroFactor
    material.blendEquationAlpha = MaxEquation
    material.blendSrcAlpha = OneFactor
    material.blendDstAlpha = OneFactor
    return material
  }

  if (name === 'Scalp' && 'specularIntensity' in material) material.specularIntensity = 0

  return material
}

function createLook(scene) {
  const uniforms = createUniforms()
  const users = new Map()
  const replaced = new Map()
  const kept = new Set()
  const dropped = new Set()
  // Every mesh and its clay material (to switch appearances back and forth).
  const meshes = []

  scene.traverse((object) => {
    if (object.isMesh && object.material && !Array.isArray(object.material)) {
      users.set(object.material, (users.get(object.material) ?? 0) + 1)
    }
  })

  scene.traverse((object) => {
    if (!object.isMesh || !object.material || Array.isArray(object.material)) return

    const source = object.material
    let next = replaced.get(source)

    if (next === undefined) {
      // Tangents belong to one geometry: only for a material used once.
      next = restyle(source, uniforms, users.get(source) === 1 ? object.geometry : null)
      replaced.set(source, next)
    }

    meshes.push({ mesh: object, clay: next ?? source, name: source.name })

    if (!next) return

    object.material = next
    texturesOf(next).forEach((texture) => kept.add(texture))
  })

  for (const [source, next] of replaced) {
    if (!next) continue

    texturesOf(source).forEach((texture) => dropped.add(texture))
    source.dispose()
  }

  const keptSources = new Set([...kept].map((texture) => texture.source))

  for (const texture of dropped) {
    if (!kept.has(texture)) releaseTexture(texture, keptSources.has(texture.source))
  }

  return {
    uniforms,
    reduced: false,
    owner: null,
    selection: { key: null, target: 0, start: null },
    meshes,
    appearance: 'neutral',
    originals: null,
    // The graphics state (renderer.properties) the original-only textures
    // were last put on, or null.
    originalsResident: null,
    releaseTimer: null,
    compileGroup: null,
  }
}

// The textures only the original materials use (not shared with the clay).
function originalOnlyTextures(originals) {
  const list = new Set()

  for (const material of originals.values()) {
    const shared = material.userData.pmShared ?? new Set()

    texturesOf(material).forEach((texture) => {
      if (!shared.has(texture)) list.add(texture)
    })
  }

  return [...list]
}

// Releases the GPU copies of the textures only the original materials use
// (their decoded images are kept, so choosing Original again re-uploads them,
// a few per frame, without decoding again; textures shared with the clay
// stay).
function releaseOriginalTextures(originals) {
  originalOnlyTextures(originals).forEach((texture) => texture.dispose())
}

/*
 * Stand-ins for the meshes, wearing the original materials, so their shader
 * programs can be compiled in the background (renderer.compileAsync) and each
 * drawn once into a hidden pixel before anything on screen uses them: same
 * geometry, skeleton and mesh type, so the programs are exactly the ones the
 * real meshes will ask for.
 */
function buildCompileGroup(state) {
  const group = new Group()

  for (const entry of state.meshes) {
    const material = state.originals.get(entry.name)

    if (!material || material === entry.clay) continue

    const source = entry.mesh
    let proxy

    if (source.isSkinnedMesh) {
      proxy = new SkinnedMesh(source.geometry, material)
      proxy.bind(source.skeleton, source.bindMatrix)
      proxy.bindMode = source.bindMode
    } else {
      proxy = new Mesh(source.geometry, material)
    }

    proxy.matrixWorld.copy(source.matrixWorld)
    proxy.matrixAutoUpdate = false
    proxy.matrixWorldAutoUpdate = false
    // Drawn whenever asked, whatever the current view: the stand-in of a mesh
    // outside it (the head, in the knee view) is prepared in the background
    // after the switch (viewer/originalSkin.js), so the first zoom-out does
    // not stall. Which meshes are in view is decided from the real mesh.
    proxy.frustumCulled = false
    proxy.userData.pmSource = source
    proxy.receiveShadow = source.receiveShadow
    proxy.castShadow = source.castShadow
    proxy.renderOrder = source.renderOrder
    group.add(proxy)
  }

  group.matrixAutoUpdate = false
  group.matrixWorldAutoUpdate = false

  return group
}

function spotKey(sel) {
  return [sel.surfacePoint ?? sel.center, sel.radii, sel.normal]
    .map((list) => (list ? Array.from(list, (value) => Number(value).toFixed(5)).join(',') : '-'))
    .join('|')
}

function writeSpot(sel, center, invRadii, normal) {
  const point = sel.surfacePoint ?? sel.center ?? [0, 0, 0]
  const radii = sel.radii ?? [0.05, 0.05, 0.05]

  center.value.fromArray(point)
  invRadii.value.set(
    1 / Math.max(radii[0] * FILL_SCALE, MIN_RADIUS),
    1 / Math.max(radii[1] * FILL_SCALE, MIN_RADIUS),
    1 / Math.max(radii[2] * FILL_SCALE, MIN_RADIUS),
  )

  // No usable normal: zero vector, which turns the facing test off.
  normal.value.fromArray(sel.normal ?? [0, 0, 0])

  if (normal.value.lengthSq() > 1e-8) normal.value.normalize()
  else normal.value.set(0, 0, 0)
}

function strengthOf(sel) {
  const value = Number(sel?.strength ?? 1)

  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1
}

function normalBlurFor(renderer) {
  const ratio = renderer?.getPixelRatio?.() ?? 1

  return NORMAL_BLUR + Math.log2(Math.max(1, ratio))
}

export function applyBodyLook(scene, { renderer } = {}) {
  let state = looks.get(scene)

  if (!state) {
    state = createLook(scene)
    looks.set(scene, state)
  }

  const { uniforms, selection } = state

  uniforms.pmNormalBlur.value = normalBlurFor(renderer)

  const handle = {
    setSelection(sel) {
      state.owner = handle

      if (!sel) {
        selection.key = null
        selection.target = 0
        selection.start = null
        uniforms.pmSelAmount.value = 0
        return
      }

      const key = spotKey(sel)
      const target = strengthOf(sel)

      if (key === selection.key && target === selection.target) return

      writeSpot(sel, uniforms.pmSelCenter, uniforms.pmSelInvRadii, uniforms.pmSelNormal)
      selection.key = key
      selection.target = target

      if (state.reduced || target === 0) {
        uniforms.pmSelAmount.value = target
        selection.start = null
      } else {
        // A short fade-in, timed by update().
        uniforms.pmSelAmount.value = 0.001
        selection.start = -1
      }
    },

    setHover(sel) {
      state.owner = handle

      if (!sel) {
        uniforms.pmHovAmount.value = 0
        return
      }

      writeSpot(sel, uniforms.pmHovCenter, uniforms.pmHovInvRadii, uniforms.pmHovNormal)
      uniforms.pmHovAmount.value = strengthOf(sel)
    },

    /*
     * ORIGINAL skin, in steps (viewer/originalSkin.js runs them so that
     * nothing freezes the page):
     * - adoptOriginals(map name -> material): once, prepares the model's own
     *   materials (selection drawing, smooth tangents, hair cut-out);
     * - originalCompileGroup(): stand-ins to compile their programs early and
     *   to draw once each (which uploads their textures);
     * - setAppearance('original' | 'neutral'): the switch itself.
     */
    adoptOriginals(originalsByName) {
      if (state.originals) return true
      if (!originalsByName) return false

      const clayByName = new Map(state.meshes.map((entry) => [entry.name, entry.clay]))
      const geometryByName = new Map()
      const clayTextures = new Set()

      for (const entry of state.meshes) {
        texturesOf(entry.clay).forEach((texture) => clayTextures.add(texture))

        if (!geometryByName.has(entry.name)) geometryByName.set(entry.name, entry.mesh.geometry)
      }

      state.originals = new Map()

      for (const [name, material] of originalsByName) {
        state.originals.set(name, prepareOriginal(material, uniforms, clayByName.get(name), clayTextures, geometryByName.get(name)))
      }

      return true
    },

    get originalsReady() {
      return Boolean(state.originals)
    },

    originalCompileGroup() {
      if (!state.originals) return null
      if (!state.compileGroup) state.compileGroup = buildCompileGroup(state)

      return state.compileGroup
    },

    // Whether the original-only textures are on this renderer's GPU now:
    // they are released a minute after the look goes back to Gray, and lost
    // with the graphics context (when the browser restores a lost context,
    // three.js starts with new graphics state, renderer.properties).
    originalTexturesResidentOn(renderer) {
      return state.originalsResident !== null && state.originalsResident === renderer?.properties
    },

    markOriginalTexturesResident(renderer) {
      state.originalsResident = renderer?.properties ?? null
    },

    // A new preparation is starting: a pending release must not fire in the
    // middle of it.
    cancelOriginalRelease() {
      clearTimeout(state.releaseTimer)
      state.releaseTimer = null
    },

    /*
     * 'neutral' (clay) or 'original' (the model's own materials, which must
     * have been adopted). Geometry, pose, selection and hover are unchanged.
     * Returns false if Original is not prepared yet.
     */
    setAppearance(mode) {
      if (mode === 'original') {
        if (!state.originals) return false

        clearTimeout(state.releaseTimer)
        state.releaseTimer = null

        for (const entry of state.meshes) {
          const original = state.originals.get(entry.name)

          if (original) entry.mesh.material = original
        }
      } else {
        for (const entry of state.meshes) entry.mesh.material = entry.clay

        // Back to Gray (also after a cancelled or failed preparation, which
        // may have uploaded some of them): the original-only textures leave
        // the GPU after a minute in Gray (a quick return stays instant).
        if (state.originals) {
          clearTimeout(state.releaseTimer)
          state.releaseTimer = setTimeout(() => {
            state.releaseTimer = null

            if (state.appearance === 'original' || !state.originals) return

            releaseOriginalTextures(state.originals)
            state.originalsResident = null
          }, ORIGINAL_RELEASE_DELAY_MS)
        }
      }

      state.appearance = mode
      return true
    },

    get appearance() {
      return state.appearance
    },

    // Reduced motion: no fade, no shimmer; the highlight is completely static.
    setReducedMotion(reduced) {
      state.reduced = Boolean(reduced)
      uniforms.pmShimmer.value = state.reduced ? 0 : 1

      if (state.reduced) {
        uniforms.pmTime.value = 0

        if (selection.start !== null) {
          uniforms.pmSelAmount.value = selection.target
          selection.start = null
        }
      }
    },

    update(elapsedSeconds) {
      // The pixel ratio can change (window moved to another screen).
      const blur = normalBlurFor(renderer)

      if (blur !== uniforms.pmNormalBlur.value) uniforms.pmNormalBlur.value = blur

      if (state.reduced) return

      const time = Number(elapsedSeconds) || 0

      uniforms.pmTime.value = time % 1000

      if (selection.start === null) return

      if (selection.start < 0) selection.start = time

      const progress = Math.min(1, (time - selection.start) / FADE_SECONDS)
      const eased = 1 - (1 - progress) * (1 - progress)

      uniforms.pmSelAmount.value = Math.max(0.001, selection.target * eased)

      if (progress >= 1) {
        uniforms.pmSelAmount.value = selection.target
        selection.start = null
      }
    },

    // The clay materials stay on the cached model (see the note above).
    dispose() {
      if (state.owner !== handle) return

      uniforms.pmSelAmount.value = 0
      uniforms.pmHovAmount.value = 0
      selection.key = null
      selection.target = 0
      selection.start = null
      state.owner = null
    },
  }

  return handle
}
