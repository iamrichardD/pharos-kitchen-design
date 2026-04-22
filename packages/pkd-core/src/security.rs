/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Security
 * File: security.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: High-rigor supply chain verification for Pharos artifacts.
 * Traceability: Issue #54 - Supply Chain Blind Spot
 * ======================================================================== */

use std::fs::File;
use std::io::{Read, BufReader};
use std::path::Path;
use sha2::{Sha256, Digest};
use hex;

/// Verifies the integrity of a file against an expected SHA-256 hash.
///
/// # Arguments
/// * `file_path` - The path to the file to verify.
/// * `expected_hash` - The hexadecimal string representing the expected SHA-256 hash.
///
/// # Returns
/// * `Ok(())` if verification is successful.
/// * `Err(String)` containing a descriptive error if verification fails or an I/O error occurs.
///
/// # Why:
/// To prevent 'BIM Bloat' memory spikes and Revit UI freezes during large registry ingestion,
/// we use chunked I/O via BufReader instead of loading the entire file into memory.
pub fn verify_manifest(file_path: &Path, expected_hash: &str) -> Result<(), String> {
    if !file_path.exists() {
        return Err(format!("FILE_NOT_FOUND: {:?}", file_path));
    }

    let file = File::open(file_path)
        .map_err(|e| format!("IO_ERROR: Failed to open file: {}", e))?;
    
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192]; // 8KB chunks

    loop {
        let n = reader.read(&mut buffer)
            .map_err(|e| format!("IO_ERROR: Failed to read file: {}", e))?;
        if n == 0 {
            break;
        }
        hasher.update(&buffer[..n]);
    }

    let result = hasher.finalize();
    let actual_hash = hex::encode(result);

    if actual_hash == expected_hash {
        Ok(())
    } else {
        Err(format!("HASH_MISMATCH: Expected {}, but got {}", expected_hash, actual_hash))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

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
    }

    #[test]
    fn test_should_fail_verification_when_hash_mismatch() {
        let mut file = NamedTempFile::new().unwrap();
        writeln!(file, "Tampered Data").unwrap();
        let path = file.path();

        let wrong_hash = "deadbeef12345678";
        
        let result = verify_manifest(path, wrong_hash);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("HASH_MISMATCH"));
    }

    #[test]
    fn test_should_fail_verification_when_file_not_found() {
        let path = Path::new("non_existent_file.tar.zst");
        let result = verify_manifest(path, "anyhash");
        
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("FILE_NOT_FOUND"));
    }
}
