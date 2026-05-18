/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Interop Bindings
 * File: bindings.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified WASM and C-ABI bindings for multi-platform interop.
 * Traceability: Issue #9, #31, ADR-0002, ADR-0025, #111
 * ======================================================================== */

use wasm_bindgen::prelude::*;
use crate::models::schema::PharosSchema;
use crate::models::metadata::PharosMetadata;
use crate::validator::{SchemaValidator, LodValidator};
use serde_wasm_bindgen;
use dashmap::DashMap;
use std::sync::Arc;

#[wasm_bindgen]
pub struct PharosRegistryHandle {
    pub(crate) inner: Arc<DashMap<String, PharosMetadata>>,
}

#[wasm_bindgen]
impl PharosRegistryHandle {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            inner: Arc::new(DashMap::new()),
        }
    }

    /// Executes a query across the registry.
    /// Uses Rayon parallelism on native targets, fallback to sync on WASM.
    pub fn query_ids_containing(&self, pattern: String) -> Vec<String> {
        #[cfg(not(target_arch = "wasm32"))]
        {
            let dispatcher = crate::jit::ParallelQueryDispatcher::new(self.inner.clone());
            dispatcher.query_parallel(|(id, _)| {
                if id.contains(&pattern) {
                    Some(id.clone())
                } else {
                    None
                }
            })
        }
        #[cfg(target_arch = "wasm32")]
        {
            self.inner
                .iter()
                .filter(|item| item.key().contains(&pattern))
                .map(|item| item.key().clone())
                .collect()
        }
    }
}

#[wasm_bindgen]
pub fn load_registry_wasm(registry_js: JsValue) -> Result<PharosRegistryHandle, JsValue> {
    let registry: DashMap<String, PharosMetadata> = serde_wasm_bindgen::from_value(registry_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid registry format: {}", e)))?;
    
    Ok(PharosRegistryHandle { inner: Arc::new(registry) })
}

#[wasm_bindgen]
pub fn get_ghost_metadata_wasm(handle: &PharosRegistryHandle, id: String) -> Result<JsValue, JsValue> {
    match handle.inner.get(&id) {
        Some(m) => Ok(serde_wasm_bindgen::to_value(&*m).unwrap()),
        None => Err(JsValue::from_str(&format!("Metadata ID '{}' not found in registry", id))),
    }
}

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

// --- C-ABI (Issue #31: Unified Interop Schema) ---
// Using JSON via Span<byte> (byte slices) to eliminate allocation and null-termination risks.
// Strictly aligned with ADR-0025 (.NET 8.0+ Mandate).

use std::ffi::{CString};
use std::os::raw::c_char;
use std::path::Path;
use serde::{Serialize, Deserialize};
use crate::validator::ValidationError;

const MAX_JSON_SIZE: usize = 1024 * 1024; // 1MB Limit for Shift-Left Security (ADR-0016)

#[derive(Serialize, Deserialize)]
pub struct InteropResponse {
    pub status: String,
    pub errors: Vec<ValidationError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

use std::panic::{catch_unwind, AssertUnwindSafe};

/// Helper to safely obtain a byte slice from raw FFI parameters.
/// Why: Enforces the MAX_JSON_SIZE sentinel before any memory access.
fn safe_read_bytes<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], ValidationError> {
    if ptr.is_null() {
        return Err(ValidationError::SliceError("Null pointer provided".to_string()));
    }
    // Shift-Left Security: Enforce size sentinel before memory access
    if len > MAX_JSON_SIZE {
        return Err(ValidationError::SliceError(format!("Payload exceeds 1MB limit ({} bytes)", len)));
    }
    unsafe {
        Ok(std::slice::from_raw_parts(ptr, len))
    }
}

/// Helper to safely obtain a UTF-8 string from raw FFI parameters.
fn safe_read_str<'a>(ptr: *const u8, len: usize) -> Result<&'a str, ValidationError> {
    let bytes = safe_read_bytes(ptr, len)?;
    std::str::from_utf8(bytes).map_err(|e| ValidationError::SliceError(format!("Invalid UTF-8: {}", e)))
}

/// Hydrates a "Ghost Link" with verified Pharos metadata.
/// Why: Provides immediate BIM hydration for unmodeled placeholders using a resident registry.
/// Traceability: Issue #30, #31, #120
#[no_mangle]
pub extern "C" fn pkd_get_ghost_metadata(handle: *mut PharosRegistryHandle, ptr: *const u8, len: usize) -> *mut c_char {
    let result = catch_unwind(AssertUnwindSafe(|| {
        if handle.is_null() {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError("Null registry handle provided".to_string())],
                data: None,
            };
            return serialize_interop_response(&resp);
        }

        let id_str = match safe_read_str(ptr, len) {
            Ok(s) => s,
            Err(e) => {
                let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![e],
                    data: None,
                };
                return serialize_interop_response(&resp);
            }
        };

        let registry = unsafe { &*handle };

        if let Some(metadata) = registry.inner.get(id_str) {
            let data = match serde_json::to_value(&*metadata) {
                Ok(v) => Some(v),
                Err(e) => {
                    let resp = InteropResponse {
                        status: "ERROR".to_string(),
                        errors: vec![ValidationError::SliceError(format!("Metadata serialization failed: {}", e))],
                        data: None,
                    };
                    return serialize_interop_response(&resp);
                }
            };

            let resp = InteropResponse {
                status: "OK".to_string(),
                errors: Vec::new(),
                data,
            };
            return serialize_interop_response(&resp);
        }

        let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError(format!("Metadata ID '{}' not found in resident registry", id_str))],
            data: None,
        };
        serialize_interop_response(&resp)
    }));

    match result {
        Ok(ptr) => ptr,
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError("Rust core panicked during ghost metadata retrieval".to_string())],
            data: None,
        }),
    }
}

/// Loads a PharosRegistry from JSON and returns an opaque handle.
/// Why: Enables dynamic, data-driven BIM hydration from a verified source of truth.
/// Safety: Returns null if JSON is invalid, exceeds MAX_JSON_SIZE, or panics.
#[no_mangle]
pub extern "C" fn pkd_load_registry(ptr: *const u8, len: usize) -> *mut PharosRegistryHandle {
    let result = catch_unwind(|| {
        let bytes = match safe_read_bytes(ptr, len) {
            Ok(b) => b,
            Err(_) => return std::ptr::null_mut(),
        };

        let items: DashMap<String, PharosMetadata> = match serde_json::from_slice(bytes) {
            Ok(s) => s,
            Err(_) => return std::ptr::null_mut(),
        };

        Box::into_raw(Box::new(PharosRegistryHandle { inner: Arc::new(items) }))
    });

    match result {
        Ok(ptr) => ptr,
        Err(_) => std::ptr::null_mut(),
    }
}

/// Frees the memory associated with a PharosRegistry handle.
#[no_mangle]
pub extern "C" fn pkd_free_registry(handle: *mut PharosRegistryHandle) {
    if !handle.is_null() {
        unsafe {
            let _ = Box::from_raw(handle);
        }
    }
}

/// Loads a PharosSchema from JSON and returns an opaque handle.
/// Why: Eliminates redundant schema parsing overhead for high-frequency validation.
/// Safety: Returns null if JSON is invalid, exceeds MAX_JSON_SIZE, or panics.
#[no_mangle]
pub extern "C" fn pkd_load_schema(ptr: *const u8, len: usize) -> *mut PharosSchema {
    let result = catch_unwind(|| {
        let bytes = match safe_read_bytes(ptr, len) {
            Ok(b) => b,
            Err(_) => return std::ptr::null_mut(),
        };

        let schema: PharosSchema = match serde_json::from_slice(bytes) {
            Ok(s) => s,
            Err(_) => return std::ptr::null_mut(),
        };

        Box::into_raw(Box::new(schema))
    });

    match result {
        Ok(ptr) => ptr,
        Err(_) => std::ptr::null_mut(),
    }
}

/// Validates metadata JSON against a pre-loaded schema handle.
/// Why: High-performance validation path for geometry/metadata streams.
/// Safety: Catches panics to prevent host process (Revit) from crashing.
#[no_mangle]
pub extern "C" fn pkd_validate_with_handle(handle: *mut PharosSchema, ptr: *const u8, len: usize) -> *mut c_char {
    let result = catch_unwind(|| {
        if handle.is_null() {
            let resp = InteropResponse {
                status: "ERROR".to_string(),
                errors: vec![ValidationError::SliceError("Null schema handle provided".to_string())],
                data: None,
            };
            return serialize_interop_response(&resp);
        }

        let schema = unsafe { &*handle };
        let bytes = match safe_read_bytes(ptr, len) {
            Ok(b) => b,
            Err(e) => {
                 let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![e],
                    data: None,
                };
                return serialize_interop_response(&resp);
            }
        };

        let metadata: PharosMetadata = match serde_json::from_slice(bytes) {
            Ok(m) => m,
            Err(e) => {
                let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![ValidationError::SliceError(format!("Invalid metadata JSON: {}", e))],
                    data: None,
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
                data: None,
            }
        } else {
            InteropResponse {
                status: "ERROR".to_string(),
                errors: all_errors,
                data: None,
            }
        };

        serialize_interop_response(&resp)
    });

    match result {
        Ok(ptr) => ptr,
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError("Rust core panicked during validation".to_string())],
            data: None,
        }),
    }
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
pub extern "C" fn pkd_validate_metadata_json(
    schema_ptr: *const u8, schema_len: usize, 
    metadata_ptr: *const u8, metadata_len: usize
) -> *mut c_char {
    let handle = pkd_load_schema(schema_ptr, schema_len);
    if handle.is_null() {
         let resp = InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Failed to load schema (Null or Invalid)".to_string())],
            data: None,
        };
        return serialize_interop_response(&resp);
    }

    let result = pkd_validate_with_handle(handle, metadata_ptr, metadata_len);
    pkd_free_schema(handle);
    result
}

/// Verifies the integrity of a file against an expected SHA-256 hash.
/// Why: High-rigor supply chain security for all Pharos artifact ingestion.
/// Safety: Returns serialized JSON error if path is invalid, hash mismatches, or file is missing.
#[no_mangle]
pub extern "C" fn pkd_verify_manifest(
    path_ptr: *const u8, path_len: usize, 
    hash_ptr: *const u8, hash_len: usize
) -> *mut c_char {
    let result = catch_unwind(|| {
        let path_str = match safe_read_str(path_ptr, path_len) {
            Ok(s) => s,
            Err(e) => {
                let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![e],
                    data: None,
                };
                return serialize_interop_response(&resp);
            }
        };

        let hash_str = match safe_read_str(hash_ptr, hash_len) {
            Ok(s) => s,
            Err(e) => {
                let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![e],
                    data: None,
                };
                return serialize_interop_response(&resp);
            }
        };

        match crate::security::verify_manifest(Path::new(path_str), hash_str) {
            Ok(_) => {
                let resp = InteropResponse {
                    status: "OK".to_string(),
                    errors: Vec::new(),
                    data: None,
                };
                serialize_interop_response(&resp)
            },
            Err(e) => {
                let resp = InteropResponse {
                    status: "ERROR".to_string(),
                    errors: vec![ValidationError::SliceError(e.to_string())],
                    data: None,
                };
                serialize_interop_response(&resp)
            }
        }
    });

    match result {
        Ok(ptr) => ptr,
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError("Rust core panicked during manifest verification".to_string())],
            data: None,
        }),
    }
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

#[no_mangle]
pub extern "C" fn pkd_trigger_panic() -> *mut c_char {
    let result = catch_unwind(|| {
        panic!("Manual panic triggered for FFI boundary testing.");
    });

    match result {
        Ok(_) => serialize_interop_response(&InteropResponse {
            status: "OK".to_string(),
            errors: Vec::new(),
            data: None,
        }),
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError("Rust core panicked (Verified)".to_string())],
            data: None,
        }),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_load_registry_and_retrieve_metadata_when_valid_json_provided() {
        let registry_json = r#"{
            "PHX-DW-001": {
                "metadata_id": "PHX-DW-001",
                "name": "Registry Dishwasher",
                "schema_version": "1.0.0",
                "classification": {
                    "omniclass_table_23": "23-75 50 11 11",
                    "category": "Warewashing"
                },
                "parameters": {
                    "manufacturer": "RegistryBrand"
                },
                "lod_geometry_specs": {
                    "100": {
                        "type": "PROCEDURAL_BOX",
                        "dimensions": {
                            "width": "3.0",
                            "depth": "3.0",
                            "height": "4.0"
                        },
                        "description": "Registry LOD 100"
                    }
                },
                "performance_metadata": {
                    "estimated_rfa_size_kb": 450,
                    "procedural_lod_enabled": true,
                    "ghost_link_active": true
                }
            }
        }"#;

        let handle = pkd_load_registry(registry_json.as_ptr(), registry_json.len());
        assert!(!handle.is_null());

        let id = "PHX-DW-001";
        let ptr = pkd_get_ghost_metadata(handle, id.as_ptr(), id.len());
        
        let result_cstr = unsafe { std::ffi::CStr::from_ptr(ptr) };
        let result_json = result_cstr.to_str().unwrap();
        
        let resp: InteropResponse = serde_json::from_str(result_json).unwrap();
        assert_eq!(resp.status, "OK");
        assert!(resp.data.is_some());
        
        let data = resp.data.unwrap();
        assert_eq!(data["name"], "Registry Dishwasher");
        assert_eq!(data["parameters"]["manufacturer"], "RegistryBrand");

        pkd_free_string(ptr);
        pkd_free_registry(handle);
    }

    #[test]
    fn test_should_return_error_when_id_not_found_in_registry() {
        let registry_json = "{}";
        let handle = pkd_load_registry(registry_json.as_ptr(), registry_json.len());
        
        let id = "PHX-DW-001";
        let ptr = pkd_get_ghost_metadata(handle, id.as_ptr(), id.len());
        
        let result_cstr = unsafe { std::ffi::CStr::from_ptr(ptr) };
        let resp: InteropResponse = serde_json::from_str(result_cstr.to_str().unwrap()).unwrap();
        assert_eq!(resp.status, "ERROR");

        pkd_free_string(ptr);
        pkd_free_registry(handle);
    }

    #[test]
    fn test_should_serialize_complex_metadata_when_bridge_invoked_with_byte_slice() {
        let schema_json = include_str!("../schema/pharos-schema.json");
        let metadata_json = include_str!("../samples/commercial-dishwasher.json");

        let ptr = pkd_validate_metadata_json(
            schema_json.as_ptr(), schema_json.len(),
            metadata_json.as_ptr(), metadata_json.len()
        );

        let result_cstr = unsafe { std::ffi::CStr::from_ptr(ptr) };
        let result_str = result_cstr.to_str().unwrap();
        let resp: InteropResponse = serde_json::from_str(result_str).unwrap();
        
        if resp.status != "OK" {
            panic!("Validation failed with status: {}, errors: {:?}", resp.status, resp.errors);
        }
        
        pkd_free_string(ptr);
    }

    #[test]
    fn test_should_reject_payload_when_len_exceeds_max_size_sentinel() {
        let oversized_data = vec![0u8; MAX_JSON_SIZE + 1];
        let ptr = pkd_load_schema(oversized_data.as_ptr(), oversized_data.len());
        
        assert!(ptr.is_null());
    }

    #[test]
    fn test_should_return_safe_error_when_invalid_utf8_bytes_provided() {
        let registry_json = "{}";
        let handle = pkd_load_registry(registry_json.as_ptr(), registry_json.len());

        let invalid_utf8 = vec![0 as u8, 159, 146, 150]; // Invalid UTF-8 sequence
        let ptr = pkd_get_ghost_metadata(handle, invalid_utf8.as_ptr(), invalid_utf8.len());
        
        let result_cstr = unsafe { std::ffi::CStr::from_ptr(ptr) };
        let resp: InteropResponse = serde_json::from_str(result_cstr.to_str().unwrap()).unwrap();
        
        assert_eq!(resp.status, "ERROR");
        assert!(resp.errors[0].to_string().contains("Invalid UTF-8"));
        pkd_free_string(ptr);
        pkd_free_registry(handle);
    }
}
