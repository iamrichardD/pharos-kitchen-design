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
using System.Collections.Generic;

namespace Pkd.RevitBridge
{
    public class ValidationResponse
    {
        [JsonPropertyName("status")]
        public string Status { get; set; } = string.Empty;

        [JsonPropertyName("errors")]
        public List<ValidationError> Errors { get; set; } = new List<ValidationError>();

        public bool IsValid => Status == "OK";
    }

    public class ValidationError
    {
        [JsonPropertyName("code")]
        public string Code { get; set; } = string.Empty;

        [JsonPropertyName("details")]
        public JsonElement Details { get; set; }
    }

    public class RevitBridge
    {
        private const string LibName = "pkd_core";

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern IntPtr pkd_validate_metadata_json(string schemaJson, string metadataJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_string(IntPtr ptr);

        public string GetVersion() => "0.1.0";

        /// <summary>
        /// Validates metadata JSON against a schema JSON and returns a typed response.
        /// Why: Eliminates manual JSON parsing for .NET consumers and provides a type-safe API.
        /// </summary>
        public ValidationResponse ValidateMetadata(string schemaJson, string metadataJson)
        {
            string json = ValidateMetadataJson(schemaJson, metadataJson);
            try
            {
                return JsonSerializer.Deserialize<ValidationResponse>(json) ?? new ValidationResponse 
                { 
                    Status = "ERROR", 
                    Errors = new List<ValidationError> { new ValidationError { Code = "SLICE_VALIDATION_ERROR", Details = JsonSerializer.SerializeToElement("Failed to deserialize core response") } } 
                };
            }
            catch (JsonException ex)
            {
                return new ValidationResponse 
                { 
                    Status = "ERROR", 
                    Errors = new List<ValidationError> { new ValidationError { Code = "SLICE_VALIDATION_ERROR", Details = JsonSerializer.SerializeToElement(ex.Message) } } 
                };
            }
        }

        /// <summary>
        /// Validates metadata JSON against a schema JSON and returns the raw JSON string.
        /// Why: Provides a low-level bridge for environments that prefer raw JSON handling.
        /// </summary>
        public string ValidateMetadataJson(string schemaJson, string metadataJson)
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
