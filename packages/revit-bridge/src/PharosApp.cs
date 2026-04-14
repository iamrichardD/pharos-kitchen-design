/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Bridge-Revit / UI
 * File: PharosApp.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Entry point for the Revit Ribbon UI.
 * Traceability: Issue #29
 * ======================================================================== */

#if REVIT_UI
using Autodesk.Revit.UI;
using Autodesk.Revit.Attributes;
using System.Reflection;
using System;

namespace Pkd.RevitBridge
{
    /// <summary>
    /// The primary Revit Add-in entry point that builds the Pharos Ribbon tab.
    /// Why: Centralizes UI management and ensures the "Truth Engine" is accessible via the Ribbon.
    /// </summary>
    [Transaction(TransactionMode.Manual)]
    [Regeneration(RegenerationOption.Manual)]
    public class PharosApp : IExternalApplication
    {
        public Result OnStartup(UIControlledApplication application)
        {
            try
            {
                // 1. Create the Pharos Tab
                string tabName = "Pharos Design";
                application.CreateRibbonTab(tabName);

                // 2. Create the "Analysis" Panel
                RibbonPanel panel = application.CreateRibbonPanel(tabName, "Truth Engine");

                // 3. Add the "Validate Selection" Button
                string assemblyPath = Assembly.GetExecutingAssembly().Location;
                
                PushButtonData validateBtnData = new PushButtonData(
                    "ValidateSelection",
                    "Validate\nSelection",
                    assemblyPath,
                    "Pkd.RevitBridge.ValidateSelectionCommand"
                );

                validateBtnData.ToolTip = "Validates the selected foodservice equipment against the Pharos schema.";
                validateBtnData.LongDescription = "Ensures that the manufacturer metadata for the selected components is accurate and up-to-date.";

                panel.AddItem(validateBtnData);

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                // Fail Fast: Report UI initialization failures immediately
                TaskDialog.Show("Pharos Error", $"Failed to initialize Pharos Ribbon: {ex.Message}");
                return Result.Failed;
            }
        }

        public Result OnShutdown(UIControlledApplication application)
        {
            return Result.Succeeded;
        }
    }
}
#endif
