# SESSION_CONTEXT: Shard #122.3 (Revit Bridge Interpreter)

## Current Goal
Implement the C# interpreter that transforms the Rust-provided `GeometryManifest` into native Revit geometry (DirectShape).

## Strategy (Crucible Result: Option A)
- **Architecture:** `ProceduralDirectShapeInterpreter` class.
- **Seam:** Integrate into `InstantiateDraftComponentCommand` in `packages/revit-bridge/src/PharosCommands.cs`.
- **Constraint:** LOD 200 focus. Use `DirectShape` for performance and "Ghost Link" alignment.
- **Fail-Fast:** Validate manifest parameters (dimensions > 0) before calling Revit API.

## Implementation Options (Three-Option Crucible)
1. **Option A: Dedicated Interpreter Class (Winner)**: Clean separation of concerns, high maintainability, reusable.
2. **Option B: Inline Logic**: Quick but violates SRP and bloats the command class.
3. **Option C: Family Creation**: Slow, high overhead, rejected per architectural mandate.

## Verification Plan
1. **Unit Test**: Create `packages/revit-bridge/tests/InterpreterTests.cs` to verify JSON parsing and validation logic (mocking Revit DB if possible, or focusing on logic).
2. **Container Validation**: `scripts/podman-wrapper.sh pharos-bridge dotnet test`.
3. **Traceability**: Issue #122.

## Resilience Gate
Read this file and the Authoritative Seam plan at `/home/rdelgado/.gemini/tmp/pharos-kitchen-design/d9dc396e-a42b-4181-a830-1917e6f517fa/plans/issue-122-procedural-geometry.md` before resuming.
