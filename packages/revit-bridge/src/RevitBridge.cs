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

        [JsonPropertyName("data")]
        public JsonElement? Data { get; set; }

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
    /// Opaque handle to a PharosRegistry resident in Rust memory.
    /// Why: Ensures dynamic registry memory is released via pkd_free_registry.
    /// </summary>
    public class PharosRegistryHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        private PharosRegistryHandle() : base(true) { }

        [DllImport("pkd_core", CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_registry(IntPtr handle);

        protected override bool ReleaseHandle()
        {
            pkd_free_registry(handle);
            return true;
        }
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PkdBuffer
    {
        public IntPtr Ptr;
        public nuint Len;
    }

    /// <summary>
    /// SafeHandle for buffers allocated by the Rust core.
    /// Why: Automates buffer memory cleanup via pkd_free_buffer.
    /// </summary>
    public class SafePkdBufferHandle : SafeHandleZeroOrMinusOneIsInvalid
    {
        private nuint _len;

        private SafePkdBufferHandle() : base(true) { }

        [DllImport("pkd_core", CallingConvention = CallingConvention.Cdecl)]
        private static extern void pkd_free_buffer(PkdBuffer buffer);

        public static SafePkdBufferHandle FromBuffer(PkdBuffer buffer)
        {
            var h = new SafePkdBufferHandle();
            h.SetHandle(buffer.Ptr);
            h._len = buffer.Len;
            return h;
        }

        protected override bool ReleaseHandle()
        {
            pkd_free_buffer(new PkdBuffer { Ptr = handle, Len = _len });
            return true;
        }

        public string? GetString()
        {
            if (IsInvalid || _len == 0) return null;
            return Marshal.PtrToStringUTF8(handle, (int)_len);
        }
    }

    public class RevitBridge
    {
        private const string LibName = "pkd_core";

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PharosSchemaHandle pkd_load_schema(byte* ptr, nuint length);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PkdBuffer pkd_validate_with_handle(PharosSchemaHandle handle, byte* ptr, nuint length);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PkdBuffer pkd_validate_metadata_json(
            byte* schemaPtr, nuint schemaLen, 
            byte* metadataPtr, nuint metadataLen);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PkdBuffer pkd_verify_manifest(
            byte* pathPtr, nuint pathLen, 
            byte* hashPtr, nuint hashLen);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern PkdBuffer pkd_trigger_panic();

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PharosRegistryHandle pkd_load_registry(byte* ptr, nuint length);

        [DllImport(LibName, CallingConvention = CallingConvention.Cdecl)]
        private static extern unsafe PkdBuffer pkd_get_ghost_metadata(PharosRegistryHandle handle, byte* ptr, nuint length);

        /// <summary>
        /// Retrieves verified metadata for a "Ghost Link" prototype using a registry handle.
        /// Why: Enables metadata-first hydration of procedural geometry from a dynamic registry.
        /// Traceability: Issue #120
        /// </summary>
        public ValidationResponse GetGhostMetadata(PharosRegistryHandle handle, string metadataId)
        {
            if (handle == null || handle.IsInvalid)
                throw new ArgumentException("Invalid registry handle");

            byte[] idBytes = Encoding.UTF8.GetBytes(metadataId);
            unsafe
            {
                fixed (byte* ptr = idBytes)
                {
                    using (var result = SafePkdBufferHandle.FromBuffer(pkd_get_ghost_metadata(handle, ptr, (nuint)idBytes.Length)))
                    {
                        return ProcessRawResponse(result);
                    }
                }
            }
        }

        /// <summary>
        /// Loads a registry into resident memory.
        /// Why: Enables dynamic, metadata-driven equipment discovery.
        /// </summary>
        public PharosRegistryHandle LoadRegistry(string registryJson)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(registryJson);
            unsafe
            {
                fixed (byte* ptr = bytes)
                {
                    var handle = pkd_load_registry(ptr, (nuint)bytes.Length);
                    if (handle.IsInvalid)
                    {
                        throw new InvalidOperationException("Failed to load Pharos Registry. Ensure JSON is valid and under 1MB.");
                    }
                    return handle;
                }
            }
        }

        public ValidationResponse TriggerPanic()
        {
            using (var result = SafePkdBufferHandle.FromBuffer(pkd_trigger_panic()))
            {
                return ProcessRawResponse(result);
            }
        }

        public string GetVersion() => "0.3.0"; // Incremented for Issue #31 FFI Break

        /// <summary>
        /// Loads a schema into resident memory.
        /// Why: Allows re-use of schema across multiple validations for high performance.
        /// </summary>
        public PharosSchemaHandle LoadSchema(string schemaJson)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(schemaJson);
            unsafe
            {
                fixed (byte* ptr = bytes)
                {
                    var handle = pkd_load_schema(ptr, (nuint)bytes.Length);
                    if (handle.IsInvalid)
                    {
                        throw new InvalidOperationException("Failed to load Pharos Schema. Ensure JSON is valid and under 1MB.");
                    }
                    return handle;
                }
            }
        }

        /// <summary>
        /// Validates metadata against a resident schema handle.
        /// </summary>
        public ValidationResponse ValidateWithHandle(PharosSchemaHandle handle, string metadataJson)
        {
            if (handle == null || handle.IsInvalid)
                throw new ArgumentException("Invalid schema handle");

            byte[] bytes = Encoding.UTF8.GetBytes(metadataJson);
            unsafe
            {
                fixed (byte* ptr = bytes)
                {
                    using (var result = SafePkdBufferHandle.FromBuffer(pkd_validate_with_handle(handle, ptr, (nuint)bytes.Length)))
                    {
                        return ProcessRawResponse(result);
                    }
                }
            }
        }

        public ValidationResponse ValidateMetadata(string schemaJson, string metadataJson)
        {
            return ValidateMetadata(Encoding.UTF8.GetBytes(schemaJson), Encoding.UTF8.GetBytes(metadataJson));
        }

        public ValidationResponse ValidateMetadata(ReadOnlySpan<byte> schemaJson, ReadOnlySpan<byte> metadataJson)
        {
            unsafe
            {
                fixed (byte* sPtr = schemaJson)
                fixed (byte* mPtr = metadataJson)
                {
                    using (var result = SafePkdBufferHandle.FromBuffer(pkd_validate_metadata_json(sPtr, (nuint)schemaJson.Length, mPtr, (nuint)metadataJson.Length)))
                    {
                        return ProcessRawResponse(result);
                    }
                }
            }
        }

        /// <summary>
        /// Verifies the integrity of an artifact on disk against a SHA-256 hash.
        /// Why: Ensures the Supply Chain is sealed before ingesting BIM metadata.
        /// </summary>
        public ValidationResponse VerifyManifest(string filePath, string expectedHash)
        {
            return VerifyManifest(Encoding.UTF8.GetBytes(filePath), Encoding.UTF8.GetBytes(expectedHash));
        }

        public ValidationResponse VerifyManifest(ReadOnlySpan<byte> filePath, ReadOnlySpan<byte> expectedHash)
        {
            unsafe
            {
                fixed (byte* pPtr = filePath)
                fixed (byte* hPtr = expectedHash)
                {
                    using (var result = SafePkdBufferHandle.FromBuffer(pkd_verify_manifest(pPtr, (nuint)filePath.Length, hPtr, (nuint)expectedHash.Length)))
                    {
                        return ProcessRawResponse(result);
                    }
                }
            }
        }

        private ValidationResponse ProcessRawResponse(SafePkdBufferHandle handle)
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
