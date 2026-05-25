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
using System.Text;
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
            // Podman volume mount/WORKDIR is at /work
            string schemaPath = "/work/packages/pkd-core/schema/pharos-schema.json";
            
            if (!File.Exists(schemaPath))
            {
                // Fallback for local dev (go up 5 levels from net8.0 to packages root)
                schemaPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../pkd-core/schema/pharos-schema.json"));
            }

            if (!File.Exists(schemaPath))
            {
                 throw new FileNotFoundException($"Cannot find live schema at {schemaPath}. Ensure monorepo structure is intact.");
            }
            _schemaContent = File.ReadAllText(schemaPath);
        }

        private string LoadSchema() => _schemaContent;

        private string LoadMockRegistry()
        {
            return @"{
                ""PHX-DW-001"": {
                    ""metadata_id"": ""PHX-DW-001"",
                    ""name"": ""Hobart LXeR Dishwasher (Test)"",
                    ""schema_version"": ""1.0.0"",
                    ""classification"": {
                        ""omniclass_table_23"": ""23-75 50 11 11"",
                        ""category"": ""Warewashing""
                    },
                    ""parameters"": {
                        ""manufacturer"": ""Hobart"",
                        ""model"": ""LXeR""
                    },
                    ""lod_geometry_specs"": {
                        ""100"": {
                            ""type"": ""PROCEDURAL_BOX"",
                            ""dimensions"": {
                                ""width"": ""2.5"",
                                ""depth"": ""2.5"",
                                ""height"": ""3.5""
                            },
                            ""description"": ""LOD 100 Volumetric Placeholder""
                        }
                    },
                    ""geometry_manifest"": { ""lod"": 200, ""operations"": [] },
                    ""performance_metadata"": {
                        ""estimated_rfa_size_kb"": 450,
                        ""procedural_lod_enabled"": true,
                        ""ghost_link_active"": true
                    }
                }
            }";
        }

        [Fact]
        public void TestShould_ReturnVersion_When_Requested()
        {
            Assert.Equal("0.3.0", _bridge.GetVersion());
        }

        [Fact]
        public void Test_ShouldPassReadOnlySpanWithoutAllocation_WhenValidating()
        {
            byte[] schemaBytes = Encoding.UTF8.GetBytes(LoadSchema());
            byte[] metadataBytes = Encoding.UTF8.GetBytes("{\"metadata_id\":\"PHX-DW-001\",\"name\":\"Span Test\",\"parameters\":{}}");

            // Use Span directly to verify the overload works
            ValidationResponse result = _bridge.ValidateMetadata(schemaBytes.AsSpan(), metadataBytes.AsSpan());
            Assert.NotNull(result.Status);
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
                "\"geometry_manifest\":{\"lod\":200,\"operations\":[]}," +
                "\"performance_metadata\":{\"estimated_rfa_size_kb\":34,\"procedural_lod_enabled\":true,\"ghost_link_active\":true}" +
                "}";
            
            ValidationResponse result = _bridge.ValidateMetadata(LoadSchema(), metadata);
            Assert.True(result.IsValid);
        }

        [Fact]
        public void TestShould_ReturnGhostMetadata_When_ValidIdProvided()
        {
            using (var registry = _bridge.LoadRegistry(LoadMockRegistry()))
            {
                ValidationResponse result = _bridge.GetGhostMetadata(registry, "PHX-DW-001");
                Assert.Equal("OK", result.Status);
                Assert.True(result.Data.HasValue);
                
                var data = result.Data.Value;
                Assert.True(data.TryGetProperty("parameters", out JsonElement parameters));
                Assert.True(parameters.TryGetProperty("manufacturer", out JsonElement manufacturer));
                Assert.True(parameters.TryGetProperty("model", out JsonElement model));
                Assert.Equal("Hobart", manufacturer.GetString());
                Assert.Equal("LXeR", model.GetString());
            }
        }
    }
}
