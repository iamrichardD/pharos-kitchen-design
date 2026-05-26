/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Dialect / Frymaster
 * File: packages/dialects/pkd-dialect-frymaster/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Compiled forensic extraction logic for Frymaster equipment.
 * Traceability: Issue #60, ADR 0024
 * ======================================================================== */

use extism_pdk::*;
use once_cell::sync::Lazy;
use pharos_protocol::metadata::{NormalizationStatus, ParameterValue, PharosMetadataBuffer};
use regex::Regex;

// Mandate: [PERF-GAP] Regex recompilation prevention.
// Pre-compile regexes once when the WASM module loads.
static RE_VOLT: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)(\d{3})V|(\d{3})\s*Volts").unwrap());
static RE_PHASE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)(\d)PH|(\d)\s*Phase").unwrap());
static RE_HZ: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?i)(\d{2})HZ").unwrap());

#[plugin_fn]
pub fn normalize(
    Json(mut buffer): Json<PharosMetadataBuffer>,
) -> FnResult<Json<PharosMetadataBuffer>> {
    let input = &buffer.raw_input;
    let mut matched = false;

    // 1. Voltage Extraction
    if let Some(caps) = RE_VOLT.captures(input) {
        let val = caps.get(1).or(caps.get(2)).unwrap().as_str();
        if let Ok(n) = val.parse::<f64>() {
            buffer
                .parameters
                .insert("voltage".to_string(), ParameterValue::Number(n));
            matched = true;
        }
    }

    // 2. Phase Extraction
    if let Some(caps) = RE_PHASE.captures(input) {
        let val = caps.get(1).or(caps.get(2)).unwrap().as_str();
        if let Ok(n) = val.parse::<f64>() {
            buffer
                .parameters
                .insert("phase".to_string(), ParameterValue::Number(n));
            matched = true;
        }
    }

    // 3. Hertz Extraction
    if let Some(caps) = RE_HZ.captures(input) {
        let val = caps.get(1).unwrap().as_str();
        if let Ok(n) = val.parse::<f64>() {
            buffer
                .parameters
                .insert("hertz".to_string(), ParameterValue::Number(n));
            matched = true;
        }
    }

    if matched {
        buffer.status = NormalizationStatus::Healthy;
    } else {
        buffer.status = NormalizationStatus::UnverifiedRawData;
        buffer.rejection_reason = Some("No Frymaster patterns matched".to_string());
    }

    Ok(Json(buffer))
}
