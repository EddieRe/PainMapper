import Papa from 'papaparse'

export const LOCATION_CSV_PATH = '/data/locations.csv'
export const PATHOLOGY_CSV_PATH = '/data/pathologies.csv'

export function normalizeText(value) {
  return String(value ?? '').trim()
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value

  const normalizedValue = normalizeText(value).toLowerCase()

  return normalizedValue === 'true'
    || normalizedValue === 'yes'
    || normalizedValue === '1'
}

function parseNumber(value, fallback = null) {
  const parsedValue = Number(value)

  return Number.isFinite(parsedValue)
    ? parsedValue
    : fallback
}

export function parseLocationsCsv(rows) {
  return rows
    .map((row) => ({
      name: normalizeText(row.Name),
      region: normalizeText(row.Region),
    }))
    .filter((location) => location.name && location.region)
}

export function parsePathologiesCsv(rows) {
  return rows
    .map((row) => ({
      name: normalizeText(row.Name),
      ageMinimum: parseNumber(row['Age Minimum']),
      ageMaximum: parseNumber(row['Age Maximum']),
      traumatic: parseBoolean(row.Traumatic),
      atraumatic: parseBoolean(row.Atraumatic),
      swelling: normalizeText(row.Swelling),

      locations: [
        normalizeText(row['Location 1']),
        normalizeText(row['Location 2']),
        normalizeText(row['Location 3']),
      ].filter(Boolean),

      notes: normalizeText(row['Unnamed: 9']),
    }))
    .filter((pathology) => pathology.name)
}

export function loadCsv(path) {
  return new Promise((resolve, reject) => {
    Papa.parse(path, {
      download: true,
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),

      complete: (results) => {
        const seriousErrors = results.errors.filter(
          (error) => error.type !== 'FieldMismatch',
        )

        if (seriousErrors.length > 0) {
          reject(
            new Error(
              seriousErrors
                .map((error) => error.message)
                .join('; '),
            ),
          )

          return
        }

        resolve(results.data)
      },

      error: reject,
    })
  })
}

export function getDifferentialDiagnoses(
  pathologies,
  selectedLocationName,
  limit = 3,
) {
  if (!selectedLocationName) return []

  const normalizedSelectedLocation = normalizeText(
    selectedLocationName,
  ).toLowerCase()

  return pathologies
    .filter((pathology) =>
      pathology.locations.some(
        (location) =>
          normalizeText(location).toLowerCase()
          === normalizedSelectedLocation,
      ),
    )
    .slice(0, limit)
}