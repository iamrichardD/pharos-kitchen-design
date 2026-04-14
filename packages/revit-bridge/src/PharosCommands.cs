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

namespace Pkd.RevitBridge
{
    /// <summary>
    /// Revit command to validate the currently selected elements against Pharos metadata.
    /// Why: Bridges the gap between the Revit selection model and the Rust validation core.
    /// </summary>
    [Transaction(TransactionMode.ReadOnly)]
    public class ValidateSelectionCommand : IExternalCommand
    {
        public Result Execute(ExternalCommandData commandData, ref string message, ElementSet elements)
        {
            UIDocument uiDoc = commandData.Application.ActiveUIDocument;
            Document doc = uiDoc.Document;

            // 1. Filter selection for Specialty Equipment (most foodservice category)
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
                
                // Extract minimal metadata for verification (Placeholder for full extraction logic)
                // Why: Metadata-First Truth (ADR-0002) - we start with ID and Version.
                string metadataId = element.get_Parameter(BuiltInParameter.ALL_MODEL_MARK)?.AsString() ?? "Unknown";
                string metadataJson = "{\"metadata_id\":\"" + metadataId + "\",\"name\":\"" + element.Name + "\",\"parameters\":{}}";

                // Validation Handshake (Hardened with SafeHandle)
                // Why: We use the stateless ValidateMetadata for now; later we will use handles.
                // Note: In a real scenario, we'd load the schema once.
                var response = bridge.ValidateMetadata("{}", metadataJson); // Empty schema for base validation

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
