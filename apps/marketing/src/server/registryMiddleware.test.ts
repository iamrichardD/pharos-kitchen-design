/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing Site / Dev Server
 * File: src/server/registryMiddleware.test.ts
 * Author: Junie AI (https://github.com/jetbrains/junie)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: TDD verification of registry middleware path traversal guards,
 *          valid file serving, and 404 handling.
 * Traceability: Issue #277, ADR 0017
 * ======================================================================== */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  resolveRegistryRoot,
  validatePathBoundary,
  handleRegistryRequest,
} from './registryMiddleware';

/**
 * Minimal mock for `ServerResponse` that captures writeHead/end calls.
 */
function createMockResponse() {
  let _statusCode = 0;
  let _headers: Record<string, string | number> = {};
  let _body: Buffer | string = '';

  return {
    writeHead(code: number, headers?: Record<string, string | number>) {
      _statusCode = code;
      if (headers) _headers = headers;
    },
    end(body?: Buffer | string) {
      if (body !== undefined) _body = body;
    },
    get statusCode() {
      return _statusCode;
    },
    get headers() {
      return _headers;
    },
    get body() {
      return _body;
    },
  };
}

describe('resolveRegistryRoot', () => {
  const originalEnv = process.env.PHAROS_REGISTRY_TARGET;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PHAROS_REGISTRY_TARGET;
    } else {
      process.env.PHAROS_REGISTRY_TARGET = originalEnv;
    }
  });

  it('test_should_use_env_var_when_PHAROS_REGISTRY_TARGET_is_set', () => {
    process.env.PHAROS_REGISTRY_TARGET = '/custom/registry';
    const result = resolveRegistryRoot('/workspace');
    expect(result).toBe(path.resolve('/custom/registry'));
  });

  it('test_should_fallback_to_artifacts_dir_when_env_var_is_unset', () => {
    delete process.env.PHAROS_REGISTRY_TARGET;
    const result = resolveRegistryRoot('/workspace');
    expect(result).toBe(path.resolve('/workspace', '.artifacts', 'registry'));
  });
});

describe('validatePathBoundary', () => {
  const registryRoot = '/safe/registry';

  it('test_should_allow_valid_file_path_when_within_boundary', () => {
    expect(validatePathBoundary('index.bin', registryRoot)).toBeNull();
  });

  it('test_should_allow_valid_shard_path_when_within_boundary', () => {
    expect(validatePathBoundary('shards/chunk-01.bin', registryRoot)).toBeNull();
  });

  it('test_should_block_traversal_when_double_dots_escape_root', () => {
    const result = validatePathBoundary('../../etc/passwd', registryRoot);
    expect(result).toBe('path traversal detected');
  });

  it('test_should_block_traversal_when_nested_dots_escape_root', () => {
    const result = validatePathBoundary('shards/../../../../../../etc/shadow', registryRoot);
    expect(result).toBe('path traversal detected');
  });

  it('test_should_block_request_when_null_byte_is_injected', () => {
    const result = validatePathBoundary('index.bin\0.txt', registryRoot);
    expect(result).toBe('null byte injection detected');
  });

  it('test_should_block_traversal_when_encoded_dots_resolve_outside', () => {
    const result = validatePathBoundary('../../../etc/passwd', registryRoot);
    expect(result).toBe('path traversal detected');
  });
});

describe('handleRegistryRequest', () => {
  let tmpDir: string;
  let registryRoot: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pharos-reg-test-'));
    registryRoot = path.join(tmpDir, 'registry');
    fs.mkdirSync(registryRoot, { recursive: true });
    fs.mkdirSync(path.join(registryRoot, 'shards'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('test_should_return_false_when_url_does_not_match_prefix', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest('/other/path', registryRoot, res as any);
    expect(handled).toBe(false);
  });

  it('test_should_return_200_when_valid_bin_file_is_requested', () => {
    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef]);
    fs.writeFileSync(path.join(registryRoot, 'index.bin'), payload);

    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/index.bin',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/octet-stream');
    expect(Buffer.compare(res.body as Buffer, payload)).toBe(0);
  });

  it('test_should_return_200_when_valid_shard_file_is_requested', () => {
    const payload = Buffer.from([0xca, 0xfe]);
    fs.writeFileSync(path.join(registryRoot, 'shards', 'chunk-01.bin'), payload);

    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/shards/chunk-01.bin',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(Buffer.compare(res.body as Buffer, payload)).toBe(0);
  });

  it('test_should_return_404_when_file_does_not_exist', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/missing.bin',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(404);
    expect(res.body).toBe('404 Not Found');
  });

  it('test_should_return_403_when_traversal_attack_is_attempted', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/../../etc/passwd',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(403);
    expect((res.body as string)).toContain('403 Forbidden');
  });

  it('test_should_return_403_when_null_byte_injection_is_attempted', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/index.bin\0.txt',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(403);
    expect((res.body as string)).toContain('null byte');
  });

  it('test_should_return_403_when_deeply_nested_traversal_is_attempted', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/shards/../../../../../../../etc/shadow',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(403);
  });

  it('test_should_return_400_when_malformed_uri_is_requested', () => {
    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/%E0%A4%A',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(400);
    expect((res.body as string)).toContain('400 Bad Request');
  });

  it('test_should_return_200_when_query_parameters_are_present', () => {
    const payload = Buffer.from([0xde, 0xad]);
    fs.writeFileSync(path.join(registryRoot, 'index.bin'), payload);

    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/index.bin?v=123',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(Buffer.compare(res.body as Buffer, payload)).toBe(0);
  });

  it('test_should_return_403_when_symlink_points_outside_registry', () => {
    // Create a file outside the registry boundary
    const outsideDir = path.join(tmpDir, 'outside');
    fs.mkdirSync(outsideDir, { recursive: true });
    fs.writeFileSync(path.join(outsideDir, 'secret.txt'), 'secret data');

    // Create a symlink inside registry that points outside
    fs.symlinkSync(
      path.join(outsideDir, 'secret.txt'),
      path.join(registryRoot, 'evil-link.bin'),
    );

    const res = createMockResponse();
    const handled = handleRegistryRequest(
      '/pharos-kitchen-design/registry/evil-link.bin',
      registryRoot,
      res as any,
    );

    expect(handled).toBe(true);
    expect(res.statusCode).toBe(403);
    expect((res.body as string)).toContain('symlink traversal');
  });
});
