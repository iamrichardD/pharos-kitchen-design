/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Session Utils / Tests
 * File: apps/marketing/src/utils/session.test.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Atomic unit tests for SessionManager authentication state.
 * Traceability: Issue #311, PR Crucible Audit
 * Last Updated: 2026-06-30
 * ======================================================================== */

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '@pkd/protocol';

describe('SessionManager Unit Tests', () => {
  let dispatchedEvents: Event[] = [];

  const handleSessionChange = (e: Event) => {
    dispatchedEvents.push(e);
  };

  beforeEach(() => {
    dispatchedEvents = [];
    // Clear cookies and localStorage
    document.cookie = 'pharos_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    localStorage.clear();
    window.addEventListener('pharos:session-change', handleSessionChange);
  });

  afterEach(() => {
    window.removeEventListener('pharos:session-change', handleSessionChange);
  });

  it('test_should_return_false_when_no_session_exists', () => {
    expect(SessionManager.isAuthenticated()).toBe(false);
    expect(SessionManager.getToken()).toBeNull();
  });

  it('test_should_write_cookie_and_dispatch_event_when_setting_session', () => {
    const token = 'mock_token_abc';
    SessionManager.setSession(token);

    expect(document.cookie).toContain('pharos_session=mock_token_abc');
    expect(localStorage.getItem('pharos_session')).toBe(token);
    expect(SessionManager.isAuthenticated()).toBe(true);
    expect(SessionManager.getToken()).toBe(token);

    // Verify window event
    expect(dispatchedEvents.length).toBe(1);
    expect(dispatchedEvents[0]?.type).toBe('pharos:session-change');
    expect((dispatchedEvents[0] as CustomEvent).detail).toEqual({ isAuthenticated: true });
  });

  it('test_should_clear_cookie_and_dispatch_event_when_clearing_session', () => {
    SessionManager.setSession('test_token');
    SessionManager.clearSession();

    expect(SessionManager.isAuthenticated()).toBe(false);
    expect(SessionManager.getToken()).toBeNull();
    expect(localStorage.getItem('pharos_session')).toBeNull();

    // Verify second event was cleared state
    expect(dispatchedEvents.length).toBe(2);
    expect(dispatchedEvents[1]?.type).toBe('pharos:session-change');
    expect((dispatchedEvents[1] as CustomEvent).detail).toEqual({ isAuthenticated: false });
  });
});
