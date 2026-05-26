/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Security
 * File: security.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-rigor supply chain verification for Pharos artifacts.
 * Traceability: Issue #54 - Supply Chain Blind Spot
 * ======================================================================== */

use hex;
use serde_json;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::{read_dir, File};
use std::io::{BufReader, Read};
use std::path::Path;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SecurityError {
    #[error("FILE_NOT_FOUND: {0}")]
    FileNotFound(String),
    #[error("IO_ERROR: {0}")]
    IoError(String),
    #[error("HASH_MISMATCH: Expected {expected}, but got {actual}")]
    HashMismatch { expected: String, actual: String },
    #[error("MANIFEST_ERROR: {0}")]
    ManifestError(String),
}

/// A flat map of artifact filenames to their SHA-256 hashes.
/// Why: Ergonomic for both Rust and TypeScript consumers (ADR-0029).
pub type Manifest = HashMap<String, String>;

/// Verifies the integrity of a file against an expected SHA-256 hash.
pub fn verify_manifest(file_path: &Path, expected_hash: &str) -> Result<(), SecurityError> {
    if !file_path.exists() {
        return Err(SecurityError::FileNotFound(
            file_path.to_string_lossy().into_owned(),
        ));
    }

    let actual_hash = compute_hash(file_path)?;

    // Handle both raw hex and sha256: prefixed hashes (ADR-0029)
    let normalized_expected = expected_hash
        .strip_prefix("sha256:")
        .unwrap_or(expected_hash);

    if actual_hash == normalized_expected {
        Ok(())
    } else {
        Err(SecurityError::HashMismatch {
            expected: normalized_expected.to_string(),
            actual: actual_hash,
        })
    }
}

/// Scans a directory for .wasm files and generates a Manifest.
/// Why: Provides a single source of truth for the Promotion stage (ADR-0029).
pub fn generate_manifest_from_dir(dir: &Path) -> Result<Manifest, SecurityError> {
    let mut manifest = HashMap::new();

    let entries = read_dir(dir).map_err(|e| {
        SecurityError::IoError(format!("Failed to read directory {}: {}", dir.display(), e))
    })?;

    for entry in entries {
        let entry =
            entry.map_err(|e| SecurityError::IoError(format!("Failed to read entry: {}", e)))?;
        let path = entry.path();

        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("wasm") {
            let filename = path.file_name().unwrap().to_string_lossy().to_string();
            let hash = compute_hash(&path)?;
            manifest.insert(filename, format!("sha256:{}", hash));
        }
    }

    if manifest.is_empty() {
        return Err(SecurityError::ManifestError(format!(
            "No .wasm files found in {}",
            dir.display()
        )));
    }

    Ok(manifest)
}

/// Verifies all files listed in a manifest.json file within the same directory.
pub fn verify_manifest_json(dir: &Path) -> Result<(), SecurityError> {
    let manifest_path = dir.join("manifest.json");
    if !manifest_path.exists() {
        return Err(SecurityError::FileNotFound(
            manifest_path.to_string_lossy().into_owned(),
        ));
    }

    let file = File::open(&manifest_path)
        .map_err(|e| SecurityError::IoError(format!("Failed to open manifest: {}", e)))?;

    let manifest: Manifest = serde_json::from_reader(file)
        .map_err(|e| SecurityError::ManifestError(format!("Failed to parse manifest: {}", e)))?;

    for (filename, expected_hash) in manifest {
        let file_path = dir.join(&filename);
        verify_manifest(&file_path, &expected_hash)?;
    }

    Ok(())
}

/// Verifies the integrity of raw bytes against an expected SHA-256 hash.
pub fn verify_bytes(bytes: &[u8], expected_hash: &str) -> Result<(), SecurityError> {
    let mut hasher = Sha256::new();
    hasher.update(bytes);
    let actual_hash = hex::encode(hasher.finalize());

    let normalized_expected = expected_hash
        .strip_prefix("sha256:")
        .unwrap_or(expected_hash);

    if actual_hash == normalized_expected {
        Ok(())
    } else {
        Err(SecurityError::HashMismatch {
            expected: normalized_expected.to_string(),
            actual: actual_hash,
        })
    }
}

/// Computes the SHA-256 hash of a file using chunked I/O.
pub fn compute_hash(file_path: &Path) -> Result<String, SecurityError> {
    if !file_path.exists() {
        return Err(SecurityError::FileNotFound(
            file_path.to_string_lossy().into_owned(),
        ));
    }

    let file = File::open(file_path)
        .map_err(|e| SecurityError::IoError(format!("Failed to open file: {}", e)))?;

    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let n = reader
            .read(&mut buffer)
            .map_err(|e| SecurityError::IoError(format!("Failed to read file: {}", e)))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    Ok(hex::encode(hasher.finalize()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{tempdir, NamedTempFile};

    #[test]
    fn test_should_verify_successfully_when_hash_matches() {
        let mut file = NamedTempFile::new().unwrap();
        let content = "Pharos Kitchen Design - Integrity Test";
        write!(file, "{}", content).unwrap();
        let path = file.path();

        let mut hasher = Sha256::new();
        hasher.update(content.as_bytes());
        let expected = hex::encode(hasher.finalize());

        assert!(verify_manifest(path, &expected).is_ok());
        assert!(verify_manifest(path, &format!("sha256:{}", expected)).is_ok());
    }

    #[test]
    fn test_should_verify_bytes_successfully_when_hash_matches() {
        let content = "Pharos Kitchen Design - Byte Integrity Test";
        let bytes = content.as_bytes();

        let mut hasher = Sha256::new();
        hasher.update(bytes);
        let expected = hex::encode(hasher.finalize());

        assert!(verify_bytes(bytes, &expected).is_ok());
        assert!(verify_bytes(bytes, &format!("sha256:{}", expected)).is_ok());
    }

    #[test]
    fn test_should_generate_valid_manifest_from_directory() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.wasm");
        let mut file = File::create(&file_path).unwrap();
        let content = "wasm-binary-content";
        file.write_all(content.as_bytes()).unwrap();

        let manifest = generate_manifest_from_dir(dir.path()).unwrap();
        assert_eq!(manifest.len(), 1);
        assert!(manifest.contains_key("test.wasm"));

        let expected_hash = compute_hash(&file_path).unwrap();
        assert_eq!(manifest["test.wasm"], format!("sha256:{}", expected_hash));
    }

    #[test]
    fn test_should_verify_manifest_json_successfully() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.wasm");
        let mut file = File::create(&file_path).unwrap();
        let content = "wasm-binary-content";
        file.write_all(content.as_bytes()).unwrap();

        let hash = compute_hash(&file_path).unwrap();
        let mut manifest = HashMap::new();
        manifest.insert("test.wasm".to_string(), format!("sha256:{}", hash));

        let manifest_path = dir.path().join("manifest.json");
        let manifest_file = File::create(manifest_path).unwrap();
        serde_json::to_writer(manifest_file, &manifest).unwrap();

        assert!(verify_manifest_json(dir.path()).is_ok());
    }

    #[test]
    fn test_should_fail_verification_when_hash_mismatch() {
        let mut file = NamedTempFile::new().unwrap();
        write!(file, "Tampered Data").unwrap();
        let path = file.path();

        let wrong_hash = "deadbeef12345678";

        let result = verify_manifest(path, wrong_hash);
        assert!(result.is_err());
        match result.unwrap_err() {
            SecurityError::HashMismatch { .. } => (),
            _ => panic!("Expected HashMismatch error"),
        }
    }

    #[test]
    fn test_should_fail_byte_verification_when_hash_mismatch() {
        let bytes = b"Original Content";
        let wrong_hash = "deadbeef12345678";

        let result = verify_bytes(bytes, wrong_hash);
        assert!(result.is_err());
        match result.unwrap_err() {
            SecurityError::HashMismatch { .. } => (),
            _ => panic!("Expected HashMismatch error"),
        }
    }
}
