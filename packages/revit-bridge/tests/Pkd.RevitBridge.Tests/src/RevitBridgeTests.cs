/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Tests / Bridge-Revit
 * File: RevitBridgeTests.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Integration tests for the Revit-to-Rust Interop boundary.
 * Traceability: Issue #35, ADR-0017, ADR-0025
 * ======================================================================== */

using Xunit;
using Pkd.RevitBridge;
using System;
using System.IO;
using System.Text.Json;
using System.Linq;

namespace Pkd.RevitBridge.Tests
{
    public class RevitBridgeTests
    {
        private readonly RevitBridge _bridge = new RevitBridge();
        private readonly string _schemaContent;

        public RevitBridgeTests()
        {
            // Resolve the live pharos-schema.json from the monorepo root
            // Podman volume mount is at /app
            string schemaPath = "/app/packages/pkd-core/schema/pharos-schema.json";
            
            if (!File.Exists(schemaPath))
            {
                // Fallback for local dev
                schemaPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../packages/pkd-core/schema/pharos-schema.json"));
            }

            if (!File.Exists(schemaPath))
            {
                 throw new FileNotFoundException($"Cannot find live schema at {schemaPath}. Ensure monorepo structure is intact.");
            }
            _schemaContent = File.ReadAllText(schemaPath);
        }

        private string LoadSchema() => _schemaContent;

        [Fact]
        public void TestShould_ReturnVersion_When_Requested()
        {
            Assert.Equal("0.2.1", _bridge.GetVersion());
        }

        [Fact]
        public void TestShould_HandlePanic_When_RustCoreFails()
        {
            ValidationResponse result = _bridge.TriggerPanic();
            Assert.Equal("PANIC", result.Status);
            Assert.Contains("Rust core panicked", result.Errors[0].Details.GetString());
        }

        [Fact]
        public void TestShould_Fail_When_InvalidJsonProvided()
        {
            ValidationResponse result = _bridge.ValidateMetadata(LoadSchema(), "invalid");
            Assert.Equal("ERROR", result.Status);
            Assert.NotEmpty(result.Errors);
            Assert.Equal("SLICE_VALIDATION_ERROR", result.Errors[0].Code);
        }

        [Fact]
        public void TestShould_LoadSchema_Into_ResidentHandle()
        {
            using (var handle = _bridge.LoadSchema(LoadSchema()))
            {
                Assert.False(handle.IsInvalid);
            }
        }

        [Fact]
        public void TestShould_Validate_Using_ResidentHandle()
        {
            string metadata = "{\"metadata_id\":\"PHX-DW-001\",\"name\":\"Handle Test\",\"parameters\":{}}";
            
            using (var handle = _bridge.LoadSchema(LoadSchema()))
            {
                ValidationResponse result = _bridge.ValidateWithHandle(handle, metadata);
                Assert.NotNull(result.Status);
            }
        }

        [Fact]
        public void TestShould_FailToLoad_When_SchemaExceedsSizeLimit()
        {
            // Create a 1.1MB string to trigger Shift-Left Security limit
            string massiveSchema = new string(' ', 1024 * 1024 + 1024);
            Assert.Throws<InvalidOperationException>(() => _bridge.LoadSchema(massiveSchema));
        }

        [Fact]
        public void TestShould_FailValidation_When_MetadataExceedsSizeLimit()
        {
            string massiveMetadata = new string(' ', 1024 * 1024 + 1024);
            using (var handle = _bridge.LoadSchema(LoadSchema()))
            {
                ValidationResponse result = _bridge.ValidateWithHandle(handle, massiveMetadata);
                Assert.Equal("ERROR", result.Status);
                Assert.Contains("exceeds 1MB limit", result.Errors[0].Details.GetString());
            }
        }

        [Fact]
        public void TestShould_Pass_When_WarewashingIsValid()
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
            
            ValidationResponse result = _bridge.ValidateMetadata(LoadSchema(), metadata);
            Assert.True(result.IsValid);
        }
    }
}
