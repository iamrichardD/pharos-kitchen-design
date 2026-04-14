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

    match SchemaValidator::validate_metadata(&schema, &metadata) {
        Ok(_) => Ok(JsValue::TRUE),
        Err(errors) => {
            let err_msgs: Vec<String> = errors.into_iter().map(|e| e.to_string()).collect();
            Err(serde_wasm_bindgen::to_value(&err_msgs).unwrap())
        }
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

#[no_mangle]
pub extern "C" fn pkd_validate_metadata_json(schema_json: *const c_char, metadata_json: *const c_char) -> *mut c_char {
    if schema_json.is_null() || metadata_json.is_null() {
        return CString::new("Error: Null pointer provided").unwrap().into_raw();
    }

    let schema_cstr = unsafe { CStr::from_ptr(schema_json) };
    let metadata_cstr = unsafe { CStr::from_ptr(metadata_json) };

    let schema_str = match schema_cstr.to_str() {
        Ok(s) => s,
        Err(_) => return CString::new("Error: Invalid UTF-8 in schema").unwrap().into_raw(),
    };

    let metadata_str = match metadata_cstr.to_str() {
        Ok(s) => s,
        Err(_) => return CString::new("Error: Invalid UTF-8 in metadata").unwrap().into_raw(),
    };

    let schema: PharosSchema = match serde_json::from_str(schema_str) {
        Ok(s) => s,
        Err(e) => return CString::new(format!("Error: Invalid schema JSON: {}", e)).unwrap().into_raw(),
    };

    let metadata: PharosMetadata = match serde_json::from_str(metadata_str) {
        Ok(m) => m,
        Err(e) => return CString::new(format!("Error: Invalid metadata JSON: {}", e)).unwrap().into_raw(),
    };

    match SchemaValidator::validate_metadata(&schema, &metadata) {
        Ok(_) => {
            // Dispatch to category-specific vertical slices for deep validation
            match crate::slices::SliceDispatcher::dispatch_validation(&metadata) {
                Ok(_) => CString::new("OK").unwrap().into_raw(),
                Err(errors) => CString::new(errors.join("; ")).unwrap().into_raw()
            }
        },
        Err(errors) => {
            let err_msg = errors.into_iter().map(|e| e.to_string()).collect::<Vec<String>>().join("; ");
            CString::new(err_msg).unwrap().into_raw()
        }
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
