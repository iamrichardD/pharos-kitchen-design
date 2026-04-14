/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Slices / Warewashing
 * File: validator.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Validation logic for Warewashing equipment integrity.
 * Traceability: Priority 4, Issue #30
 * ======================================================================== */

use super::models::WarewashingMetadata;

pub struct WarewashingValidator;

impl WarewashingValidator {
    /// Validates that the metadata belongs to the "Dishwashers" category.
    /// 
    /// Why: Vertical slice validation ensures that domain-specific constraints 
    /// (like category matching) are enforced before processing.
    pub fn validate_category(metadata: &WarewashingMetadata) -> Result<(), String> {
        if metadata.parameters.main_category != "Dishwashers" {
            return Err(format!(
                "Invalid category: expected 'Dishwashers', got '{}'",
                metadata.parameters.main_category
            ));
        }
        Ok(())
    }

    /// Validates that the metadata ID matches the warewashing prefix.
    ///
    /// Why: Standardization of metadata IDs (e.g., PHX-DW) ensures searchability 
    /// and logical grouping in the database.
    pub fn validate_id_prefix(metadata: &WarewashingMetadata) -> Result<(), String> {
        if !metadata.metadata_id.starts_with("PHX-DW") {
            return Err(format!(
                "Invalid ID prefix: expected 'PHX-DW', got '{}'",
                metadata.metadata_id
            ));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use super::super::models::WarewashingParameters;

    #[test]
    fn test_should_pass_when_category_is_dishwashers() {
        let params = WarewashingParameters {
            manufacturer: "Pharos".to_string(),
            model_number: "PHX-750".to_string(),
            voltage: Some("208V".to_string()),
            phase: Some(3),
            wattage: Some("4500W".to_string()),
            drain_connection: Some("2\" NPT".to_string()),
            main_category: "Dishwashers".to_string(),
        };
        let metadata = WarewashingMetadata {
            metadata_id: "PHX-DW-001".to_string(),
            name: "High-Efficiency Dishwasher".to_string(),
            parameters: params,
        };

        assert!(WarewashingValidator::validate_category(&metadata).is_ok());
    }

    #[test]
    fn test_should_fail_when_category_is_not_dishwashers() {
        let params = WarewashingParameters {
            manufacturer: "Pharos".to_string(),
            model_number: "PHX-750".to_string(),
            voltage: None,
            phase: None,
            wattage: None,
            drain_connection: None,
            main_category: "Refrigeration".to_string(),
        };
        let metadata = WarewashingMetadata {
            metadata_id: "PHX-DW-001".to_string(),
            name: "Wrong Category".to_string(),
            parameters: params,
        };

        assert!(WarewashingValidator::validate_category(&metadata).is_err());
    }

    #[test]
    fn test_should_pass_when_id_prefix_is_correct() {
         let params = WarewashingParameters {
            manufacturer: "Pharos".to_string(),
            model_number: "PHX-750".to_string(),
            voltage: None,
            phase: None,
            wattage: None,
            drain_connection: None,
            main_category: "Dishwashers".to_string(),
        };
        let metadata = WarewashingMetadata {
            metadata_id: "PHX-DW-001".to_string(),
            name: "Valid ID".to_string(),
            parameters: params,
        };

        assert!(WarewashingValidator::validate_id_prefix(&metadata).is_ok());
    }
}
