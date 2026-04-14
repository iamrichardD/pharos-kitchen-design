/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / WASM Bindings
 * File: bindings.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: WASM bindings for consuming pkd-core in web environments.
 * Traceability: Issue #9, ADR 0002
 * ======================================================================== */

use wasm_bindgen::prelude::*;
use crate::models::schema::PharosSchema;
use crate::models::metadata::PharosMetadata;
use crate::validator::{SchemaValidator, LodValidator};
use serde_wasm_bindgen;

#[wasm_bindgen]
pub fn validate_metadata_wasm(schema_js: JsValue, metadata_js: JsValue) -> Result<JsValue, JsValue> {
    let schema: PharosSchema = serde_wasm_bindgen::from_value(schema_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid schema format: {}", e)))?;
    
    let metadata: PharosMetadata = serde_wasm_bindgen::from_value(metadata_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid metadata format: {}", e)))?;

    let mut all_errors = Vec::new();

    // 1. Core Schema Validation
    if let Err(errors) = SchemaValidator::validate_metadata(&schema, &metadata) {
        all_errors.extend(errors);
    }

    // 2. Vertical Slice Dispatch
    if let Err(errors) = crate::slices::SliceDispatcher::dispatch_validation(&metadata) {
        all_errors.extend(errors);
    }

    if all_errors.is_empty() {
        Ok(JsValue::TRUE)
    } else {
        Err(serde_wasm_bindgen::to_value(&all_errors).unwrap())
    }
}

#[wasm_bindgen]
pub fn verify_lod_wasm(metadata_js: JsValue, target_lod: String) -> Result<bool, JsValue> {
    let metadata: PharosMetadata = serde_wasm_bindgen::from_value(metadata_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid metadata format: {}", e)))?;

    match LodValidator::verify_lod(&metadata, &target_lod) {
        Ok(_) => Ok(true),
        Err(e) => Err(JsValue::from_str(&e.to_string())),
    }
}

// --- C-ABI (Issue #32: Revit Bridge Interop) ---
// Using JSON strings as the universal "Glue" to maintain Metadata-First Truth.

use std::ffi::{CStr, CString};
use std::os::raw::c_char;
use serde::Serialize;
use crate::validator::ValidationError;

#[derive(Serialize)]
pub struct InteropResponse {
    pub status: String,
    pub errors: Vec<ValidationError>,
}

#[no_mangle]
pub extern "C" fn pkd_validate_metadata_json(schema_json: *const c_char, metadata_json: *const c_char) -> *mut c_char {
    if schema_json.is_null() || metadata_json.is_null() {
        let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Null pointer provided".to_string())],
        };
        return CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw();
    }

    let schema_cstr = unsafe { CStr::from_ptr(schema_json) };
    let metadata_cstr = unsafe { CStr::from_ptr(metadata_json) };

    let schema_str = match schema_cstr.to_str() {
        Ok(s) => s,
        Err(_) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError("Invalid UTF-8 in schema".to_string())],
            };
            return CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw();
        }
    };

    let metadata_str = match metadata_cstr.to_str() {
        Ok(s) => s,
        Err(_) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError("Invalid UTF-8 in metadata".to_string())],
            };
            return CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw();
        }
    };

    let schema: PharosSchema = match serde_json::from_str(schema_str) {
        Ok(s) => s,
        Err(e) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError(format!("Invalid schema JSON: {}", e))],
            };
            return CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw();
        }
    };

    let metadata: PharosMetadata = match serde_json::from_str(metadata_str) {
        Ok(m) => m,
        Err(e) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError(format!("Invalid metadata JSON: {}", e))],
            };
            return CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw();
        }
    };

    let mut all_errors = Vec::new();

    // 1. Core Schema Validation
    if let Err(errors) = SchemaValidator::validate_metadata(&schema, &metadata) {
        all_errors.extend(errors);
    }

    // 2. Vertical Slice Dispatch
    if let Err(errors) = crate::slices::SliceDispatcher::dispatch_validation(&metadata) {
        all_errors.extend(errors);
    }

    let resp = if all_errors.is_empty() {
        InteropResponse {
            status: "OK".to_string(),
            errors: Vec::new(),
        }
    } else {
        InteropResponse {
            status: "ERROR".to_string(),
            errors: all_errors,
        }
    };

    CString::new(serde_json::to_string(&resp).unwrap()).unwrap().into_raw()
}

#[no_mangle]
pub extern "C" fn pkd_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe {
            let _ = CString::from_raw(s);
        }
    }
}
