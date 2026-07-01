/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Protocol / Session Utils
 * File: packages/pharos-protocol/src/session.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Client-side session manager for token storage, validation, and event dispatching.
 * Traceability: Issue #311, PR Crucible Audit
 * Last Updated: 2026-06-30
 * ======================================================================== */

export class SessionManager {
  private static getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null;
    }
    return null;
  }

  public static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = this.getCookie('pharos_session') || localStorage.getItem('pharos_session');
    return !!token;
  }

  public static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return this.getCookie('pharos_session') || localStorage.getItem('pharos_session');
  }

  public static setSession(token: string): void {
    if (typeof window === 'undefined') return;
    
    // Write cookie with Secure and SameSite=Lax flags
    document.cookie = `pharos_session=${token}; path=/; max-age=86400; SameSite=Lax; Secure`;
    // Write localStorage fallback/cache
    localStorage.setItem('pharos_session', token);

    window.dispatchEvent(new CustomEvent('pharos:session-change', {
      detail: { isAuthenticated: true }
    }));
  }

  public static clearSession(): void {
    if (typeof window === 'undefined') return;

    // Clear cookie with matching Secure and SameSite flags
    document.cookie = 'pharos_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure';
    // Clear localStorage
    localStorage.removeItem('pharos_session');

    window.dispatchEvent(new CustomEvent('pharos:session-change', {
      detail: { isAuthenticated: false }
    }));
  }
}
