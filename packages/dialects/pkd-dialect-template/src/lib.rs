/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Dialect / Template
 * File: packages/dialects/pkd-dialect-template/src/lib.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Base implementation for WASM-based manufacturer dialects.
 * Traceability: Issue #60, ADR 0024
 * ======================================================================== */

use extism_pdk::*;
use pharos_protocol::metadata::{NormalizationStatus, PharosMetadataBuffer};

#[plugin_fn]
pub fn normalize(
    Json(mut buffer): Json<PharosMetadataBuffer>,
) -> FnResult<Json<PharosMetadataBuffer>> {
    // This is the template. Sub-dialects will implement their specific logic here.
    // For the template, we just mark it as unverified since it has no rules.
    buffer.status = NormalizationStatus::UnverifiedRawData;
    buffer.rejection_reason = Some("Template dialect: no rules applied".to_string());

    Ok(Json(buffer))
}
