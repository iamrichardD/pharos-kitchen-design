/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Bridge-Revit / Commands
 * File: PharosCommands.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Revit UI command implementations.
 * Traceability: Issue #29
 * ======================================================================== */

#if REVIT_UI
using Autodesk.Revit.UI;
using Autodesk.Revit.DB;
using Autodesk.Revit.Attributes;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System;

namespace Pkd.RevitBridge
{
    /// <summary>
    /// Revit command to instantiate a procedural "Ghost" component.
    /// Why: Enables "Ghost Link" workflows where metadata precedes final geometry.
    /// Traceability: Issue #30
    /// </summary>
    [Transaction(TransactionMode.Manual)]
    public class InstantiateDraftComponentCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            try
            {
                // 1. Fetch Metadata (Fail Fast)
                var bridge = new RevitBridge();
                var response = bridge.GetGhostMetadata("PHX-DW-001");

                if (!response.IsValid)
                {
                    TaskDialog.Show("Pharos Error", $"Failed to fetch metadata: {response.Status}");
                    return Result.Failed;
                }

                // 2. Define Location (Prototype: Origin)
                XYZ origin = new XYZ(0, 0, 0);

                // 3. Extract Metadata-Driven Geometry (LOD 100)
                double width = 2.0;
                double depth = 2.0;
                double height = 3.0;

                if (response.Data.HasValue)
                {
                    var data = response.Data.Value;
                    if (data.TryGetProperty("lod_geometry_specs", out JsonElement lodSpecs) && 
                        lodSpecs.TryGetProperty("100", out JsonElement lod100) &&
                        lod100.TryGetProperty("dimensions", out JsonElement dimensions))
                    {
                        // Mentorship: Metadata is the Source of Truth. 
                        // We extract dimensions from the schema to eliminate "Hallucination Gaps."
                        if (dimensions.TryGetProperty("width", out JsonElement w)) width = double.Parse(w.GetString() ?? "2.0");
                        if (dimensions.TryGetProperty("depth", out JsonElement d)) depth = double.Parse(d.GetString() ?? "2.0");
                        if (dimensions.TryGetProperty("height", out JsonElement h)) height = double.Parse(h.GetString() ?? "3.0");
                    }
                }

                // 4. Create Procedural Geometry
                using (Transaction trans = new Transaction(doc, "Place Pharos Draft"))
                {
                    trans.Start();

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

                    // Create DirectShape
                    DirectShape ds = DirectShape.CreateElement(doc, new ElementId(BuiltInCategory.OST_FoodServiceEquipment));
                    ds.ApplicationId = "PharosProjectPrism";
                    ds.ApplicationDataId = "PHX-DW-001";
                    ds.SetShape(new List<GeometryObject> { box });
                    ds.Name = "Pharos Ghost: PHX-DW-001";

                    // 5. Apply Standardized Parameters (PKD_*)
                    if (response.Data.HasValue)
                    {
                        var data = response.Data.Value;
                        if (data.TryGetProperty("parameters", out JsonElement parameters))
                        {
                            // Mentorship: Standardized parameter binding ensures metadata persistence 
                            // across different Revit templates and locales.
                            ApplyParameter(ds, "PKD_Manufacturer", "manufacturer", parameters);
                            ApplyParameter(ds, "PKD_ModelNumber", "model", parameters);
                        }
                    }

                    trans.Commit();
                }

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                return Result.Failed;
            }
        }

        private void ApplyParameter(Element el, string revitParamName, string pharosParamName, JsonElement parameters)
        {
            if (parameters.TryGetProperty(pharosParamName, out JsonElement prop))
            {
                Parameter p = el.LookupParameter(revitParamName);
                if (p != null && !p.IsReadOnly)
                {
                    string val = prop.ValueKind == JsonValueKind.String ? prop.GetString() : prop.GetRawText();
                    p.Set(val ?? string.Empty);
                }
            }
        }
    }

    /// <summary>
    /// Revit command to validate the currently selected elements against Pharos metadata.
    /// Why: Bridges the gap between the Revit selection model and the Rust validation core.
    /// </summary>
    [Transaction(TransactionMode.ReadOnly)]
    public class ValidateSelectionCommand : IExternalCommand
    {
        // Metadata request structure for safe serialization
        private record MetadataRequest(
            [property: JsonPropertyName("metadata_id")] string MetadataId,
            [property: JsonPropertyName("name")] string Name,
            [property: JsonPropertyName("parameters")] Dictionary<string, object> Parameters
        );

        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            // 1. Filter selection
            ICollection<ElementId> selectedIds = uiDoc.Selection.GetElementIds();
            
            if (selectedIds.Count == 0)
            {
                TaskDialog.Show("Pharos Analysis", "Please select at least one piece of equipment to validate.");
                return Result.Cancelled;
            }

            var bridge = new RevitBridge();
            int validCount = 0;
            int errorCount = 0;

            foreach (ElementId id in selectedIds)
            {
                Element element = doc.GetElement(id);
                
                // Shift-Left Security: Use JsonSerializer to prevent injection vulnerabilities
                string metadataId = element.get_Parameter(BuiltInParameter.ALL_MODEL_MARK)?.AsString() ?? "Unknown";
                var request = new MetadataRequest(metadataId, element.Name, new Dictionary<string, object>());
                string metadataJson = JsonSerializer.Serialize(request);

                // Validation Handshake (Hardened with SafeHandle)
                // Note: Using a minimal empty schema for the scaffold phase
                var response = bridge.ValidateMetadata("{}", metadataJson); 

                if (response.IsValid)
                {
                    validCount++;
                }
                else
                {
                    errorCount++;
                }
            }

            TaskDialog.Show("Pharos Analysis", 
                $"Validation Complete:\n- {validCount} Elements Valid\n- {errorCount} Elements Invalid/Unknown");

            return Result.Succeeded;
        }
    }
}
#endif
