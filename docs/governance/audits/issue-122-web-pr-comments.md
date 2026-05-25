# PR #157 Mentorship Comments: Shard #122.4 (Web Interpreter)

## 📁 `apps/marketing/src/components/ThreeJsInterpreter.tsx`

### 💬 Comment on Line 13: `import * as THREE from 'three';`
> **Pharos Mentor:** Why the wholesale import? In a project where we fight for every byte of the bundle, importing the entire `three` namespace is sloppy. Destructure only what you need (e.g., `BoxGeometry`, `MeshStandardMaterial`). Even with tree-shaking, this signals a lack of precision.

### 💬 Comment on Lines 49-53: `position={[x + width / 2, z + height / 2, y + depth / 2]}`
> **Pharos Mentor:** This "magic swap" is a ticking time bomb. You are assuming the source BIM data is always Z-Up and aligns with your hardcoded assumptions. Where is the `CoordinateTransformer`? If we ingest a Y-Up source tomorrow, this entire component breaks. Architecture is about handling change, not hardcoding coincidences.

### 💬 Comment on Line 66: `export const ThreeJsInterpreter: React.FC<Props> = ({ manifest, height = '400px' }) => {`
> **Pharos Mentor:** I see no validation here. You are blindly mapping over `manifest.operations`. What happens if `manifest` is an empty object? What if `dimensions` are missing? A "Defensive Engineer" would use a Zod schema to validate the contract at the boundary. Don't let malformed data poison our React tree.

### 💬 Comment on Line 110: `Canvas shadows camera={{ position: [width_center(manifest) * 2, ...`
> **Pharos Mentor:** Using `width_center` as a fallback for the camera position is naive. If the manifest has multiple operations at vastly different origins, your "center" is just the first item. Use a proper `BoundingBox` calculation for the entire scene if `Bounds` isn't ready.

## 📁 `apps/marketing/src/pages/demo-geometry.astro`

### 💬 Comment on Line 12: `const mockManifest = { ...`
> **Pharos Mentor:** Hardcoded mock data in a page component? This should be a fixture in a `__tests__` or `fixtures` directory. By embedding it here, you're making this demo harder to reuse for regression testing.

### 💬 Comment on Line 51: `ThreeJsInterpreter client:only="react" manifest={mockManifest as any} ...`
> **Pharos Mentor:** The use of `as any` is an admission of failure. If our types are correct in `@pkd/protocol`, this cast wouldn't be necessary. Fix the root cause (the missing shared types), don't paper over it with `any`.

---
**Summary Verdict:** This PR shows promise but lacks the "Crucible Hardening" we expect. Remediate the coordinate mapping and type safety before this touches `main`.
