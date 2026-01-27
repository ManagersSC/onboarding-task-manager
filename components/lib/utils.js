import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ============================================
// ANIMATION VARIANTS & UTILITIES
// ============================================

// Custom easing curves
export const easings = {
  outExpo: [0.16, 1, 0.3, 1],
  inOutExpo: [0.87, 0, 0.13, 1],
  outQuart: [0.25, 1, 0.5, 1],
  inOutQuart: [0.76, 0, 0.24, 1],
}

// Transition presets
export const transitions = {
  fast: { duration: 0.15, ease: easings.outExpo },
  base: { duration: 0.2, ease: easings.outExpo },
  slow: { duration: 0.3, ease: easings.outExpo },
  slower: { duration: 0.5, ease: easings.outExpo },
  spring: { type: "spring", damping: 20, stiffness: 300 },
  springBouncy: { type: "spring", damping: 15, stiffness: 400 },
  springSmooth: { type: "spring", damping: 25, stiffness: 200 },
}

// Animation variants for staggered children
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
}

// Enhanced stagger with configurable delay
export const createStaggerContainer = (staggerDelay = 0.05, delayChildren = 0) => ({
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: staggerDelay,
      delayChildren: delayChildren,
    },
  },
})

// Animation variants for individual items
export const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 15,
      stiffness: 300,
    },
  },
}

// Smaller fade up for subtle animations
export const fadeInUpSmall = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: transitions.slow,
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: transitions.fast,
  },
}

// Scale in from center
export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: transitions.base,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
}

// Slide in from right
export const slideInRight = {
  hidden: { x: "100%" },
  show: {
    x: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    x: "100%",
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
}

// Slide in from left
export const slideInLeft = {
  hidden: { x: "-100%", opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: transitions.spring,
  },
  exit: {
    x: "-100%",
    opacity: 0,
    transition: transitions.spring,
  },
}

// Slide up
export const slideUp = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: transitions.slow,
  },
  exit: {
    y: -8,
    opacity: 0,
    transition: transitions.fast,
  },
}

// Slide down
export const slideDown = {
  hidden: { y: -16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: transitions.slow,
  },
  exit: {
    y: 8,
    opacity: 0,
    transition: transitions.fast,
  },
}

// Fade in
export const fadeIn = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

// ============================================
// PAGE TRANSITION VARIANTS
// ============================================

export const pageTransition = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: easings.outExpo,
      when: "beforeChildren",
      staggerChildren: 0.1,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
}

// ============================================
// CARD ANIMATION PRESETS
// ============================================

export const cardHover = {
  rest: {
    y: 0,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    transition: transitions.base,
  },
  hover: {
    y: -2,
    boxShadow: "0 8px 24px -8px rgb(0 0 0 / 0.1)",
    transition: transitions.base,
  },
  tap: {
    y: 0,
    transition: transitions.fast,
  },
}

export const cardInteractive = {
  rest: {
    scale: 1,
    borderColor: "hsl(var(--border))",
    transition: transitions.base,
  },
  hover: {
    scale: 1.01,
    borderColor: "hsl(var(--primary) / 0.3)",
    transition: transitions.base,
  },
  tap: {
    scale: 0.99,
    transition: transitions.fast,
  },
}

// ============================================
// LIST ITEM ANIMATIONS
// ============================================

export const listItem = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: transitions.slow,
  },
  exit: {
    opacity: 0,
    x: 8,
    transition: transitions.fast,
  },
}

export const listItemWithIndex = (index, baseDelay = 0) => ({
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      ...transitions.slow,
      delay: baseDelay + index * 0.05,
    },
  },
})

// ============================================
// NOTIFICATION & TOAST ANIMATIONS
// ============================================

export const notificationSlide = {
  hidden: { opacity: 0, x: 100, scale: 0.95 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: transitions.springBouncy,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.95,
    transition: transitions.base,
  },
}

// ============================================
// BUTTON ANIMATIONS
// ============================================

export const buttonTap = {
  tap: { scale: 0.98 },
  hover: { scale: 1.02 },
}

export const buttonLift = {
  rest: { y: 0 },
  hover: { y: -1 },
  tap: { y: 0 },
}

// ============================================
// METRIC/NUMBER ANIMATIONS
// ============================================

export const countUp = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: easings.outExpo,
    },
  },
}

// ============================================
// SKELETON/LOADING ANIMATIONS
// ============================================

export const shimmer = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 2,
      ease: "linear",
      repeat: Infinity,
    },
  },
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Creates a staggered animation delay for child items
 * @param {number} index - The index of the item
 * @param {number} baseDelay - Initial delay before animations start
 * @param {number} staggerDelay - Delay between each item
 */
export const getStaggerDelay = (index, baseDelay = 0, staggerDelay = 0.05) => {
  return baseDelay + index * staggerDelay
}

/**
 * Creates animation variants with custom delay
 * @param {object} variants - Base animation variants
 * @param {number} delay - Delay in seconds
 */
export const withDelay = (variants, delay) => ({
  ...variants,
  show: {
    ...variants.show,
    transition: {
      ...variants.show?.transition,
      delay,
    },
  },
})

/**
 * Combines multiple variant objects
 * @param {...object} variants - Multiple variant objects to combine
 */
export const combineVariants = (...variants) => {
  return variants.reduce((acc, variant) => {
    Object.keys(variant).forEach((key) => {
      acc[key] = { ...acc[key], ...variant[key] }
    })
    return acc
  }, {})
}
