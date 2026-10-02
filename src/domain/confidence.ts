/**
 * BUS-013 — Confidence Classification
 * Pure function. No I/O.
 *
 * HIGH  = computed purely from KNOWN/seed inputs, complete data
 * MEDIUM = uses DERIVED or ASSUMED inputs
 * LOW   = CORRELATED/ESTIMATED inputs or missing fields
 * No numeric confidence % ever emitted (no false precision).
 */

import { ConfidenceLevel, DataLabel } from './types';
import type { ConfidenceLevel as ConfidenceLevelType } from './types';

const LOW_LABELS: DataLabel[] = [DataLabel.CORRELATED, DataLabel.ESTIMATED, DataLabel.UNKNOWN];
const MEDIUM_LABELS: DataLabel[] = [DataLabel.DERIVED, DataLabel.ASSUMED];

/**
 * BUS-013: Classify confidence from a set of data labels.
 */
export function classifyConfidence(labels: DataLabel[]): ConfidenceLevelType {
  if (labels.length === 0) return ConfidenceLevel.LOW;

  for (const label of labels) {
    if (LOW_LABELS.includes(label)) return ConfidenceLevel.LOW;
  }
  for (const label of labels) {
    if (MEDIUM_LABELS.includes(label)) return ConfidenceLevel.MEDIUM;
  }
  return ConfidenceLevel.HIGH;
}
