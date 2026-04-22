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
using Microsoft.Win32.SafeHandles;

namespace Pkd.RevitBridge
{
    /* ========================================================================
     * Project: Pharos Kitchen Design (Project Prism)
     * Component: Bridge-Revit / Memory Hardening
     * File: RevitBridge.cs
     * Author: Richard D. (https://github.com/iamrichardd)
     * License: FSL-1.1 (See LICENSE file for details)
     * Purpose: Resident core bridge with SafeHandle memory management.
     * Traceability: Issue #35, ADR-0017
     * ======================================================================== */

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

    /// <summary>
    /// Opaque handle to a PharosSchema resident in Rust memory.
    /// Why: Prevents memory leaks by ensuring pkd_free_schema is called by the GC.
    /// </summary>
    public class PharosSchemaHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        private PharosSchemaHandle() : base(true) { }

        [DllImport("pkd_core", CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_schema(IntPtr handle);

        protected override bool ReleaseHandle()
        {
            pkd_free_schema(handle);
            return true;
        }
    }

    /// <summary>
    /// SafeHandle for strings allocated by the Rust core.
    /// Why: Automates string memory cleanup via pkd_free_string.
    /// </summary>
    public class SafeStringHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        private SafeStringHandle() : base(true) { }

        [DllImport("pkd_core", CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_string(IntPtr ptr);

        protected override bool ReleaseHandle()
        {
            pkd_free_string(handle);
            return true;
        }

        public string? GetString()
        {
            return IsInvalid ? null : Marshal.PtrToStringUTF8(handle);
        }
    }

    public class RevitBridge
    {
        private const string LibName = "pkd_core";

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern PharosSchemaHandle pkd_load_schema(string schemaJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern SafeStringHandle pkd_validate_with_handle(PharosSchemaHandle handle, string metadataJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern SafeStringHandle pkd_validate_metadata_json(string schemaJson, string metadataJson);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern SafeStringHandle pkd_verify_manifest(string filePath, string expectedHash);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern SafeStringHandle pkd_trigger_panic();

        public ValidationResponse TriggerPanic()
        {
            using (var result = pkd_trigger_panic())
            {
                return ProcessRawResponse(result);
            }
        }

        public string GetVersion() => "0.2.1";

        /// <summary>
        /// Loads a schema into resident memory.
        /// Why: Allows re-use of schema across multiple validations for high performance.
        /// </summary>
        public PharosSchemaHandle LoadSchema(string schemaJson)
        {
            var handle = pkd_load_schema(schemaJson);
            if (handle.IsInvalid)
            {
                throw new InvalidOperationException("Failed to load Pharos Schema. Ensure JSON is valid and under 1MB.");
            }
            return handle;
        }

        /// <summary>
        /// Validates metadata against a resident schema handle.
        /// </summary>
        public ValidationResponse ValidateWithHandle(PharosSchemaHandle handle, string metadataJson)
        {
            if (handle == null || handle.IsInvalid)
                throw new ArgumentException("Invalid schema handle");

            using (var result = pkd_validate_with_handle(handle, metadataJson))
            {
                return ProcessRawResponse(result);
            }
        }

        public ValidationResponse ValidateMetadata(string schemaJson, string metadataJson)
        {
            using (var result = pkd_validate_metadata_json(schemaJson, metadataJson))
            {
                return ProcessRawResponse(result);
            }
        }

        /// <summary>
        /// Verifies the integrity of an artifact on disk against a SHA-256 hash.
        /// Why: Ensures the Supply Chain is sealed before ingesting BIM metadata.
        /// </summary>
        public ValidationResponse VerifyManifest(string filePath, string expectedHash)
        {
            using (var result = pkd_verify_manifest(filePath, expectedHash))
            {
                return ProcessRawResponse(result);
            }
        }

        private ValidationResponse ProcessRawResponse(SafeStringHandle handle)
        {
            if (handle.IsInvalid) 
                return CreateErrorResponse("Null pointer or invalid handle returned from core");

            try
            {
                string json = handle.GetString() ?? string.Empty;
                return JsonSerializer.Deserialize<ValidationResponse>(json) ?? CreateErrorResponse("Failed to deserialize core response");
            }
            catch (JsonException ex)
            {
                return CreateErrorResponse(ex.Message);
            }
        }

        private ValidationResponse CreateErrorResponse(string message)
        {
            return new ValidationResponse 
            { 
                Status = "ERROR", 
                Errors = new List<ValidationError> { new ValidationError { Code = "SLICE_VALIDATION_ERROR", Details = JsonSerializer.SerializeToElement(message) } } 
            };
        }
    }
}
