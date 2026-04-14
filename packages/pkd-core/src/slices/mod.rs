/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Slices
 * File: mod.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Index of category-based Vertical Slices.
 * Traceability: Priority 4, Issue #30
 * ======================================================================== */

pub mod warewashing;

use crate::models::metadata::PharosMetadata;
use crate::models::types::ParameterValue;
use crate::slices::warewashing::models::{WarewashingMetadata, WarewashingParameters};
use crate::slices::warewashing::validator::WarewashingValidator;
use crate::validator::ValidationError;

pub struct SliceDispatcher;

impl SliceDispatcher {
    /// Dispatches validation to category-specific vertical slices.
    /// 
    /// Why: Centralizes the routing logic to ensure that "Specialty Equipment" 
    /// categories (like Warewashing) receive deep domain validation.
    pub fn dispatch_validation(metadata: &PharosMetadata) -> Result<(), Vec<ValidationError>> {
        let mut errors = Vec::new();

        // 1. Extract the Main Category
        let category = match metadata.parameters.get("PKD_MainCategory") {
            Some(ParameterValue::Text(cat)) => cat.as_str(),
            _ => return Ok(()), // No specific slice mapping for this category yet.
        };

        // 2. Route based on Category
        match category {
            "Dishwashers" => {
                if let Err(e) = Self::validate_warewashing(metadata) {
                    errors.extend(e);
                }
            }
            _ => {} // Fallback for categories without slices.
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }

    fn validate_warewashing(metadata: &PharosMetadata) -> Result<(), Vec<ValidationError>> {
        // Map generic PharosMetadata to WarewashingMetadata
        // Why: VSA mandate requires transforming generic data into domain-specific types.
        let warewashing = WarewashingMetadata {
            metadata_id: metadata.metadata_id.clone(),
            name: metadata.name.clone(),
            parameters: WarewashingParameters {
                manufacturer: match metadata.parameters.get("PKD_Manufacturer") {
                    Some(ParameterValue::Text(t)) => t.clone(),
                    _ => "Unknown".to_string(),
                },
                model_number: match metadata.parameters.get("PKD_ModelNumber") {
                    Some(ParameterValue::Text(t)) => t.clone(),
                    _ => "Unknown".to_string(),
                },
                voltage: match metadata.parameters.get("PKD_Voltage") {
                    Some(ParameterValue::Text(t)) => Some(t.clone()),
                    _ => None,
                },
                phase: match metadata.parameters.get("PKD_Phase") {
                    Some(ParameterValue::Number(n)) => Some(*n as i32),
                    _ => None,
                },
                wattage: match metadata.parameters.get("PKD_Wattage") {
                    Some(ParameterValue::Text(t)) => Some(t.clone()),
                    _ => None,
                },
                drain_connection: match metadata.parameters.get("PKD_DrainConnection") {
                    Some(ParameterValue::Text(t)) => Some(t.clone()),
                    _ => None,
                },
                main_category: "Dishwashers".to_string(),
            },
        };

        let mut errors = Vec::new();
        if let Err(e) = WarewashingValidator::validate_id_prefix(&warewashing) {
            errors.push(e);
        }
        if let Err(e) = WarewashingValidator::validate_category(&warewashing) {
            errors.push(e);
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

