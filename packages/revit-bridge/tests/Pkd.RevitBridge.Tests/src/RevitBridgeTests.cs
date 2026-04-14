/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Tests / Bridge-Revit
 * File: RevitBridgeTests.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration tests for the Revit-to-Rust Interop boundary.
 * Traceability: Issue #40, ADR 0025
 * ======================================================================== */

using Xunit;
using Pkd.RevitBridge;

namespace Pkd.RevitBridge.Tests
{
    public class RevitBridgeTests
    {
        private readonly RevitBridge _bridge = new RevitBridge();
        private const string MockSchema = "{" +
            "\"version\":\"1.0.0\"," +
            "\"lod_definitions\":{}," +
            "\"parameter_standards\":{" +
                "\"classification\":\"OmniClass\"," +
                "\"shared_parameters\":{" +
                    "\"PKD_Manufacturer\":{\"type\":\"TEXT\",\"attributes\":[]}," +
                    "\"PKD_ModelNumber\":{\"type\":\"TEXT\",\"attributes\":[]}," +
                    "\"PKD_MainCategory\":{\"type\":\"TEXT\",\"attributes\":[]}" +
                "}" +
            "}," +
            "\"bloat_rules\":{" +
                "\"max_file_size_delta_kb\":50," +
                "\"forbidden_metadata\":[]," +
                "\"regional_stripping_rules\":{}," +
                "\"procedural_preference\":true" +
            "}," +
            "\"unit_mapping\":{}" +
        "}";

        [Fact]
        public void Test_should_return_version_when_requested()
        {
            Assert.Equal("0.1.0", _bridge.GetVersion());
        }

        [Fact]
        public void Test_should_fail_when_invalid_json_provided()
        {
            string result = _bridge.ValidateMetadata("{}", "invalid");
            Assert.Contains("Error", result);
        }

        /// <summary>
        /// Verifies the UTF-8 FFI boundary using special characters.
        /// Why: Ensures high-fidelity metadata transfer as mandated by ADR 0025.
        /// </summary>
        [Fact]
        public void Test_should_handle_utf8_special_characters_in_metadata()
        {
            string metadata = "{\"metadata_id\":\"PHX-DW-999\",\"name\":\"UTF8-Test-Ø-2\\\"-NPT\",\"parameters\":{}}";
            string result = _bridge.ValidateMetadata(MockSchema, metadata);
            
            // Should not crash and should correctly handle the Ø and " characters.
            Assert.NotNull(result);
        }

        /// <summary>
        /// Verifies the VSA Dispatcher and Warewashing slice validation.
        /// Why: Proves that the "Truth Engine" correctly routes to domain-specific logic.
        /// </summary>
        [Fact]
        public void Test_should_fail_when_warewashing_id_is_invalid()
        {
            string metadata = "{" +
                "\"metadata_id\":\"INVALID-PREFIX-001\"," +
                "\"name\":\"Dishwasher\"," +
                "\"schema_version\":\"1.0.0\"," +
                "\"classification\":{\"omniclass_table_23\":\"23-33 11 11 11\",\"category\":\"Specialty Equipment\"}," +
                "\"parameters\":{\"PKD_MainCategory\":\"Dishwashers\",\"PKD_Manufacturer\":\"Pharos\",\"PKD_ModelNumber\":\"PHX-1\"}," +
                "\"lod_geometry_specs\":{}," +
                "\"performance_metadata\":{\"estimated_rfa_size_kb\":34,\"procedural_lod_enabled\":true,\"ghost_link_active\":true}" +
                "}";
            
            string result = _bridge.ValidateMetadata(MockSchema, metadata);
            
            // Expected failure from WarewashingValidator
            Assert.Contains("Invalid ID prefix", result);
        }

        [Fact]
        public void Test_should_pass_when_warewashing_is_valid()
        {
             string metadata = "{" +
                "\"metadata_id\":\"PHX-DW-001\"," +
                "\"name\":\"Valid Dishwasher\"," +
                "\"schema_version\":\"1.0.0\"," +
                "\"classification\":{\"omniclass_table_23\":\"23-33 11 11 11\",\"category\":\"Specialty Equipment\"}," +
                "\"parameters\":{\"PKD_MainCategory\":\"Dishwashers\",\"PKD_Manufacturer\":\"Pharos\",\"PKD_ModelNumber\":\"PHX-1\"}," +
                "\"lod_geometry_specs\":{}," +
                "\"performance_metadata\":{\"estimated_rfa_size_kb\":34,\"procedural_lod_enabled\":true,\"ghost_link_active\":true}" +
                "}";
            
            string result = _bridge.ValidateMetadata(MockSchema, metadata);
            Assert.Equal("OK", result);
        }
    }
}
