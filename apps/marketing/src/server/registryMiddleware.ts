/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site / Dev Server
 * File: src/server/registryMiddleware.ts
 * Author: Junie AI (https://github.com/jetbrains/junie)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Vite plugin middleware to serve local disk registry indices
 *          during development, with strict path traversal guards.
 * Traceability: Issue #277, ADR 0048
 * ======================================================================== */

import path from 'node:path';
import fs from 'node:fs';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const ROUTE_PREFIX = '/pharos-kitchen-design/registry/';

/**
 * Resolves the registry root directory from environment or default fallback.
 * Uses `PHAROS_REGISTRY_TARGET` if set, otherwise resolves `.artifacts/registry/`
 * relative to the provided workspace root.
 */
export function resolveRegistryRoot(workspaceRoot: string): string {
  const envTarget = process.env.PHAROS_REGISTRY_TARGET;
  if (envTarget) {
    return path.resolve(envTarget);
  }
  return path.resolve(workspaceRoot, '.artifacts', 'registry');
}

/**
 * Validates that a resolved file path is safely contained within the registry
 * root boundary. Returns `null` if the path is safe, or an error reason string
 * if a traversal attempt is detected.
 */
export function validatePathBoundary(
  requestedPath: string,
  registryRoot: string,
): string | null {
  if (requestedPath.includes('\0')) {
    return 'null byte injection detected';
  }

  const resolved = path.resolve(registryRoot, requestedPath);

  if (!resolved.startsWith(registryRoot + path.sep) && resolved !== registryRoot) {
    return 'path traversal detected';
  }

  // Guard against symlink traversal: resolve the real path and re-check boundary
  if (fs.existsSync(resolved)) {
    const realResolved = fs.realpathSync(resolved);
    const realRoot = fs.realpathSync(registryRoot);
    if (!realResolved.startsWith(realRoot + path.sep) && realResolved !== realRoot) {
      return 'symlink traversal detected';
    }
  }

  return null;
}

/**
 * Core request handler for registry file serving. Exported separately
 * for direct unit testing without needing a full Vite server.
 */
export function handleRegistryRequest(
  url: string,
  registryRoot: string,
  res: ServerResponse,
): boolean {
  // Strip query parameters before matching the route prefix
  const pathname = url.split('?')[0];

  if (!pathname.startsWith(ROUTE_PREFIX)) {
    return false;
  }

  let relativePath: string;
  try {
    relativePath = decodeURIComponent(pathname.slice(ROUTE_PREFIX.length));
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request: malformed URI');
    return true;
  }

  const violation = validatePathBoundary(relativePath, registryRoot);
  if (violation) {
    console.warn(`[pharos-registry] 🚫 Blocked request: ${violation} (${relativePath})`);
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end(`403 Forbidden: ${violation}`);
    return true;
  }

  const resolvedFile = path.resolve(registryRoot, relativePath);

  if (!fs.existsSync(resolvedFile) || !fs.statSync(resolvedFile).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return true;
  }

  try {
    const content = fs.readFileSync(resolvedFile);
    res.writeHead(200, {
      'Content-Type': 'application/octet-stream',
      'Content-Length': content.length,
    });
    res.end(content);
  } catch (err) {
    console.error(`[pharos-registry] ❌ Failed to read file: ${resolvedFile}`, err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('500 Internal Server Error');
  }

  return true;
}

/**
 * Creates a Vite plugin that serves local registry `.bin` files during
 * development. Intercepts requests under `/pharos-kitchen-design/registry/`
 * and resolves them against the local registry root with strict path guards.
 */
export function pharosRegistryPlugin(workspaceRoot: string): Plugin {
  const registryRoot = resolveRegistryRoot(workspaceRoot);

  return {
    name: 'pharos-local-registry',
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        const handled = handleRegistryRequest(url, registryRoot, res);
        if (!handled) {
          next();
        }
      });
    },
  };
}
