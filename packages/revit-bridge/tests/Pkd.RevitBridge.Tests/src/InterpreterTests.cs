/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Tests / Bridge-Revit
 * File: InterpreterTests.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unit tests for the Procedural Geometry Interpreter.
 * Traceability: Issue #122
 * ======================================================================== */

using Xunit;
using Pkd.RevitBridge;
using System;
using System.Text.Json;

namespace Pkd.RevitBridge.Tests
{
    public class InterpreterTests
    {
        private readonly ProceduralDirectShapeInterpreter _interpreter = new ProceduralDirectShapeInterpreter();

        [Fact]
        public void TestShould_ParseValidManifest_When_CorrectJsonProvided()
        {
            string json = @"{
                ""lod"": 200,
                ""operations"": [
                    {
                        ""id"": ""part_1"",
                        ""type"": ""Extrusion"",
                        ""profile"": ""Rectangle"",
                        ""dimensions"": { ""width"": 10.0, ""depth"": 5.0, ""height"": 2.0 },
                        ""origin"": [0.0, 0.0, 0.0]
                    }
                ]
            }";

            using (JsonDocument doc = JsonDocument.Parse(json))
            {
                var manifest = _interpreter.ParseManifest(doc.RootElement);
                Assert.Equal(200, manifest.Lod);
                Assert.Single(manifest.Operations);
                Assert.Equal("part_1", manifest.Operations[0].Id);
                Assert.Equal(10.0, manifest.Operations[0].Dimensions.Width);
            }
        }

        [Fact]
        public void TestShould_ThrowException_When_DimensionIsZeroOrNegative()
        {
            string json = @"{
                ""lod"": 200,
                ""operations"": [
                    {
                        ""id"": ""fail_part"",
                        ""type"": ""Extrusion"",
                        ""profile"": ""Rectangle"",
                        ""dimensions"": { ""width"": -1.0, ""depth"": 5.0, ""height"": 2.0 },
                        ""origin"": [0.0, 0.0, 0.0]
                    }
                ]
            }";

            using (JsonDocument doc = JsonDocument.Parse(json))
            {
                var ex = Assert.Throws<ArgumentException>(() => _interpreter.ParseManifest(doc.RootElement));
                Assert.Contains("must be greater than zero", ex.Message);
            }
        }

        [Fact]
        public void TestShould_ThrowException_When_DimensionExceedsSanityBound()
        {
            string json = @"{
                ""lod"": 200,
                ""operations"": [
                    {
                        ""id"": ""oversized_part"",
                        ""type"": ""Extrusion"",
                        ""profile"": ""Rectangle"",
                        ""dimensions"": { ""width"": 501.0, ""depth"": 5.0, ""height"": 2.0 },
                        ""origin"": [0.0, 0.0, 0.0]
                    }
                ]
            }";

            using (JsonDocument doc = JsonDocument.Parse(json))
            {
                var ex = Assert.Throws<ArgumentException>(() => _interpreter.ParseManifest(doc.RootElement));
                Assert.Contains("exceeds MAX_DIMENSION", ex.Message);
            }
        }

        [Fact]
        public void TestShould_ThrowException_When_DimensionIsNotFinite()
        {
            string json = @"{
                ""lod"": 200,
                ""operations"": [
                    {
                        ""id"": ""nan_part"",
                        ""type"": ""Extrusion"",
                        ""profile"": ""Rectangle"",
                        ""dimensions"": { ""width"": ""NaN"", ""depth"": 5.0, ""height"": 2.0 },
                        ""origin"": [0.0, 0.0, 0.0]
                    }
                ]
            }";

            // Note: System.Text.Json might fail at parsing "NaN" to double unless configured, 
            // but our interpreter check double.IsFinite is the second line of defense.
            Assert.ThrowsAny<Exception>(() => {
                using (JsonDocument doc = JsonDocument.Parse(json))
                {
                    _interpreter.ParseManifest(doc.RootElement);
                }
            });
        }

        [Fact]
        public void TestShould_ThrowException_When_OriginIsMalformed()
        {
            string json = @"{
                ""lod"": 200,
                ""operations"": [
                    {
                        ""id"": ""fail_origin"",
                        ""type"": ""Extrusion"",
                        ""profile"": ""Rectangle"",
                        ""dimensions"": { ""width"": 1.0, ""depth"": 1.0, ""height"": 1.0 },
                        ""origin"": [0.0, 0.0]
                    }
                ]
            }";

            using (JsonDocument doc = JsonDocument.Parse(json))
            {
                var ex = Assert.Throws<ArgumentException>(() => _interpreter.ParseManifest(doc.RootElement));
                Assert.Contains("origin must have 3 components", ex.Message);
            }
        }
    }
}
