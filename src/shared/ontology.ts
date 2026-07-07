/**
 * Ontology constants shared across processes.
 * The canonical specification lives in docs/ONTOLOGY.md.
 */

/** Current ontology profile version stamped onto every note (see VISION.md §4.1). */
export const ONTOLOGY_VERSION = '0.2.0'

/** Review status of a knowledge/content object (docs/ONTOLOGY.md §9.3). */
export type ReviewStatus =
  | 'unreviewed'
  | 'accepted'
  | 'edited'
  | 'rejected'
  | 'merged'
  | 'superseded'

/** Sensitivity ladder for content and person facts (docs/ONTOLOGY.md §9.4). */
export type Sensitivity = 'public' | 'business' | 'personal' | 'sensitive' | 'restricted'

/** Defaults for a user-authored note: accepted + business (VISION.md §4.1). */
export const DEFAULT_NOTE_REVIEW_STATUS: ReviewStatus = 'accepted'
export const DEFAULT_NOTE_SENSITIVITY: Sensitivity = 'business'
