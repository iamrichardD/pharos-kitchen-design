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

const MAX_JSON_SIZE: usize = 1024 * 1024; // 1MB Limit for Shift-Left Security (ADR-0016)

#[derive(Serialize)]
pub struct InteropResponse {
    pub status: String,
    pub errors: Vec<ValidationError>,
}

/// Loads a PharosSchema from JSON and returns an opaque handle.
/// Why: Eliminates redundant schema parsing overhead for high-frequency validation.
/// Safety: Returns null if JSON is invalid or exceeds MAX_JSON_SIZE.
#[no_mangle]
pub extern "C" fn pkd_load_schema(schema_json: *const c_char) -> *mut PharosSchema {
    if schema_json.is_null() {
        return std::ptr::null_mut();
    }

    let schema_cstr = unsafe { CStr::from_ptr(schema_json) };
    let bytes = schema_cstr.to_bytes();
    
    // Shift-Left Security: Prevent DoS via massive JSON payloads
    if bytes.len() > MAX_JSON_SIZE {
        return std::ptr::null_mut();
    }

    let schema_str = match schema_cstr.to_str() {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    let schema: PharosSchema = match serde_json::from_str(schema_str) {
        Ok(s) => s,
        Err(_) => return std::ptr::null_mut(),
    };

    Box::into_raw(Box::new(schema))
}

/// Validates metadata JSON against a pre-loaded schema handle.
/// Why: High-performance validation path for geometry/metadata streams.
#[no_mangle]
pub extern "C" fn pkd_validate_with_handle(handle: *mut PharosSchema, metadata_json: *const c_char) -> *mut c_char {
    if handle.is_null() || metadata_json.is_null() {
        let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Null pointer provided".to_string())],
        };
        return serialize_interop_response(&resp);
    }

    let schema = unsafe { &*handle };
    let metadata_cstr = unsafe { CStr::from_ptr(metadata_json) };
    
    // Shift-Left Security: Limit metadata size to prevent memory exhaustion
    if metadata_cstr.to_bytes().len() > MAX_JSON_SIZE {
        let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Metadata exceeds 1MB limit".to_string())],
        };
        return serialize_interop_response(&resp);
    }

    let metadata_str = match metadata_cstr.to_str() {
        Ok(s) => s,
        Err(_) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError("Invalid UTF-8 in metadata".to_string())],
            };
            return serialize_interop_response(&resp);
        }
    };

    let metadata: PharosMetadata = match serde_json::from_str(metadata_str) {
        Ok(m) => m,
        Err(e) => {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError(format!("Invalid metadata JSON: {}", e))],
            };
            return serialize_interop_response(&resp);
        }
    };

    let mut all_errors = Vec::new();

    // 1. Core Schema Validation
    if let Err(errors) = SchemaValidator::validate_metadata(schema, &metadata) {
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

    serialize_interop_response(&resp)
}

/// Frees the memory associated with a PharosSchema handle.
/// Why: Prevents memory leaks by returning ownership to Rust for explicit cleanup.
#[no_mangle]
pub extern "C" fn pkd_free_schema(handle: *mut PharosSchema) {
    if !handle.is_null() {
        unsafe {
            let _ = Box::from_raw(handle);
        }
    }
}

#[no_mangle]
pub extern "C" fn pkd_validate_metadata_json(schema_json: *const c_char, metadata_json: *const c_char) -> *mut c_char {
    let handle = pkd_load_schema(schema_json);
    if handle.is_null() {
         let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Failed to load schema (Null or Invalid)".to_string())],
        };
        return serialize_interop_response(&resp);
    }

    let result = pkd_validate_with_handle(handle, metadata_json);
    pkd_free_schema(handle);
    result
}

/// Safely serializes the response for C-ABI consumption.
/// Why: Prevents panics across FFI boundaries by providing a hardcoded fallback.
fn serialize_interop_response(resp: &InteropResponse) -> *mut c_char {
    match serde_json::to_string(resp) {
        Ok(json) => CString::new(json).unwrap_or_else(|_| {
            CString::new("{\"status\":\"ERROR\",\"errors\":[{\"code\":\"SLICE_VALIDATION_ERROR\",\"details\":\"Null byte in JSON\"}]}").unwrap()
        }).into_raw(),
        Err(_) => CString::new("{\"status\":\"ERROR\",\"errors\":[{\"code\":\"SLICE_VALIDATION_ERROR\",\"details\":\"Serialization failed\"}]}").unwrap().into_raw()
    }
}

#[no_mangle]
pub extern "C" fn pkd_free_string(s: *mut c_char) {
    if !s.is_null() {
        unsafe {
            let _ = CString::from_raw(s);
        }
    }
}
