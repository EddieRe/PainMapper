import {
  LOCATION_NAMES,
  REGION_TERMS,
} from './locationNames'

/*
 * Finding a body location by name.
 *
 * Matches, best first:
 *   1. the exact anatomical name ("Patella")
 *   2. a familiar name or alias ("kneecap", "heel")
 *   3. names or aliases whose words start with what was typed ("med mall")
 *   4. text anywhere in a name or alias, and one-letter typos in longer words
 * A body-region word ("knee", "belly", "back") also lists every precise
 * location in that region, so broad searches lead to precise choices.
 * "left" / "right" in the search choose the patient's side ("left knee").
 *
 * Every location stays reachable: an empty search lists them all (see
 * LocationSearch), and every exact name always matches itself.
 *
 * Pure functions: checked in Node by tools/search-checks.mjs.
 */

const SIDE_WORDS = new Map([
  ['left', 'left'],
  ['lt', 'left'],
  ['right', 'right'],
  ['rt', 'right'],
])

// Words that carry no meaning in a location search.
const FILLER = new Set(['the', 'of', 'my', 'a', 'an', 'on', 'in', 'at', 'pain', 'sore', 'hurts', 'side'])

export function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Plural-insensitive word form ("knees" -> "knee", "toes" -> "toe").
export function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (word.length > 3 && word.endsWith('es') && /(ch|sh|x|ss)es$/.test(word)) return word.slice(0, -2)
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us') && !word.endsWith('is')) {
    return word.slice(0, -1)
  }

  return word
}

function tokensOf(text) {
  return normalize(text).split(' ').filter(Boolean).map(stem)
}

// At most one edit (insert, delete, substitute or swap two letters).
function withinOneEdit(a, b) {
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 1) return false

  if (a.length === b.length) {
    const diffs = []

    for (let index = 0; index < a.length; index += 1) {
      if (a[index] !== b[index]) diffs.push(index)
      if (diffs.length > 2) return false
    }

    if (diffs.length === 1) return true

    return diffs.length === 2
      && diffs[1] === diffs[0] + 1
      && a[diffs[0]] === b[diffs[1]]
      && a[diffs[1]] === b[diffs[0]]
  }

  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  let skipped = false

  for (let i = 0, j = 0; i < short.length; i += 1, j += 1) {
    if (short[i] !== long[j]) {
      if (skipped) return false
      skipped = true
      i -= 1
    }
  }

  return true
}

function capitalizeFirst(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

const FACE_TEXT = { front: 'front', back: 'back' }

/*
 * Ordinary-language description of a location for lists and headers:
 *   { commonName: 'kneecap' | null, description: 'Kneecap · Knee, front',
 *     face: 'front' | 'back' | 'both' | 'n/a', region }
 */
export function describeLocation(name, region = null) {
  const entry = LOCATION_NAMES[name]
  const regionName = entry?.region ?? region ?? ''
  const face = entry?.face ?? 'n/a'
  const commonName = entry?.common ?? null
  const where = FACE_TEXT[face]
    ? `${regionName}, ${FACE_TEXT[face]}`
    : regionName

  let description = entry?.description

  if (!description) {
    description = commonName
      ? `${capitalizeFirst(commonName)} · ${where}`
      : where
  }

  return {
    commonName,
    description,
    face,
    region: regionName,
    area: entry?.area ?? null,
  }
}

/*
 * entries: from buildLocationEntries (name, region, zones, conditionCount),
 * in head-to-toe order.
 */
export function buildSearchIndex(entries) {
  const locations = entries.map((entry, order) => {
    const names = LOCATION_NAMES[entry.name]
    const aliases = [
      ...(names?.common ? [names.common] : []),
      ...(names?.aliases ?? []),
    ]
      .filter((alias, index, list) => list.indexOf(alias) === index)
      .map((text) => ({ text, norm: normalize(text), tokens: tokensOf(text) }))

    return {
      name: entry.name,
      region: entry.region,
      order,
      norm: normalize(entry.name),
      tokens: tokensOf(entry.name),
      aliases,
      regionTokens: tokensOf(entry.region),
    }
  })

  const byName = new Map(locations.map((location) => [location.name, location]))

  const regions = REGION_TERMS.map((region) => ({
    title: region.title ?? capitalizeFirst(region.term),
    terms: [region.term, ...(region.synonyms ?? [])]
      .flatMap((term) => [normalize(term), tokensOf(term).join(' ')]),
    names: region.locations.filter((name) => byName.has(name)),
    judgment: Boolean(region.judgment),
    note: region.note ?? null,
  }))

  return { locations, byName, regions }
}

function tokenPrefixMatch(queryTokens, targetTokens) {
  return queryTokens.every((token) =>
    targetTokens.some((target) => target.startsWith(token)))
}

// 2: every word is a whole-word typo match; 1: some only match a word's
// beginning with a typo; 0: no match.
function tokenFuzzyMatch(queryTokens, targetTokens) {
  let quality = 2

  for (const token of queryTokens) {
    let best = 0

    for (const target of targetTokens) {
      if (target === token || (token.length >= 5 && withinOneEdit(token, target))) {
        best = 2
        break
      }

      if (
        target.startsWith(token)
        || (token.length >= 5 && withinOneEdit(token, target.slice(0, token.length + 1)))
      ) {
        best = Math.max(best, 1)
      }
    }

    if (best === 0) return 0

    quality = Math.min(quality, best)
  }

  return quality
}

function scoreLocation(location, query, queryTokens) {
  let best = { score: 0, matchText: null }

  const consider = (score, matchText = null) => {
    if (score > best.score) best = { score, matchText }
  }

  if (location.norm === query) consider(100)
  else if (location.norm.startsWith(query)) consider(82)
  else if (tokenPrefixMatch(queryTokens, location.tokens)) consider(66)

  for (const alias of location.aliases) {
    if (alias.norm === query) consider(94, alias.text)
    else if (alias.norm.startsWith(query)) consider(76, alias.text)
    else if (tokenPrefixMatch(queryTokens, alias.tokens)) consider(60, alias.text)
  }

  if (best.score > 0) return best

  // Words spread over the name, an alias and the region ("lateral knee").
  const allTokens = [
    ...location.tokens,
    ...location.regionTokens,
    ...location.aliases.flatMap((alias) => alias.tokens),
  ]

  if (tokenPrefixMatch(queryTokens, allTokens)) return { score: 44, matchText: null }

  if (location.norm.includes(query)) return { score: 34, matchText: null }

  const aliasHit = location.aliases.find((alias) => alias.norm.includes(query))

  if (aliasHit) return { score: 30, matchText: aliasHit.text }

  if (query.length >= 5) {
    const nameQuality = tokenFuzzyMatch(queryTokens, location.tokens)

    if (nameQuality > 0) return { score: nameQuality === 2 ? 22 : 18, matchText: null }

    if (tokenFuzzyMatch(queryTokens, allTokens) > 0) return { score: 16, matchText: null }
  }

  return best
}

/*
 * Returns { side: 'left' | 'right' | null,
 *           sections: [{ id, title, items: [{ name, score, matchText }] }],
 *           query }   sections in display order, no location listed twice.
 */
export function searchLocations(index, rawQuery, { limit = 60 } = {}) {
  const words = normalize(rawQuery).split(' ').filter(Boolean)
  let side = null
  const kept = []

  for (const word of words) {
    if (SIDE_WORDS.has(word)) side = SIDE_WORDS.get(word)
    else if (!FILLER.has(word)) kept.push(word)
  }

  // Names that start with a side ("Right Flank", "Left Axillary") must still
  // match themselves exactly, so the search as typed is scored too.
  const fullWords = words.filter((word) => !FILLER.has(word))
  const fullQuery = fullWords.join(' ')
  const fullTokens = fullWords.map(stem)

  // Only a side typed ("left"): match the names that start with it.
  const query = kept.length > 0 ? kept.join(' ') : fullQuery
  const queryTokens = kept.length > 0 ? kept.map(stem) : fullTokens
  const stemmedQuery = queryTokens.join(' ')

  if (!query) return { side, sections: [], query, note: null }

  const scored = index.locations
    .map((location) => {
      const stripped = scoreLocation(location, query, queryTokens)
      const asTyped = side && fullQuery !== query
        ? scoreLocation(location, fullQuery, fullTokens)
        : stripped

      return { location, ...(asTyped.score > stripped.score ? asTyped : stripped) }
    })
    .filter((item) => item.score > 0)
    // Equal matches: the name with fewer other words first ("Patella"
    // before "Distal Pole of Patella"), then head-to-toe order.
    .sort((a, b) => b.score - a.score
      || a.location.tokens.length - b.location.tokens.length
      || a.location.order - b.location.order)

  // A body-region word lists that region's precise locations.
  const region = index.regions.find((candidate) =>
    candidate.terms.some((term) => term === query || term === stemmedQuery))

  const listed = new Set()
  const sections = []
  const strong = scored.filter((item) => item.score >= 60)

  if (strong.length > 0) {
    sections.push({
      id: 'best',
      title: 'Best matches',
      items: strong.slice(0, 8).map((item) => {
        listed.add(item.location.name)
        return { name: item.location.name, score: item.score, matchText: item.matchText }
      }),
    })
  }

  if (region) {
    const items = region.names
      .filter((name) => !listed.has(name))
      .map((name) => {
        listed.add(name)
        return { name, score: 50, matchText: null }
      })

    if (items.length > 0) {
      // A data region ("knee") is a fact; other groupings ("spine", "ribs")
      // are suggestions, so they are not presented as anatomy.
      const title = region.judgment
        ? `Locations related to “${query}”`
        : `${region.title} locations`

      sections.push({ id: 'region', title, items })
    }
  }

  const rest = scored
    .filter((item) => !listed.has(item.location.name))
    .slice(0, Math.max(0, limit - listed.size))
    .map((item) => {
      listed.add(item.location.name)
      return { name: item.location.name, score: item.score, matchText: item.matchText }
    })

  if (rest.length > 0) {
    sections.push({
      id: 'more',
      title: sections.length > 0 ? 'Other matches' : 'Matches',
      items: rest,
    })
  }

  // A body part the dataset has no locations for (the head, the tailbone),
  // or a word whose results need a word of explanation (the belly button).
  let note = null

  if (region?.note) note = region.note
  else if (region && region.names.length === 0) note = `The dataset has no ${region.title.toLowerCase()} locations.`

  return { side, sections, query, note }
}
