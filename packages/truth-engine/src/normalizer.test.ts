/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Truth Engine / Tests
 * File: normalizer.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic verification of the ForensicNormalizer and Regex Warden.
 * Traceability: Issue #48, ADR-0017
 * ======================================================================== */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForensicNormalizer } from './normalizer.js';
import { join } from 'node:path';

describe('ForensicNormalizer', () => {
    // The test is running from packages/truth-engine
    // Patterns are in packages/truth-engine/patterns
    const patternDir = join(process.cwd(), 'patterns');
    let normalizer: ForensicNormalizer;

    beforeEach(() => {
        normalizer = new ForensicNormalizer(patternDir);
    });

    it('test_should_extract_metadata_when_pattern_matches_standard_dialect', () => {
        const input = "208V 3PH 60HZ";
        const result = normalizer.normalize(1, 'Frymaster', input, 'https://test.com');
        
        expect(result.status).toBe('HEALTHY');
        expect(result.data).toEqual({
            voltage: "208",
            phase: "3",
            hertz: "60"
        });
    });

    it('test_should_extract_metadata_when_pattern_matches_verbose_dialect', () => {
        const input = "240 Volts 1 Phase";
        const result = normalizer.normalize(1, 'Frymaster', input, 'https://test.com');
        
        expect(result.status).toBe('HEALTHY');
        expect(result.data.voltage).toBe("240");
        expect(result.data.phase).toBe("1");
    });

    it('test_should_return_unverified_raw_data_when_no_pattern_matches', () => {
        const input = "UNKNOWN_POWER_FORMAT_999";
        const result = normalizer.normalize(1, 'Frymaster', input, 'https://test.com');
        
        expect(result.status).toBe('UNVERIFIED_RAW_DATA');
        expect(result.rejection_reason).toBe('No pattern match');
    });

    it('test_should_abort_and_log_when_regex_timeout_exceeded', async () => {
        // Trigger the length gate (Regex Warden: 1000 chars)
        const complexInput = "a".repeat(1001) + "!";
        const result = normalizer.normalize(1, 'Frymaster', complexInput, 'https://test.com');
        
        expect(result.rejection_reason).toContain('timeout');
    });
});
