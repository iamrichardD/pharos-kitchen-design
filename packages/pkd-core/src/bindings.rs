/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Interop Bindings
 * File: bindings.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified WASM and C-ABI bindings for multi-platform interop.
 * Traceability: Issue #9, #31, ADR-0002, ADR-0025, #111, #125, #165
 * ======================================================================== */

use crate::lazy_loader::{LazyShardLoader, ShardFetcher};
use crate::models::metadata::PharosMetadata;
#[cfg(any(test, not(target_arch = "wasm32")))]
use crate::models::metadata::RegistryShard;
use crate::models::query::{filter_metadata, results_to_toon_json, QueryEvaluator};
use crate::models::schema::PharosSchema;
use crate::models::types::ParameterValue;
use crate::validator::{LodValidator, SchemaValidator, ValidationError};
use dashmap::DashMap;
use pharos_protocol::Command;
use serde::{Deserialize, Serialize};
use serde_wasm_bindgen;
use std::collections::{BTreeMap, HashMap, VecDeque};
use std::future::Future;
use std::panic::{catch_unwind, AssertUnwindSafe};
use std::path::Path;
use std::pin::Pin;
use std::sync::atomic::AtomicU64;
#[cfg(any(test, not(target_arch = "wasm32")))]
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;

const MAX_JSON_SIZE: usize = 1024 * 1024; // 1MB Limit for Shift-Left Security (ADR-0016)

#[derive(Serialize, Deserialize)]
pub struct InteropResponse {
    pub status: String,
    pub errors: Vec<ValidationError>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
}

#[repr(C)]
pub struct PkdBuffer {
    pub ptr: *mut u8,
    pub len: usize,
}

pub type FfiFetcherCallback = extern "C" fn(
    url_ptr: *const u8,
    url_len: usize,
    out_ptr: *mut *mut u8,
    out_len: *mut usize,
) -> i32;

struct FfiShardFetcher {
    callback: FfiFetcherCallback,
}

impl ShardFetcher for FfiShardFetcher {
    fn fetch(
        &self,
        url: String,
    ) -> Pin<Box<dyn Future<Output = Result<Vec<u8>, anyhow::Error>> + Send>> {
        let callback = self.callback;
        Box::pin(async move {
            let mut out_ptr: *mut u8 = std::ptr::null_mut();
            let mut out_len: usize = 0;
            let url_bytes = url.as_bytes();
            let res = (callback)(
                url_bytes.as_ptr(),
                url_bytes.len(),
                &mut out_ptr,
                &mut out_len,
            );
            if res != 0 {
                return Err(anyhow::anyhow!("FFI fetcher failed with code {}", res));
            }
            if out_ptr.is_null() {
                return Ok(Vec::new());
            }
            let bytes = unsafe { std::slice::from_raw_parts(out_ptr, out_len).to_vec() };
            Ok(bytes)
        })
    }
}

#[wasm_bindgen]
pub struct PharosRegistryHandle {
    pub(crate) cache: Arc<DashMap<String, PharosMetadata>>,
    pub(crate) tuning_deltas: Arc<DashMap<String, BTreeMap<String, ParameterValue>>>,
    pub(crate) loader: Option<Arc<LazyShardLoader>>,
    #[allow(dead_code)]
    pub(crate) memory_limit_kb: u64,
    #[allow(dead_code)]
    pub(crate) current_size_kb: Arc<AtomicU64>,
    #[allow(dead_code)]
    pub(crate) loaded_shards: Arc<Mutex<VecDeque<String>>>,
    #[allow(dead_code)]
    pub(crate) shard_to_skus: Arc<DashMap<String, Vec<String>>>,
    pub(crate) sku_to_shard: Arc<DashMap<String, String>>,
}

impl Default for PharosRegistryHandle {
    fn default() -> Self {
        Self::new()
    }
}

#[wasm_bindgen]
impl PharosRegistryHandle {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self {
            cache: Arc::new(DashMap::new()),
            tuning_deltas: Arc::new(DashMap::new()),
            loader: None,
            memory_limit_kb: 64 * 1024,
            current_size_kb: Arc::new(AtomicU64::new(0)),
            loaded_shards: Arc::new(Mutex::new(VecDeque::new())),
            shard_to_skus: Arc::new(DashMap::new()),
            sku_to_shard: Arc::new(DashMap::new()),
        }
    }

    pub fn query_ids_containing(&self, pattern: String) -> Vec<String> {
        self.cache
            .iter()
            .filter(|entry| entry.key().contains(&pattern))
            .map(|entry| entry.key().clone())
            .collect()
    }

    /// Executes an RFC 2378 query against the registry.
    /// Why: Centralizes the search logic in the WASM core for cross-platform parity.
    pub fn query_wasm(&self, query_string: String) -> Result<JsValue, JsValue> {
        match self.query_internal(query_string) {
            Ok(json) => {
                let serializer = serde_wasm_bindgen::Serializer::json_compatible();
                Ok(Serialize::serialize(&json, &serializer).unwrap())
            }
            Err(e) => Err(JsValue::from_str(&e)),
        }
    }
}

impl PharosRegistryHandle {
    pub fn query_internal(&self, query_string: String) -> Result<serde_json::Value, String> {
        let cmd = pharos_protocol::parse_command(&query_string).map_err(|e| e.to_string())?;

        if let Command::Query {
            selections,
            returns,
        } = cmd
        {
            let results: Vec<serde_json::Value> = self
                .cache
                .iter()
                .filter(|entry| selections.matches(entry.value()))
                .map(|entry| filter_metadata(entry.value(), &returns))
                .collect();

            Ok(results_to_toon_json(results, &returns))
        } else {
            Err("Only 'query' commands are supported".to_string())
        }
    }

    #[cfg(any(test, not(target_arch = "wasm32")))]
    #[allow(dead_code)]
    pub(crate) fn add_shard(&self, shard: RegistryShard) {
        let mut loaded_shards = self.loaded_shards.lock().unwrap();
        let shard_id = shard.shard_id.clone();

        let mut skus = Vec::new();
        let mut shard_size_kb = 0;

        for (id, metadata) in shard.records {
            let size = metadata.performance_metadata.estimated_rfa_size_kb as u64;
            shard_size_kb += size;
            skus.push(id.clone());
            self.cache.insert(id, metadata);
        }

        self.shard_to_skus.insert(shard_id.clone(), skus);
        self.current_size_kb
            .fetch_add(shard_size_kb, Ordering::SeqCst);
        loaded_shards.push_back(shard_id);

        self.evict_if_needed_locked(&mut loaded_shards);
    }

    #[cfg(any(test, not(target_arch = "wasm32")))]
    #[allow(dead_code)]
    fn evict_if_needed_locked(&self, loaded_shards: &mut VecDeque<String>) {
        while self.current_size_kb.load(Ordering::SeqCst) > self.memory_limit_kb {
            if let Some(old_shard_id) = loaded_shards.pop_front() {
                if let Some((_, skus)) = self.shard_to_skus.remove(&old_shard_id) {
                    let mut evicted_size = 0;
                    for sku in skus {
                        if let Some((_, metadata)) = self.cache.remove(&sku) {
                            evicted_size +=
                                metadata.performance_metadata.estimated_rfa_size_kb as u64;
                        }
                    }
                    self.current_size_kb
                        .fetch_sub(evicted_size, Ordering::SeqCst);
                }
            } else {
                break;
            }
        }
    }
}

#[wasm_bindgen]
pub fn load_registry_wasm(registry_js: JsValue) -> Result<PharosRegistryHandle, JsValue> {
    let items: HashMap<String, PharosMetadata> = serde_wasm_bindgen::from_value(registry_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid registry format: {}", e)))?;

    let handle = PharosRegistryHandle::new();
    for (k, v) in items {
        handle.cache.insert(k, v);
    }
    Ok(handle)
}

#[wasm_bindgen]
pub fn get_ghost_metadata_wasm(
    handle: &PharosRegistryHandle,
    id: String,
) -> Result<JsValue, JsValue> {
    match handle.cache.get(&id) {
        Some(m) => {
            let mut final_metadata = m.clone();
            if let Some(deltas) = handle.tuning_deltas.get(&id) {
                for (key, value) in deltas.iter() {
                    final_metadata.parameters.insert(key.clone(), value.clone());
                }
            }
            if final_metadata.performance_metadata.procedural_lod_enabled
                && final_metadata.geometry_manifest.is_none()
            {
                final_metadata.geometry_manifest =
                    crate::geometry::procedural::ProceduralGenerator::generate_manifest(
                        &final_metadata,
                    );
            }
            Ok(serde_wasm_bindgen::to_value(&final_metadata).unwrap())
        }
        None => Err(JsValue::from_str(&format!(
            "Metadata ID '{}' not found in registry",
            id
        ))),
    }
}

#[wasm_bindgen]
pub fn sync_state_wasm(
    handle: &PharosRegistryHandle,
    id: String,
    delta_js: JsValue,
) -> Result<JsValue, JsValue> {
    let deltas: BTreeMap<String, ParameterValue> = serde_wasm_bindgen::from_value(delta_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid delta format: {}", e)))?;

    handle.tuning_deltas.insert(id, deltas);
    Ok(JsValue::TRUE)
}

#[wasm_bindgen]
pub fn validate_metadata_wasm(
    schema_js: JsValue,
    metadata_js: JsValue,
) -> Result<JsValue, JsValue> {
    let schema: PharosSchema = serde_wasm_bindgen::from_value(schema_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid schema format: {}", e)))?;

    let metadata: PharosMetadata = serde_wasm_bindgen::from_value(metadata_js)
        .map_err(|e| JsValue::from_str(&format!("Invalid metadata format: {}", e)))?;

    let mut all_errors = Vec::new();
    if let Err(errors) = SchemaValidator::validate_metadata(&schema, &metadata) {
        all_errors.extend(errors);
    }
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

/// # Safety
/// Dereferences the raw pointer `ptr`. Caller must ensure it points to `len` valid bytes.
unsafe fn safe_read_bytes<'a>(ptr: *const u8, len: usize) -> Result<&'a [u8], ValidationError> {
    if ptr.is_null() {
        return Err(ValidationError::SliceError(
            "Null pointer provided".to_string(),
        ));
    }
    if len > MAX_JSON_SIZE {
        return Err(ValidationError::SliceError(format!(
            "Payload exceeds 1MB limit ({} bytes)",
            len
        )));
    }
    Ok(std::slice::from_raw_parts(ptr, len))
}

/// # Safety
/// Dereferences the raw pointer `ptr`.
unsafe fn safe_read_str<'a>(ptr: *const u8, len: usize) -> Result<&'a str, ValidationError> {
    let bytes = safe_read_bytes(ptr, len)?;
    std::str::from_utf8(bytes)
        .map_err(|e| ValidationError::SliceError(format!("Invalid UTF-8: {}", e)))
}

/// # Safety
/// Dereferences raw pointers. Caller must ensure pointers are valid.
#[no_mangle]
pub unsafe extern "C" fn pkd_sync_state(
    handle: *mut PharosRegistryHandle,
    sku_ptr: *const u8,
    sku_len: usize,
    delta_ptr: *const u8,
    delta_len: usize,
) -> PkdBuffer {
    if handle.is_null() {
        return serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Null handle".to_string())],
            data: None,
        });
    }

    let mut handle_safe = AssertUnwindSafe(&mut *handle);
    let result = catch_unwind(move || {
        let registry = &mut **handle_safe;
        let id = safe_read_str(sku_ptr, sku_len)?;
        let delta_bytes = safe_read_bytes(delta_ptr, delta_len)?;
        let deltas: BTreeMap<String, ParameterValue> = serde_json::from_slice(delta_bytes)
            .map_err(|e| ValidationError::SliceError(format!("Invalid Delta JSON: {}", e)))?;

        for (key, value) in &deltas {
            if let ParameterValue::Number(n) = value {
                if *n < 0.0 || *n > 100000.0 {
                    return Err(ValidationError::SliceError(format!(
                        "Parameter {} out of bounds: {}",
                        key, n
                    )));
                }
            }
        }

        registry.tuning_deltas.insert(id.to_string(), deltas);
        Ok::<PkdBuffer, ValidationError>(serialize_interop_response(&InteropResponse {
            status: "OK".to_string(),
            errors: Vec::new(),
            data: None,
        }))
    });

    match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![e],
            data: None,
        }),
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError(
                "Panic in pkd_sync_state".to_string(),
            )],
            data: None,
        }),
    }
}

/// # Safety
/// Dereferences raw pointers.
#[no_mangle]
pub unsafe extern "C" fn pkd_get_ghost_metadata(
    handle: *mut PharosRegistryHandle,
    ptr: *const u8,
    len: usize,
) -> PkdBuffer {
    if handle.is_null() {
        return serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Null handle".to_string())],
            data: None,
        });
    }

    let mut handle_safe = AssertUnwindSafe(&mut *handle);
    let result = catch_unwind(move || {
        let registry = &mut **handle_safe;
        let id_str = safe_read_str(ptr, len)?;

        if let Some(metadata) = registry.cache.get(id_str) {
            let mut final_metadata = metadata.clone();
            if let Some(deltas) = registry.tuning_deltas.get(id_str) {
                for (key, value) in deltas.iter() {
                    final_metadata.parameters.insert(key.clone(), value.clone());
                }
            }
            if final_metadata.performance_metadata.procedural_lod_enabled
                && final_metadata.geometry_manifest.is_none()
            {
                final_metadata.geometry_manifest =
                    crate::geometry::procedural::ProceduralGenerator::generate_manifest(
                        &final_metadata,
                    );
            }
            let data = serde_json::to_value(&final_metadata).unwrap();
            return Ok::<PkdBuffer, ValidationError>(serialize_interop_response(
                &InteropResponse {
                    status: "OK".to_string(),
                    errors: Vec::new(),
                    data: Some(data),
                },
            ));
        }

        Err(ValidationError::GhostLinkAuthNotFound)
    });

    match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![e],
            data: None,
        }),
        Err(_) => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: vec![ValidationError::SliceError(
                "Panic in pkd_get_ghost_metadata".to_string(),
            )],
            data: None,
        }),
    }
}

/// # Safety
/// Dereferences raw pointers.
#[no_mangle]
pub unsafe extern "C" fn pkd_register_shard_fetcher(
    handle: *mut PharosRegistryHandle,
    base_url_ptr: *const u8,
    base_url_len: usize,
    manifest_ptr: *const u8,
    manifest_len: usize,
    callback: FfiFetcherCallback,
) -> i32 {
    if handle.is_null() {
        return -1;
    }
    let mut handle_safe = AssertUnwindSafe(&mut *handle);
    let result = catch_unwind(move || {
        let registry = &mut **handle_safe;
        let base_url = safe_read_str(base_url_ptr, base_url_len).map_err(|_| -2)?;
        let manifest_bytes = safe_read_bytes(manifest_ptr, manifest_len).map_err(|_| -3)?;

        #[derive(Deserialize)]
        struct ManifestDto {
            skus: HashMap<String, String>,
            shards: HashMap<String, String>,
        }
        let manifest_dto: ManifestDto = serde_json::from_slice(manifest_bytes).map_err(|_| -4)?;
        for (sku, shard_id) in manifest_dto.skus {
            registry.sku_to_shard.insert(sku, shard_id);
        }
        let fetcher = Arc::new(FfiShardFetcher { callback });
        registry.loader = Some(Arc::new(LazyShardLoader::new(
            base_url.to_string(),
            manifest_dto.shards,
            fetcher,
        )));
        Ok::<i32, i32>(0)
    });
    match result {
        Ok(Ok(code)) => code,
        _ => -5,
    }
}

/// # Safety
/// Dereferences the Provided raw pointer.
#[no_mangle]
pub unsafe extern "C" fn pkd_load_registry(
    ptr: *const u8,
    len: usize,
) -> *mut PharosRegistryHandle {
    let result = catch_unwind(|| {
        let bytes = safe_read_bytes(ptr, len)?;
        let items: HashMap<String, PharosMetadata> = serde_json::from_slice(bytes)
            .map_err(|_| ValidationError::SliceError("Invalid Registry".to_string()))?;
        let handle = PharosRegistryHandle::new();
        for (k, v) in items {
            handle.cache.insert(k, v);
        }
        Ok::<*mut PharosRegistryHandle, ValidationError>(Box::into_raw(Box::new(handle)))
    });
    match result {
        Ok(Ok(ptr)) => ptr,
        _ => std::ptr::null_mut(),
    }
}

/// # Safety
/// Frees handle memory.
#[no_mangle]
pub unsafe extern "C" fn pkd_free_registry(handle: *mut PharosRegistryHandle) {
    if !handle.is_null() {
        let _ = Box::from_raw(handle);
    }
}

/// # Safety
/// Dereferences raw pointer.
#[no_mangle]
pub unsafe extern "C" fn pkd_load_schema(ptr: *const u8, len: usize) -> *mut PharosSchema {
    let result = catch_unwind(|| {
        let bytes = safe_read_bytes(ptr, len)?;
        let schema: PharosSchema = serde_json::from_slice(bytes)
            .map_err(|_| ValidationError::SliceError("Invalid Schema".to_string()))?;
        Ok::<*mut PharosSchema, ValidationError>(Box::into_raw(Box::new(schema)))
    });
    match result {
        Ok(Ok(ptr)) => ptr,
        _ => std::ptr::null_mut(),
    }
}

/// # Safety
/// Dereferences raw pointers.
#[no_mangle]
pub unsafe extern "C" fn pkd_validate_with_handle(
    handle: *mut PharosSchema,
    ptr: *const u8,
    len: usize,
) -> PkdBuffer {
    if handle.is_null() {
        return serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError("Null handle".to_string())],
            data: None,
        });
    }
    let handle_safe = AssertUnwindSafe(&*handle);
    let result = catch_unwind(move || {
        let schema = &**handle_safe;
        let bytes = safe_read_bytes(ptr, len)?;
        let metadata: PharosMetadata = serde_json::from_slice(bytes)
            .map_err(|e| ValidationError::SliceError(format!("Invalid metadata JSON: {}", e)))?;

        let mut all_errors = Vec::new();
        if let Err(errors) = SchemaValidator::validate_metadata(schema, &metadata) {
            all_errors.extend(errors);
        }
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
        Ok::<PkdBuffer, ValidationError>(serialize_interop_response(&resp))
    });
    match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![e],
            data: None,
        }),
        _ => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: Vec::new(),
            data: None,
        }),
    }
}

/// # Safety
/// Frees schema memory.
#[no_mangle]
pub unsafe extern "C" fn pkd_free_schema(handle: *mut PharosSchema) {
    if !handle.is_null() {
        let _ = Box::from_raw(handle);
    }
}

/// # Safety
/// Dereferences raw pointers.
#[no_mangle]
pub unsafe extern "C" fn pkd_validate_metadata_json(
    schema_ptr: *const u8,
    schema_len: usize,
    metadata_ptr: *const u8,
    metadata_len: usize,
) -> PkdBuffer {
    let handle = pkd_load_schema(schema_ptr, schema_len);
    if handle.is_null() {
        return serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![ValidationError::SliceError(
                "Failed to load schema".to_string(),
            )],
            data: None,
        });
    }
    let result = pkd_validate_with_handle(handle, metadata_ptr, metadata_len);
    pkd_free_schema(handle);
    result
}

/// # Safety
/// Dereferences raw pointers.
#[no_mangle]
pub unsafe extern "C" fn pkd_verify_manifest(
    path_ptr: *const u8,
    path_len: usize,
    hash_ptr: *const u8,
    hash_len: usize,
) -> PkdBuffer {
    let result = catch_unwind(|| {
        let path_str = safe_read_str(path_ptr, path_len)?;
        let hash_str = safe_read_str(hash_ptr, hash_len)?;
        match crate::security::verify_manifest(Path::new(path_str), hash_str) {
            Ok(_) => {
                Ok::<PkdBuffer, ValidationError>(serialize_interop_response(&InteropResponse {
                    status: "OK".to_string(),
                    errors: Vec::new(),
                    data: None,
                }))
            }
            Err(e) => Err(ValidationError::SliceError(e.to_string())),
        }
    });
    match result {
        Ok(Ok(resp)) => resp,
        Ok(Err(e)) => serialize_interop_response(&InteropResponse {
            status: "ERROR".to_string(),
            errors: vec![e],
            data: None,
        }),
        _ => serialize_interop_response(&InteropResponse {
            status: "PANIC".to_string(),
            errors: Vec::new(),
            data: None,
        }),
    }
}

fn serialize_interop_response(resp: &InteropResponse) -> PkdBuffer {
    let json = serde_json::to_string(resp).unwrap_or_else(|_| "{\"status\":\"ERROR\"}".to_string());
    let bytes = json.into_bytes().into_boxed_slice();
    let len = bytes.len();
    let ptr = Box::into_raw(bytes) as *mut u8;
    PkdBuffer { ptr, len }
}

/// # Safety
/// Frees buffer memory.
#[no_mangle]
pub unsafe extern "C" fn pkd_free_buffer(buffer: PkdBuffer) {
    if !buffer.ptr.is_null() {
        let _ = Box::from_raw(std::ptr::slice_from_raw_parts_mut(buffer.ptr, buffer.len));
    }
}

/// # Safety
/// Intentionally panics.
#[no_mangle]
pub unsafe extern "C" fn pkd_trigger_panic() -> PkdBuffer {
    let _result = catch_unwind(|| {
        panic!("FFI Panic test");
    });
    serialize_interop_response(&InteropResponse {
        status: "PANIC".to_string(),
        errors: vec![ValidationError::SliceError(
            "Rust core panicked (Verified)".to_string(),
        )],
        data: None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_mock_metadata(id: &str, size_kb: u32) -> PharosMetadata {
        use crate::models::metadata::{Classification, PerformanceMetadata};
        PharosMetadata {
            metadata_id: id.to_string(),
            name: "Mock".to_string(),
            schema_version: "1.0.0".to_string(),
            classification: Classification {
                omniclass_table_23: "23-00".to_string(),
                category: "Test".to_string(),
            },
            parameters: BTreeMap::new(),
            lod_geometry_specs: BTreeMap::new(),
            geometry_manifest: None,
            performance_metadata: PerformanceMetadata {
                estimated_rfa_size_kb: size_kb,
                procedural_lod_enabled: true,
                ghost_link_active: true,
            },
        }
    }

    #[test]
    fn test_should_apply_tuning_deltas_when_pkd_sync_state_invoked() {
        let handle = PharosRegistryHandle::new();
        let metadata = create_mock_metadata("SKU-TUNED", 10);
        handle.cache.insert("SKU-TUNED".to_string(), metadata);
        let handle_ptr = Box::into_raw(Box::new(handle));
        let id = "SKU-TUNED";
        let delta = r#"{"PKD_WIDTH": 50.0}"#;
        unsafe {
            let sync_buffer = pkd_sync_state(
                handle_ptr,
                id.as_ptr(),
                id.len(),
                delta.as_ptr(),
                delta.len(),
            );
            pkd_free_buffer(sync_buffer);
            let get_buffer = pkd_get_ghost_metadata(handle_ptr, id.as_ptr(), id.len());
            let res_json: serde_json::Value =
                serde_json::from_slice(std::slice::from_raw_parts(get_buffer.ptr, get_buffer.len))
                    .unwrap();
            pkd_free_buffer(get_buffer);
            assert_eq!(
                res_json["data"]["parameters"]["PKD_WIDTH"]
                    .as_f64()
                    .unwrap(),
                50.0
            );
            let _ = Box::from_raw(handle_ptr);
        }
    }
}
