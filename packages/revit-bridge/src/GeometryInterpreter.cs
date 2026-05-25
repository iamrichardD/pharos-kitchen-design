/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Bridge-Revit / Procedural Geometry
 * File: GeometryInterpreter.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Interprets procedural geometry manifests into Revit geometry.
 * Traceability: Issue #122
 * ======================================================================== */

using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Linq;

#if REVIT_UI
using Autodesk.Revit.DB;
#endif

namespace Pkd.RevitBridge
{
    /// <summary>
    /// Represents the geometry manifest provided by the Pharos Rust core.
    /// Why: Decouples the JSON schema from the Revit-specific geometry logic.
    /// </summary>
    public class GeometryManifest
    {
        [JsonPropertyName("lod")]
        public int Lod { get; set; }

        [JsonPropertyName("operations")]
        public List<GeometryOperation> Operations { get; set; } = new List<GeometryOperation>();
    }

    /// <summary>
    /// Represents a single parametric geometry operation (e.g., Extrusion).
    /// </summary>
    public class GeometryOperation
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty; // e.g., "Extrusion"

        [JsonPropertyName("profile")]
        public string Profile { get; set; } = string.Empty; // e.g., "Rectangle"

        [JsonPropertyName("dimensions")]
        public Dictionary<string, double> Dimensions { get; set; } = new Dictionary<string, double>();

        [JsonPropertyName("origin")]
        public List<double> Origin { get; set; } = new List<double> { 0.0, 0.0, 0.0 };

        [JsonPropertyName("material_class")]
        public string MaterialClass { get; set; } = "Stainless_Steel";
    }

    /// <summary>
    /// Interpreter for transforming a GeometryManifest into Revit DirectShape elements.
    /// Why: Implements Shard #122.3 to bring procedural geometry to life in Revit.
    /// </summary>
    public class ProceduralDirectShapeInterpreter
    {
        /// <summary>
        /// Parses the geometry manifest from a JSON element with Fail-Fast validation.
        /// Why: Ensures the manifest is valid before any Revit transactions are started.
        /// </summary>
        public GeometryManifest ParseManifest(JsonElement manifestElement)
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var manifest = JsonSerializer.Deserialize<GeometryManifest>(manifestElement.GetRawText(), options);

            if (manifest == null)
                throw new ArgumentException("Invalid GeometryManifest: Deserialization failed.");

            // Fail-Fast: Validate operations
            foreach (var op in manifest.Operations)
            {
                ValidateOperation(op);
            }

            return manifest;
        }

        private void ValidateOperation(GeometryOperation op)
        {
            if (string.IsNullOrEmpty(op.Id)) throw new ArgumentException("Operation missing 'id'");
            if (string.IsNullOrEmpty(op.Type)) throw new ArgumentException($"Operation '{op.Id}' missing 'type'");
            
            // Revit-specific constraint: dimensions must be positive
            foreach (var dim in op.Dimensions)
            {
                if (dim.Value <= 0)
                    throw new ArgumentException($"Operation '{op.Id}' dimension '{dim.Key}' must be greater than zero.");
            }

            if (op.Origin.Count < 3)
                throw new ArgumentException($"Operation '{op.Id}' origin must have 3 components [x, y, z].");
        }

#if REVIT_UI
        /// <summary>
        /// Generates Revit DirectShape elements from the manifest.
        /// Why: Uses DirectShape for high performance LOD 200 "Ghost Links."
        /// </summary>
        public void Interpret(Document doc, GeometryManifest manifest, string applicationId = "PharosProjectPrism")
        {
            foreach (var op in manifest.Operations)
            {
                try 
                {
                    if (op.Type == "Extrusion" && op.Profile == "Rectangle")
                    {
                        CreateExtrusionRectangle(doc, op, applicationId);
                    }
                    // Future expansion: Support for Cylinders, Revolves, etc.
                }
                catch (Exception ex)
                {
                    // Mentorship: Graceful failure for individual operations ensures the entire 
                    // manifest doesn't fail due to one malformed part.
                    Console.WriteLine($"Failed to interpret operation {op.Id}: {ex.Message}");
                }
            }
        }

        private void CreateExtrusionRectangle(Document doc, GeometryOperation op, string applicationId)
        {
            double width = 1.0;
            double depth = 1.0;
            double height = 1.0;

            if (op.Dimensions.TryGetValue("width", out double w)) width = w;
            if (op.Dimensions.TryGetValue("depth", out double d)) depth = d;
            if (op.Dimensions.TryGetValue("height", out double h)) height = h;

            XYZ origin = new XYZ(op.Origin[0], op.Origin[1], op.Origin[2]);

            List<Curve> profile = new List<Curve>();
            profile.Add(Line.CreateBound(origin, origin + new XYZ(width, 0, 0)));
            profile.Add(Line.CreateBound(origin + new XYZ(width, 0, 0), origin + new XYZ(width, depth, 0)));
            profile.Add(Line.CreateBound(origin + new XYZ(width, depth, 0), origin + new XYZ(0, depth, 0)));
            profile.Add(Line.CreateBound(origin + new XYZ(0, depth, 0), origin));

            CurveLoop curveLoop = CurveLoop.Create(profile);
            Solid box = GeometryCreationUtilities.CreateExtrusionGeometry(
                new List<CurveLoop> { curveLoop }, 
                XYZ.BasisZ, 
                height
            );

            // Using FoodServiceEquipment category for Ghost Links
            ElementId categoryId = new ElementId(BuiltInCategory.OST_FoodServiceEquipment);
            
            DirectShape ds = DirectShape.CreateElement(doc, categoryId);
            ds.ApplicationId = applicationId;
            ds.ApplicationDataId = op.Id;
            ds.SetShape(new List<GeometryObject> { box });
            ds.Name = $"Pharos: {op.Id}";
        }
#endif
    }
}
