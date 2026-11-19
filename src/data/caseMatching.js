/*
 * Compares the case details a learner entered with what the dataset
 * (public/data/pathologies.csv) records for each condition.
 *
 * Every comparison is a direct, explainable check against one dataset
 * column. Nothing here estimates likelihood, and conditions are never
 * hidden: they are only grouped and annotated.
 *
 *   Age      vs  "Age Minimum" / "Age Maximum"  (inclusive, whole years)
 *   Onset    vs  "Traumatic" / "Atraumatic"
 *   Swelling     shown beside the dataset's "Swelling" value for reference
 *                only; the column's meaning is awaiting clinical review.
 *
 * Unknown stays unknown: a detail the learner did not enter, or a value the
 * dataset does not record, is reported as such and never treated as a
 * negative finding.
 */

export const ONSET = Object.freeze({
  UNKNOWN: 'unknown',
  INJURY: 'injury',
  NO_INJURY: 'no-injury',
})

export const SWELLING_UNKNOWN = 'unknown'
export const SWELLING_LEVELS = Object.freeze(['None', 'Mild', 'Moderate', 'Severe'])

export const DATASET_AGE_RANGE = Object.freeze({ min: 0, max: 18 })

export const EMPTY_CASE = Object.freeze({
  age: null,
  onset: ONSET.UNKNOWN,
  swelling: SWELLING_UNKNOWN,
})

export const STATUS = Object.freeze({
  NOT_ENTERED: 'not-entered', // the learner left this detail unspecified
  NOT_RECORDED: 'not-recorded', // the dataset has no value to compare with
  CONSISTENT: 'consistent',
  DIFFERS: 'differs',
  REFERENCE: 'reference', // shown side by side, never compared
})

export const FIT = Object.freeze({
  NOT_ASSESSED: 'not-assessed', // no comparable details entered
  CONSISTENT: 'consistent', // at least one consistent check, none differ
  UNCHECKED: 'unchecked', // details entered, but nothing could be compared
  DIFFERS: 'differs', // at least one entered detail differs
})

export function formatAge(age) {
  if (age === null || age === undefined) return 'Not specified'
  if (age === 0) return 'Under 1 year'

  return `${age} ${age === 1 ? 'year' : 'years'}`
}

export function describeAgeRange(condition) {
  const { ageMinimum: min, ageMaximum: max } = condition

  if (min === null || max === null) {
    if (max !== null) return `Up to ${max} years (minimum not recorded)`
    if (min !== null) return `From ${min} years (maximum not recorded)`

    return 'Age range not recorded'
  }

  return `${min}–${max} years`
}

export function describeOnset(condition) {
  if (condition.traumatic && condition.atraumatic) {
    return 'Traumatic or atraumatic'
  }

  if (condition.traumatic) return 'Traumatic'
  if (condition.atraumatic) return 'Atraumatic'

  return 'Not recorded'
}

export function describeCaseOnset(onset) {
  if (onset === ONSET.INJURY) return 'After an injury'
  if (onset === ONSET.NO_INJURY) return 'No injury'

  return 'Not specified'
}

export function compareAge(condition, age) {
  const range = describeAgeRange(condition)

  if (age === null || age === undefined) {
    return { detail: 'age', status: STATUS.NOT_ENTERED, range }
  }

  const { ageMinimum: min, ageMaximum: max } = condition

  if (min === null || max === null) {
    return {
      detail: 'age',
      status: STATUS.NOT_RECORDED,
      range,
      explanation: 'The dataset does not record a complete age range for this condition.',
    }
  }

  if (age >= min && age <= max) {
    return {
      detail: 'age',
      status: STATUS.CONSISTENT,
      range,
      explanation: `${formatAge(age)} is within the listed range (${range}).`,
    }
  }

  return {
    detail: 'age',
    status: STATUS.DIFFERS,
    range,
    explanation: `${formatAge(age)} is outside the listed range (${range}).`,
  }
}

export function compareOnset(condition, onset) {
  const recorded = describeOnset(condition)

  if (onset !== ONSET.INJURY && onset !== ONSET.NO_INJURY) {
    return { detail: 'onset', status: STATUS.NOT_ENTERED, recorded }
  }

  if (!condition.traumatic && !condition.atraumatic) {
    return {
      detail: 'onset',
      status: STATUS.NOT_RECORDED,
      recorded,
      explanation: 'The dataset does not record whether this condition is traumatic or atraumatic.',
    }
  }

  const listedForCase = onset === ONSET.INJURY
    ? condition.traumatic
    : condition.atraumatic

  const caseText = onset === ONSET.INJURY
    ? 'Onset after an injury'
    : 'Onset without an injury'

  if (listedForCase) {
    return {
      detail: 'onset',
      status: STATUS.CONSISTENT,
      recorded,
      explanation: `${caseText} matches the dataset (${recorded.toLowerCase()}).`,
    }
  }

  return {
    detail: 'onset',
    status: STATUS.DIFFERS,
    recorded,
    explanation: `${caseText} differs from the dataset, which lists this condition as ${recorded.toLowerCase()}.`,
  }
}

export function swellingReference(condition, swelling) {
  return {
    detail: 'swelling',
    status: STATUS.REFERENCE,
    recorded: condition.swelling || 'Not recorded',
    entered: swelling === SWELLING_UNKNOWN ? 'Not specified' : swelling,
  }
}

export function hasComparableDetails(caseDetails) {
  return caseDetails.age !== null || caseDetails.onset !== ONSET.UNKNOWN
}

export function assessCondition(condition, caseDetails) {
  const checks = [
    compareAge(condition, caseDetails.age),
    compareOnset(condition, caseDetails.onset),
  ]

  const differs = checks.some((check) => check.status === STATUS.DIFFERS)
  const consistent = checks.some((check) => check.status === STATUS.CONSISTENT)

  let fit = FIT.NOT_ASSESSED

  if (hasComparableDetails(caseDetails)) {
    if (differs) fit = FIT.DIFFERS
    else if (consistent) fit = FIT.CONSISTENT
    else fit = FIT.UNCHECKED
  }

  return {
    condition,
    checks,
    swelling: swellingReference(condition, caseDetails.swelling),
    fit,
  }
}

function byName(a, b) {
  return a.condition.name.localeCompare(b.condition.name, undefined, {
    sensitivity: 'base',
  }) || a.condition.id - b.condition.id
}

/*
 * Groups the conditions for one location. Each group is alphabetical:
 * the dataset has no ranking, so none is implied.
 */
export function organizeConditions(conditions, caseDetails) {
  const assessed = conditions
    .map((condition) => assessCondition(condition, caseDetails))
    .sort(byName)

  return {
    all: assessed,
    detailsEntered: hasComparableDetails(caseDetails),
    consistent: assessed.filter((item) => item.fit === FIT.CONSISTENT),
    unchecked: assessed.filter((item) => item.fit === FIT.UNCHECKED),
    differs: assessed.filter((item) => item.fit === FIT.DIFFERS),
  }
}
