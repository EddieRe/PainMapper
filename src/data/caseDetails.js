import { EMPTY_CASE, ONSET } from './caseMatching'

/*
 * Interface wording for the case details. The comparison rules themselves
 * live, unchanged, in caseMatching.js.
 */

export const ONSET_LABELS = Object.freeze({
  [ONSET.UNKNOWN]: 'Not specified',
  [ONSET.INJURY]: 'After injury',
  [ONSET.NO_INJURY]: 'No injury',
})

// True when any detail (including the reference-only swelling) is entered.
export function hasCaseDetails(caseDetails) {
  return caseDetails.age !== EMPTY_CASE.age
    || caseDetails.onset !== EMPTY_CASE.onset
    || caseDetails.swelling !== EMPTY_CASE.swelling
}
