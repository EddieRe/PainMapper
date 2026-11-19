/*
 * PainMapper location-search checks (developer tool; not part of the app).
 *
 * 1. Every location in public/data/locations.csv has exactly one entry in
 *    src/data/locationNames.js, and every region word points at real
 *    locations.
 * 2. Every location can be found by its exact name, and comes first.
 * 3. Familiar names, regions, sides, typos and punctuation behave as
 *    designed (examples below).
 * 4. The ordinary-language lines under location names read correctly.
 *
 * Run from the project folder:   node tools/search-checks.mjs
 * Exits with code 1 if any check fails.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(path.join(projectDir, 'package.json'))
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href)
const Papa = require('papaparse')

let failures = 0
let passes = 0

function check(description, condition, detail = '') {
  if (condition) {
    passes += 1
  } else {
    failures += 1
    console.log(`FAIL  ${description}${detail ? ` — ${detail}` : ''}`)
  }
}

// No config file: these modules need no plugins, and this keeps the dev
// server's dependency cache untouched.
const server = await createServer({
  root: projectDir,
  configFile: false,
  base: '/PainMapper/',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const csv = await server.ssrLoadModule('/src/data/csvLoader.js')
  const zonesModule = await server.ssrLoadModule('/src/data/zones.js')
  const names = await server.ssrLoadModule('/src/data/locationNames.js')
  const search = await server.ssrLoadModule('/src/data/locationSearch.js')
  const text = await server.ssrLoadModule('/src/data/locationText.js')

  const parse = (file) => Papa.parse(
    readFileSync(path.join(projectDir, 'public', 'data', file), 'utf8'),
    { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
  ).data

  const locations = csv.parseLocationsCsv(parse('locations.csv'))
  const zones = zonesModule.buildZones(locations)
  const entries = zonesModule.buildLocationEntries(locations, zones, () => 1)
  const index = search.buildSearchIndex(entries)
  const run = (query) => search.searchLocations(index, query)
  const first = (query) => run(query).sections[0]?.items[0]?.name ?? null
  const all = (query) => run(query).sections.flatMap((section) => section.items.map((item) => item.name))

  // ---------------------------------------------------------------- 1
  const csvNames = locations.map((location) => location.name)
  const tableNames = Object.keys(names.LOCATION_NAMES)

  check('every location has a familiar-name entry', csvNames.every((name) => names.LOCATION_NAMES[name]),
    csvNames.filter((name) => !names.LOCATION_NAMES[name]).join(', '))
  check('no familiar-name entry for a location that does not exist', tableNames.every((name) => csvNames.includes(name)),
    tableNames.filter((name) => !csvNames.includes(name)).join(', '))

  for (const name of csvNames) {
    const entry = names.LOCATION_NAMES[name]
    const location = locations.find((item) => item.name === name)

    check(`${name}: region matches locations.csv`, entry?.region === location.region, `${entry?.region} vs ${location.region}`)
    check(`${name}: face is valid`, ['front', 'back', 'both', 'n/a'].includes(entry?.face), entry?.face)
  }

  for (const region of names.REGION_TERMS) {
    const unknown = region.locations.filter((name) => !csvNames.includes(name))

    check(`region word "${region.term}" lists only real locations`, unknown.length === 0, unknown.join(', '))
  }

  // ---------------------------------------------------------------- 2
  check('every location has a clickable zone', entries.length === locations.length, `${entries.length} of ${locations.length}`)

  for (const name of csvNames) {
    check(`exact name "${name}" comes first`, first(name) === name, String(first(name)))
    check(`lower-case "${name.toLowerCase()}" comes first`, first(name.toLowerCase()) === name, String(first(name.toLowerCase())))
  }

  // ---------------------------------------------------------------- 3
  const firstExamples = [
    ['kneecap', 'Patella'],
    ['knee cap', 'Patella'],
    ['patela', 'Patella'],
    ['heel', 'Calcaneal Region'],
    ['back of knee', 'Popliteal Fossa'],
    ['funny bone', 'Medial Epicondyle'],
    ['shoulder blade', 'Scapular Region'],
    ['ring finger', 'Ring (Anterior/Posterior)'],
    ['pinkie', 'Pinky (Anterior/Posterior)'],
    ['index finger', 'Pointer (Anterior/Posterior)'],
    ['hoffas', "Hoffa's Fat Pad"],
    ['achilles', 'Distal Achilles'],
    ['buttock', 'Gluteal Region'],
    ['breastbone', 'Sternal Area'],
    ['elbow crease', 'Antecubital Region'],
    ['ball of foot', 'Plantar Forefoot'],
    ['palm', 'Palmar Region'],
    ['upper belly', 'Epigastric Region'],
    ['popliteal', 'Popliteal Fossa'],
    ['med mall', 'Medial Malleolus'],
    ['left kneecap', 'Patella'],
  ]

  for (const [query, expected] of firstExamples) {
    check(`"${query}" finds ${expected} first`, first(query) === expected, String(first(query)))
  }

  const sideExamples = [
    ['left knee', 'left'],
    ['right heel', 'right'],
    ['lt wrist', 'left'],
    ['kneecap', null],
  ]

  for (const [query, side] of sideExamples) {
    check(`"${query}" reads the side as ${side}`, run(query).side === side, String(run(query).side))
  }

  const knee = run('knee')
  const kneeNames = locations.filter((location) => location.region === 'Knee').map((location) => location.name)
  const kneeListed = knee.sections.flatMap((section) => section.items.map((item) => item.name))

  check('"knee" offers every knee location', kneeNames.every((name) => kneeListed.includes(name)),
    kneeNames.filter((name) => !kneeListed.includes(name)).join(', '))
  check('"knees" (plural) offers the knee locations too', kneeNames.every((name) => all('knees').includes(name)))
  check('"belly" offers abdominal locations', ['Epigastric Region', 'Suprapubic Region'].every((name) => all('belly').includes(name)), all('belly').join(', '))
  check('"head" explains that there are no head locations', /no head locations/.test(run('head').note ?? ''), String(run('head').note))
  check('no location is listed twice', [
    'knee', 'hand', 'back', 'foot', 'finger', 'shoulder', 'hip', 'wrist', 'ankle', 'elbow', 'neck', 'toe', 'chest', 'arm', 'leg',
  ].every((query) => {
    const listed = all(query)
    return listed.length === new Set(listed).size
  }))
  check('nonsense finds nothing', all('zzqx').length === 0)
  check('only filler words find nothing', all('the pain').length === 0)

  // ---------------------------------------------------------------- 4
  const zone = (name, side) => zones.find((item) => item.locationName === name && item.side === side)
  const subtitles = [
    [zone('Patella', 'right'), 'Right kneecap · Front'],
    [zone('Patella', 'left'), 'Left kneecap · Front'],
    [zone('Popliteal Fossa', 'right'), 'Back of the knee · Right'],
    [zone('Calcaneal Region', 'left'), 'Left heel · Back'],
    [zone('Left Flank', 'left'), 'Left side'],
    [zone('Groin', 'right'), 'Right groin · Front'],
  ]

  for (const [item, expected] of subtitles) {
    const actual = item ? text.zoneSubtitle(item) : '(no zone)'

    check(`subtitle reads "${expected}"`, actual === expected, actual)
  }

  for (const item of zones) {
    const subtitle = text.zoneSubtitle(item)

    check(`${item.id}: subtitle has no doubled side word`, !/\b(Left|Right) (left|right)\b/i.test(subtitle), subtitle)
    check(`${item.id}: subtitle is not empty`, subtitle.length > 2, subtitle)
  }
} finally {
  await server.close()
}

console.log(`\nSearch checks: ${passes} passed, ${failures} failed`)
process.exitCode = failures > 0 ? 1 : 0
