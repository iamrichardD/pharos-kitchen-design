/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Dialect / True Manufacturing
 * File: packages/dialects/pkd-dialect-true/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Forensic extraction logic for True Manufacturing / KCL.
 * Traceability: Issue #62, ADR 0017
 * ======================================================================== */

use base64::{engine::general_purpose, Engine as _};
use extism_pdk::*;
use once_cell::sync::Lazy;
use pharos_protocol::metadata::{NormalizationStatus, ParameterValue, PharosMetadataBuffer};
use regex::Regex;

static RE_VOLTAGE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(\d{3}/\d{2}/\d{1})").unwrap());
static RE_AMPS: Lazy<Regex> = Lazy::new(|| Regex::new(r"Amps:\s*([\d\.]+)").unwrap());
static RE_SKU: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"PKD_(Product|Model)Number:\s*([A-Z0-9-]+)").unwrap());

#[plugin_fn]
pub fn normalize(
    Json(mut buffer): Json<PharosMetadataBuffer>,
) -> FnResult<Json<PharosMetadataBuffer>> {
    let mut matched = false;

    // 1. Extract Specifications from Raw HTML/Text
    if extract_specs(&mut buffer) {
        matched = true;
    }

    // 2. Handle KCL Redirection (Discovery Protocol)
    if buffer.raw_input.contains("kclcad.com") {
        buffer.parameters.insert(
            "crawl_strategy".to_string(),
            ParameterValue::Text("KCL_ACTIVE_DISCOVERY".to_string()),
        );
        matched = true;
    }

    if matched {
        buffer.status = NormalizationStatus::Healthy;
    } else {
        buffer.status = NormalizationStatus::UnverifiedRawData;
        buffer.rejection_reason = Some("No True Mfg patterns matched".to_string());
    }

    Ok(Json(buffer))
}

#[plugin_fn]
pub fn decode_kcl_payload(payload: String) -> FnResult<String> {
    let decoded = general_purpose::STANDARD
        .decode(payload)
        .map_err(|e| anyhow::anyhow!("Failed to decode Base64: {}", e))?;

    let result =
        String::from_utf8(decoded).map_err(|e| anyhow::anyhow!("Failed to parse UTF-8: {}", e))?;

    Ok(result)
}

fn extract_specs(buffer: &mut PharosMetadataBuffer) -> bool {
    let mut matched = false;

    // Voltage: 115/60/1
    if let Some(caps) = RE_VOLTAGE.captures(&buffer.raw_input) {
        buffer.parameters.insert(
            "PKD_Voltage".to_string(),
            ParameterValue::Text(caps[1].to_string()),
        );
        matched = true;
    }

    // Amps: 1.4
    if let Some(caps) = RE_AMPS.captures(&buffer.raw_input) {
        if let Ok(val) = caps[1].parse::<f64>() {
            buffer
                .parameters
                .insert("PKD_Amps".to_string(), ParameterValue::Number(val));
            matched = true;
        }
    }

    // Product/Model Numbers
    if let Some(caps) = RE_SKU.captures(&buffer.raw_input) {
        let key = format!("PKD_{}Number", &caps[1]);
        buffer
            .parameters
            .insert(key, ParameterValue::Text(caps[2].to_string()));
        matched = true;
    }

    matched
}
