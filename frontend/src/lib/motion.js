/**
 * Marram motion system. One place for durations, easing and reusable variants (see docs/design/motion-system.md).
 * Rules: animate transform and opacity only; keep UI feedback under 250 ms; entrances may take up to 450 ms.
 * `MotionConfig reducedMotion="user"` (main.jsx) disables transform animation for people who ask for less motion.
 */
export const duration = { instant: 0.08, fast: 0.14, base: 0.22, slow: 0.4, chart: 0.7 }
export const ease = { out: [0.22, 1, 0.36, 1], inOut: [0.65, 0, 0.35, 1] }
/** Named transitions: components use these instead of ad-hoc numbers, so timing stays consistent. */
export const transitions = {
  popover: { duration: 0.14, ease: ease.out }, // menus, tooltips, switchers
  overlay: { duration: 0.2, ease: ease.out }, // modals
  drawer: { duration: 0.26, ease: ease.out }, // side panels, mobile nav
  fill: { duration: 0.6, ease: ease.out }, // progress bars
  hero: { duration: 0.6, ease: ease.out }, // landing entrance
}

export const spring = { snappy: { type: 'spring', stiffness: 520, damping: 38 }, soft: { type: 'spring', stiffness: 260, damping: 30 } }

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: ease.out } },
}

/** Parent variant that staggers children that use `fadeUp`. */
export const stagger = (gap = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const pop = {
  initial: { opacity: 0, scale: 0.97, y: 6 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.fast } },
}

export const page = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.base, ease: ease.out } },
}

export const tap = { whileTap: { scale: 0.97 }, transition: { duration: duration.instant } }
