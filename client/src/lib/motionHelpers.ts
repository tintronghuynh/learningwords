import { Variants } from 'framer-motion';

// Animation variants for page transitions
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.61, 1, 0.88, 1]
    }
  },
  exit: {
    opacity: 0,
    y: 10,
    transition: {
      duration: 0.2
    }
  }
};

// Animation variants for staggered list items
export const listVariants: Variants = {
  initial: {
    opacity: 0
  },
  enter: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const listItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.61, 1, 0.88, 1]
    }
  }
};

// Animation variants for flashcard flip
export const flipVariants: Variants = {
  front: {
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: [0.61, 1, 0.88, 1]
    }
  },
  back: {
    rotateY: 180,
    transition: {
      duration: 0.6,
      ease: [0.61, 1, 0.88, 1]
    }
  }
};
