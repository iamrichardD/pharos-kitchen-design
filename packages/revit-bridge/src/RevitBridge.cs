/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Bridge-Revit
 * File: RevitBridge.cs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Initial bridge component for Revit-to-Web interoperability.
 * Traceability: Priority 3, Issue #28
 * ======================================================================== */

using System.Runtime.InteropServices;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Pkd.RevitBridge
{
    public class RevitBridge
    {
        private const string LibName = "pkd_core";

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern IntPtr pkd_validate_metadata_json(string schemaJson, string metadataJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_string(IntPtr ptr);

        public string GetVersion() => "0.1.0";

        /// <summary>
        /// Validates metadata JSON against a schema JSON using the Pharos core (Rust).
        /// Why: Ensures Revit-side metadata compliance without duplicating complex Rust logic.
        /// This method now returns a structured JSON string.
        /// </summary>
        public string ValidateMetadata(string schemaJson, string metadataJson)
        {
            IntPtr ptr = pkd_validate_metadata_json(schemaJson, metadataJson);
            if (ptr == IntPtr.Zero) return "{\"status\":\"ERROR\",\"errors\":[{\"code\":\"SLICE_VALIDATION_ERROR\",\"details\":\"Null pointer returned from core\"}]}";

            try
            {
                return Marshal.PtrToStringUTF8(ptr) ?? string.Empty;
            }
            finally
            {
                pkd_free_string(ptr);
            }
        }
    }
}
