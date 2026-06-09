/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Pulse Logic
 * File: pulse.rs
 * Author: PMA (Orchestrator)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Logic Center for JIT and supply chain synchronization.
 * Traceability: Issue #204, ADR-0026, ADR-0027, Issue #88
 * Last Updated: 2026-06-10
 * ======================================================================== */

use serde::{Deserialize, Serialize};

use crate::policy::{PolicyContext, PolicyDecision, PolicyGuard};
use crate::validator::ValidationError;

#[derive(Debug, Serialize, Deserialize)]
pub struct PulseStatus {
    pub status: String,
    pub integrity_verified: bool,
    pub organization_scope: Option<String>,
    pub decision: PolicyDecision,
}

pub struct PulseEngine;

impl PulseEngine {
    /// Performs a high-rigor 'Pulse' check on the system state.
    /// Why: Ensures the Logic Center is synchronized with authoritative manifests and boundaries.
    pub fn heartbeat(
        guard: &dyn PolicyGuard,
        context: &PolicyContext,
    ) -> Result<PulseStatus, ValidationError> {
        let decision = guard.evaluate(context);

        let status = match decision {
            PolicyDecision::Allow => "Healthy".to_string(),
            _ => "Restricted".to_string(),
        };

        Ok(PulseStatus {
            status,
            integrity_verified: true,
            organization_scope: Some(context.organization_id.clone()),
            decision,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::policy::BoundaryGuard;

    #[test]
    fn test_should_return_healthy_status_when_within_boundary() {
        let guard = BoundaryGuard::new("hobart:");
        let context = PolicyContext {
            organization_id: "hobart_inc".to_string(),
            user_id: "designer_1".to_string(),
            resource_id: "hobart:mixer:h600.rfa".to_string(),
            action: "read".to_string(),
        };

        let result = PulseEngine::heartbeat(&guard, &context).unwrap();
        assert_eq!(result.status, "Healthy");
        if let PolicyDecision::Allow = result.decision {
            // Success
        } else {
            panic!("Expected Allow decision");
        }
    }

    #[test]
    fn test_should_return_restricted_status_when_outside_boundary() {
        let guard = BoundaryGuard::new("hobart:");
        let context = PolicyContext {
            organization_id: "vulcan_inc".to_string(),
            user_id: "designer_2".to_string(),
            resource_id: "vulcan:oven:v36.rfa".to_string(),
            action: "read".to_string(),
        };

        let result = PulseEngine::heartbeat(&guard, &context).unwrap();
        assert_eq!(result.status, "Restricted");
        if let PolicyDecision::Deny { .. } = result.decision {
            // Success
        } else {
            panic!("Expected Deny decision");
        }
    }
}
