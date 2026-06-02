/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Research / Cloudflare Integration
 * File: docs/research/astro-cf-spike.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Evaluation of Astro 6.4 Cloudflare (cf()) helpers for Edge Identity.
 * Traceability: Issue #196, ADR-0021
 * ======================================================================== */

# Astro 6.4 Cloudflare Helper Evaluation

## Overview
Astro 6.4 introduces the `cf()` helper to streamline access to Cloudflare's Edge runtime features. This spike evaluates the feasibility of migrating the Identity UI (Login/Logout) from the `auth-bridge` worker directly into the Astro frontend (Marketing app) using SSR mode.

## Key Features in 6.4
1. **Binding Injection**: `cf()` automatically handles SESSION KV bindings and other Cloudflare resources.
2. **IP Retrieval**: `cf-connecting-ip` is now easily accessible via `locals.cfContext`.
3. **WaitUntil Support**: Support for `ctx.waitUntil` allows for non-blocking analytics or log updates during the auth handshake.

## Strategic Shift: Moving Identity UI
Currently, our `auth-bridge` (Cloudflare Worker) handles the login UI. Moving this to Astro provides:
- **Better UX**: Consistent styling with the Marketing site.
- **Unified DX**: Frontend devs can modify the auth flow without touching the worker logic.
- **Edge Performance**: SSR at the edge maintains speed while allowing for dynamic user state.

### Proposed Architecture (SSR)
- **Astro Component**: `/pages/login.astro`
- **Helper**: Uses `cf()` to interact with the existing Auth Bridge KV stores.
- **Flow**: Astro handles the rendering; the `auth-bridge` worker remains as a pure API/Proxy layer for AWS Cognito integration.

## Implementation Path
1. **Upgrade**: Ensure `@astrojs/cloudflare` is at version `>= 12.0.0` (matching Astro 6.4).
2. **Config**: Update `astro.config.mjs` to set `output: 'server'` or `'hybrid'`.
3. **Adapter Update**:
   ```javascript
   import cloudflare from '@astrojs/cloudflare';
   export default defineConfig({
     output: 'server',
     adapter: cloudflare({
       mode: 'advanced', // Required for cf() helpers
     }),
   });
   ```

## Conclusion
The `cf()` helpers significantly reduce the boilerplate required for Edge-aware applications. We should proceed with a "Hybrid" output model for the Marketing app to support the Login UI while keeping standard pages static for maximum SEO and performance.
