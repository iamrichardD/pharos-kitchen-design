/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Shared Library
 * File: packages/pharos-protocol/src/format.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Standardized human-readable formatting for protocol values.
 * Traceability: ADR 0024
 * ======================================================================== */

use chrono::DateTime;

/// Scaling factors for data units.
const KB: f64 = 1024.0;
const MB: f64 = 1024.0 * 1024.0;
const GB: f64 = 1024.0 * 1024.0 * 1024.0;

/// Formats raw protocol values into human-readable strings based on key hints.
/// 
/// Why: To provide a consistent UX across all Pharos CLI tools (pkd, mdb, ph).
pub fn format_human(key: &str, value: &str) -> String {
    let lower_key = key.to_lowercase();
    
    // 1. Memory/Storage conversions
    if lower_key.ends_with("_kb") {
        if let Ok(kb) = value.parse::<f64>() {
            return format_bytes(kb * KB);
        }
    } else if lower_key.ends_with("_bytes") {
        if let Ok(bytes) = value.parse::<f64>() {
            return format_bytes(bytes);
        }
    } else if lower_key.ends_with("_mb") {
        if let Ok(mb) = value.parse::<f64>() {
            return format_bytes(mb * MB);
        }
    }

    // 2. Timestamp conversions
    if lower_key.ends_with("_at") || lower_key == "created" || lower_key == "updated" {
        if let Ok(dt) = DateTime::parse_from_rfc3339(value) {
            return dt.format("%Y-%m-%d %H:%M:%S").to_string();
        }
    }

    value.to_string()
}

/// Helper to scale bytes to human-readable units (B, KB, MB, GB, TB).
pub fn format_bytes(bytes: f64) -> String {
    let units = ["B", "KB", "MB", "GB", "TB", "PB"];
    let mut size = bytes;
    let mut unit_idx = 0;

    while size >= 1024.0 && unit_idx < units.len() - 1 {
        size /= 1024.0;
        unit_idx += 1;
    }

    if unit_idx == 0 {
        format!("{} {}", size, units[unit_idx])
    } else {
        format!("{:.1} {}", size, units[unit_idx])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_should_format_bytes_to_mb() {
        assert_eq!(format_bytes(1048576.0), "1.0 MB");
    }

    #[test]
    fn test_should_format_kb_hint_to_gb() {
        let result = format_human("memory_kb", "16777216");
        assert_eq!(result, "16.0 GB");
    }

    #[test]
    fn test_should_format_iso_timestamp() {
        let result = format_human("created_at", "2026-04-08T12:00:00Z");
        assert_eq!(result, "2026-04-08 12:00:00");
    }
}
