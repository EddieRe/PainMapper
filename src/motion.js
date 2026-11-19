/*
 * True when the learner has asked their system to reduce motion.
 * Read at the moment it is needed (not cached), so a change in system
 * settings applies to the next camera move.
 */
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
