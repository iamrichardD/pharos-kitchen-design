/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Tests / Bridge-Revit
 * File: RevitBridgeTests.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration tests for the Revit-to-Rust Interop boundary.
 * Traceability: Issue #27, ADR 0025
 * ======================================================================== */

using Xunit;
using Pkd.RevitBridge;
using System.IO;
using System.Text.Json;

namespace Pkd.RevitBridge.Tests
{
    public class RevitBridgeTests
    {
        private readonly RevitBridge _bridge = new RevitBridge();
        private readonly string _schemaContent;

        public RevitBridgeTests()
        {
            // Resolve the live pharos-schema.json from the monorepo root
            // Why: Metadata-First Truth (Unified Source of Truth).
            string baseDir = AppContext.BaseDirectory;
            string schemaPath = Path.GetFullPath(Path.Combine(baseDir, "../../../../../../pkd-core/schema/pharos-schema.json"));
            
            if (!File.Exists(schemaPath))
            {
                throw new FileNotFoundException($"Cannot find live schema at {schemaPath}. Ensure monorepo structure is intact.");
            }
            _schemaContent = File.ReadAllText(schemaPath);
        }

        private string LoadSchema() => _schemaContent;

        /// <summary>
        /// Verifies the bridge version is correctly reported.
        /// Why: Ensures the interop assembly version is consistent with build targets.
        /// </summary>
        [Fact]
        public void test_should_return_version_when_requested()
        {
            Assert.Equal("0.1.0", _bridge.GetVersion());
        }

        /// <summary>
        /// Verifies the bridge fails gracefully when invalid JSON is provided.
        /// Why: Fail-Fast principle (Shore, 2004) - detect defects immediately at the source.
        /// </summary>
        [Fact]
        public void test_should_fail_when_invalid_json_provided()
        {
            string result = _bridge.ValidateMetadata(LoadSchema(), "invalid");
            using JsonDocument doc = JsonDocument.Parse(result);
            Assert.Equal("ERROR", doc.RootElement.GetProperty("status").GetString());
            
            var errors = doc.RootElement.GetProperty("errors");
            Assert.True(errors.GetArrayLength() > 0);
            Assert.Equal("SLICE_VALIDATION_ERROR", errors[0].GetProperty("code").GetString());
        }

        /// <summary>
        /// Verifies the UTF-8 FFI boundary using special characters.
        /// Why: Ensures high-fidelity metadata transfer as mandated by ADR 0025.
        /// </summary>
        [Fact]
        public void test_should_handle_utf8_special_characters_in_metadata()
        {
            string metadata = "{\"metadata_id\":\"PHX-DW-999\",\"name\":\"UTF8-Test-Ø-2\\\"-NPT\",\"parameters\":{}}";
            string result = _bridge.ValidateMetadata(LoadSchema(), metadata);
            
            // Should not crash and should correctly handle the Ø and " characters.
            Assert.NotNull(result);
            using JsonDocument doc = JsonDocument.Parse(result);
            Assert.NotNull(doc.RootElement.GetProperty("status").GetString());
        }

        /// <summary>
        /// Verifies the VSA Dispatcher and Warewashing slice validation.
        /// Why: Proves that the "Truth Engine" correctly routes to domain-specific logic.
        /// </summary>
        [Fact]
        public void test_should_fail_when_warewashing_id_is_invalid()
        {
            string metadata = "{" +
                "\"metadata_id\":\"INVALID-PREFIX-001\"," +
                "\"name\":\"Dishwasher\"," +
                "\"schema_version\":\"1.0.0\"," +
                "\"classification\":{\"omniclass_table_23\":\"23-33 11 11 11\",\"category\":\"Specialty Equipment\"}," +
                "\"parameters\":{" +
                    "\"PKD_MainCategory\":\"Dishwashers\"," +
                    "\"PKD_Manufacturer\":\"Pharos\"," +
                    "\"PKD_ModelNumber\":\"PHX-1\"," +
                    "\"PKD_TargetMarket\":\"Global\"," +
                    "\"PKD_Voltage\":\"208V\"," +
                    "\"PKD_Phase\":3," +
                    "\"PKD_Wattage\":\"4500W\"," +
                    "\"PKD_BTU\":\"0\"," +
                    "\"PKD_DrainConnection\":\"2\\\" NPT\"," +
                    "\"PKD_DocLinks\":[]," +
                    "\"PKD_Industry\":[\"Foodservice\"]," +
                    "\"PKD_TargetRegions\":[\"US\"]," +
                    "\"PKD_AssetViews\":{}" +
                "}," +
                "\"lod_geometry_specs\":{}," +
                "\"performance_metadata\":{\"estimated_rfa_size_kb\":34,\"procedural_lod_enabled\":true,\"ghost_link_active\":true}" +
                "}";
            
            string result = _bridge.ValidateMetadata(LoadSchema(), metadata);
            
            using JsonDocument doc = JsonDocument.Parse(result);
            Assert.Equal("ERROR", doc.RootElement.GetProperty("status").GetString());
            
            var errors = doc.RootElement.GetProperty("errors");
            Assert.True(errors.GetArrayLength() > 0);
            
            bool foundIdError = false;
            foreach (var error in errors.EnumerateArray())
            {
                if (error.GetProperty("code").GetString() == "SLICE_VALIDATION_ERROR" && 
                    error.GetProperty("details").GetString().Contains("Invalid ID prefix"))
                {
                    foundIdError = true;
                    break;
                }
            }
            Assert.True(foundIdError, "Expected 'Invalid ID prefix' error was not found in the response.");
        }

        /// <summary>
        /// Verifies that valid warewashing metadata passes validation.
        /// Why: Confirms the happy path for the first vertical slice in Project Prism.
        /// </summary>
        [Fact]
        public void test_should_pass_when_warewashing_is_valid()
        {
             string metadata = "{" +
                "\"metadata_id\":\"PHX-DW-001\"," +
                "\"name\":\"Valid Dishwasher\"," +
                "\"schema_version\":\"1.0.0\"," +
                "\"classification\":{\"omniclass_table_23\":\"23-33 11 11 11\",\"category\":\"Specialty Equipment\"}," +
                "\"parameters\":{" +
                    "\"PKD_MainCategory\":\"Dishwashers\"," +
                    "\"PKD_Manufacturer\":\"Pharos\"," +
                    "\"PKD_ModelNumber\":\"PHX-1\"," +
                    "\"PKD_TargetMarket\":\"Global\"," +
                    "\"PKD_Voltage\":\"208V\"," +
                    "\"PKD_Phase\":3," +
                    "\"PKD_Wattage\":\"4500W\"," +
                    "\"PKD_BTU\":\"0\"," +
                    "\"PKD_DrainConnection\":\"2\\\" NPT\"," +
                    "\"PKD_DocLinks\":[]," +
                    "\"PKD_Industry\":[\"Foodservice\"]," +
                    "\"PKD_TargetRegions\":[\"US\"]," +
                    "\"PKD_AssetViews\":{}" +
                "}," +
                "\"lod_geometry_specs\":{}," +
                "\"performance_metadata\":{\"estimated_rfa_size_kb\":34,\"procedural_lod_enabled\":true,\"ghost_link_active\":true}" +
                "}";
            
            string result = _bridge.ValidateMetadata(LoadSchema(), metadata);
            using JsonDocument doc = JsonDocument.Parse(result);
            Assert.Equal("OK", doc.RootElement.GetProperty("status").GetString());
            Assert.Empty(doc.RootElement.GetProperty("errors").EnumerateArray());
        }
    }
}
