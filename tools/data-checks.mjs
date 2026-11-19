/*
 * PainMapper data and case-matching checks (developer tool; not part of the app).
 *
 * 1. Location matching is unchanged: for every location, the condition
 *    records the app links to it are exactly those in the "before" table of
 *    docs/baseline-report.md, and Eddie's original first-three lookup still
 *    returns the same three.
 * 2. Case-detail comparisons (src/data/caseMatching.js) behave as documented
 *    on real dataset rows, including unknown and unrecorded values.
 *
 * Run from the project folder:   node tools/data-checks.mjs
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

const server = await createServer({
  root: projectDir,
  configFile: path.join(projectDir, 'vite.config.js'),
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true, include: [] },
  appType: 'custom',
  logLevel: 'error',
})

try {
  const csv = await server.ssrLoadModule('/src/data/csvLoader.js')
  const cm = await server.ssrLoadModule('/src/data/caseMatching.js')

  const parse = (file) => Papa.parse(
    readFileSync(path.join(projectDir, 'public', 'data', file), 'utf8'),
    { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() },
  ).data

  const locations = csv.parseLocationsCsv(parse('locations.csv'))
  const records = csv.parsePathologiesCsv(parse('pathologies.csv'))
    .map((record, index) => ({ ...record, id: index }))

  // ---------------------------------------------------------------- 1
  const baselineRows = readFileSync(path.join(projectDir, 'docs', 'baseline-report.md'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => /^\| (?!Region \||---)/.test(line) && line.split('|').length === 7)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))

  check('baseline table has a row for every location', baselineRows.length === locations.length,
    `${baselineRows.length} rows vs ${locations.length} locations`)

  const names = (cell) => (cell === '—' ? [] : cell.split('; ').map((n) => n.replace(/\\\|/g, '|')))

  for (const [, location, count, shown, notShown] of baselineRows) {
    const all = csv.getDifferentialDiagnoses(records, location, Infinity).map((r) => r.name)
    const firstThree = csv.getDifferentialDiagnoses(records, location, 3).map((r) => r.name)
    const expected = [...names(shown), ...names(notShown)]

    check(`${location}: record count unchanged`, all.length === Number(count), `${all.length} vs ${count}`)
    check(`${location}: same linked records`, JSON.stringify(all) === JSON.stringify(expected))
    check(`${location}: original first-three lookup unchanged`, JSON.stringify(firstThree) === JSON.stringify(names(shown)))
  }

  // ---------------------------------------------------------------- 2
  const find = (name, location) => records.find(
    (r) => r.name === name && (!location || r.locations.includes(location)),
  )

  const osgood = find('Osgood-Schlatter Apophysitis') // 8–15, atraumatic
  const hoffa = find("Hoffa's Fat Pad Impingement") // traumatic and atraumatic
  const retro = find('Retrocalcaneal Bursitis', 'Calcaneal Region') // neither flag
  const slippingRib = find('Slipping Rib Syndrome', 'Right Axillary') // blank minimum age

  check('blank age cell stays unrecorded (not 0)', slippingRib.ageMinimum === null, String(slippingRib.ageMinimum))
  check('blank age → age comparison "not recorded"',
    cm.compareAge(slippingRib, 10).status === cm.STATUS.NOT_RECORDED)

  check('age inside range is consistent', cm.compareAge(osgood, 13).status === cm.STATUS.CONSISTENT)
  check('age equal to minimum is consistent (inclusive)', cm.compareAge(osgood, 8).status === cm.STATUS.CONSISTENT)
  check('age equal to maximum is consistent (inclusive)', cm.compareAge(osgood, 15).status === cm.STATUS.CONSISTENT)
  check('age above range differs', cm.compareAge(osgood, 16).status === cm.STATUS.DIFFERS)
  check('age not entered is not compared', cm.compareAge(osgood, null).status === cm.STATUS.NOT_ENTERED)

  check('injury vs atraumatic-only differs', cm.compareOnset(osgood, cm.ONSET.INJURY).status === cm.STATUS.DIFFERS)
  check('no injury vs atraumatic-only is consistent', cm.compareOnset(osgood, cm.ONSET.NO_INJURY).status === cm.STATUS.CONSISTENT)
  check('both flags: injury consistent', cm.compareOnset(hoffa, cm.ONSET.INJURY).status === cm.STATUS.CONSISTENT)
  check('both flags: no injury consistent', cm.compareOnset(hoffa, cm.ONSET.NO_INJURY).status === cm.STATUS.CONSISTENT)
  check('neither flag: onset "not recorded"', cm.compareOnset(retro, cm.ONSET.INJURY).status === cm.STATUS.NOT_RECORDED)
  check('only an unrecordable detail → "unchecked", not "differs"',
    cm.assessCondition(retro, { ...cm.EMPTY_CASE, onset: cm.ONSET.INJURY }).fit === cm.FIT.UNCHECKED)

  check('no details entered → every record "not assessed"',
    records.every((r) => cm.assessCondition(r, cm.EMPTY_CASE).fit === cm.FIT.NOT_ASSESSED))

  const swellingNeverMatters = records.every((r) => {
    const base = { age: 12, onset: cm.ONSET.INJURY }
    const fits = ['unknown', ...cm.SWELLING_LEVELS].map(
      (swelling) => cm.assessCondition(r, { ...base, swelling }).fit,
    )

    return fits.every((fit) => fit === fits[0])
  })

  check('swelling never changes how a condition is grouped', swellingNeverMatters)
  check('swelling alone does not count as entered details',
    !cm.hasComparableDetails({ ...cm.EMPTY_CASE, swelling: 'Severe' }))

  for (const location of locations) {
    const linked = csv.getDifferentialDiagnoses(records, location.name, Infinity)
    const organized = cm.organizeConditions(linked, { age: 4, onset: cm.ONSET.NO_INJURY, swelling: 'Mild' })
    const grouped = organized.consistent.length + organized.unchecked.length + organized.differs.length
    const sorted = organized.all.map((item) => item.condition.name)

    check(`${location.name}: groups contain every linked record once`, grouped === linked.length)
    check(`${location.name}: alphabetical`, sorted.every((name, i) => i === 0
      || sorted[i - 1].localeCompare(name, undefined, { sensitivity: 'base' }) <= 0))
  }

  const groin = cm.organizeConditions(csv.getDifferentialDiagnoses(records, 'Groin', Infinity), {
    age: 4, onset: cm.ONSET.NO_INJURY, swelling: 'unknown',
  })

  console.log(`Example — Groin, age 4, no injury: ${groin.consistent.length} consistent `
    + `(${groin.consistent.map((i) => i.condition.name).join(', ')}); `
    + `${groin.differs.length} differ; ${groin.unchecked.length} unchecked`)
} finally {
  await server.close()
}

console.log(`${passes} checks passed, ${failures} failed.`)
process.exitCode = failures === 0 ? 0 : 1
