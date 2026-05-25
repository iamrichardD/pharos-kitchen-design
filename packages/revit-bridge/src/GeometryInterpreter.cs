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
    /// Represents the parametric dimensions for a geometry operation.
    /// Why: Structural reconciliation with Rust Core (Shard #122.1).
    /// </summary>
    public class OperationDimensions
    {
        [JsonPropertyName("width")]
        public double Width { get; set; }

        [JsonPropertyName("depth")]
        public double Depth { get; set; }

        [JsonPropertyName("height")]
        public double Height { get; set; }
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
        public OperationDimensions Dimensions { get; set; } = new OperationDimensions();

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
        // Security: Sanity bound to prevent Revit geometry engine overflows (ADR-0035/Audit)
        private const double MAX_DIMENSION = 500.0; // Feet

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
            
            // Security (Finite Guard): Check all dimension components
            ValidateFinite(op.Dimensions.Width, "width", op.Id);
            ValidateFinite(op.Dimensions.Depth, "depth", op.Id);
            ValidateFinite(op.Dimensions.Height, "height", op.Id);

            // BIM Integrity: Required dimensions must be greater than zero
            if (op.Dimensions.Width <= 0) throw new ArgumentException($"Operation '{op.Id}' width must be greater than zero.");
            if (op.Dimensions.Depth <= 0) throw new ArgumentException($"Operation '{op.Id}' depth must be greater than zero.");
            if (op.Dimensions.Height <= 0) throw new ArgumentException($"Operation '{op.Id}' height must be greater than zero.");

            // Security (Sanity Bound): Prevent oversized geometry
            if (op.Dimensions.Width > MAX_DIMENSION) throw new ArgumentException($"Operation '{op.Id}' width exceeds MAX_DIMENSION ({MAX_DIMENSION} ft).");
            if (op.Dimensions.Depth > MAX_DIMENSION) throw new ArgumentException($"Operation '{op.Id}' depth exceeds MAX_DIMENSION ({MAX_DIMENSION} ft).");
            if (op.Dimensions.Height > MAX_DIMENSION) throw new ArgumentException($"Operation '{op.Id}' height exceeds MAX_DIMENSION ({MAX_DIMENSION} ft).");

            if (op.Origin.Count < 3)
                throw new ArgumentException($"Operation '{op.Id}' origin must have 3 components [x, y, z].");

            foreach (var coord in op.Origin)
            {
                if (!double.IsFinite(coord)) throw new ArgumentException($"Operation '{op.Id}' origin coordinates must be finite.");
            }
        }

        private void ValidateFinite(double value, string name, string opId)
        {
            if (!double.IsFinite(value))
                throw new ArgumentException($"Operation '{opId}' {name} must be a finite number.");
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
            // BIM Integrity: No defaulting allowed. Use direct values from reconciled struct.
            double width = op.Dimensions.Width;
            double depth = op.Dimensions.Depth;
            double height = op.Dimensions.Height;

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
