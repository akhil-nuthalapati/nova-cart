import { describe, it, expect } from 'vitest';
import { classifyConfidence } from '../../src/domain/confidence';
import { ConfidenceLevel, DataLabel } from '../../src/domain/types';

describe('BUS-013: Confidence Classification', () => {
  it('TEST-BUS-013: Correctly classifies confidence without emitting numeric %', () => {
    // Purely KNOWN inputs -> HIGH
    expect(classifyConfidence([DataLabel.KNOWN, DataLabel.KNOWN])).toBe(ConfidenceLevel.HIGH);

    // DERIVED or ASSUMED inputs -> MEDIUM
    expect(classifyConfidence([DataLabel.KNOWN, DataLabel.DERIVED])).toBe(ConfidenceLevel.MEDIUM);
    expect(classifyConfidence([DataLabel.ASSUMED])).toBe(ConfidenceLevel.MEDIUM);

    // CORRELATED, ESTIMATED, or UNKNOWN -> LOW
    expect(classifyConfidence([DataLabel.KNOWN, DataLabel.ESTIMATED])).toBe(ConfidenceLevel.LOW);
    expect(classifyConfidence([DataLabel.CORRELATED])).toBe(ConfidenceLevel.LOW);
    expect(classifyConfidence([DataLabel.UNKNOWN])).toBe(ConfidenceLevel.LOW);

    // Empty labels -> LOW
    expect(classifyConfidence([])).toBe(ConfidenceLevel.LOW);

    // Assertion: verify no numeric percentage is returned (rule: no numeric confidence %)
    const res = classifyConfidence([DataLabel.KNOWN]);
    expect(res).not.toMatch(/\d+%/);
  });
});
