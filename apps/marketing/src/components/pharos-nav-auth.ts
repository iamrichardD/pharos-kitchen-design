/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Auth Nav Custom Element
 * File: apps/marketing/src/components/pharos-nav-auth.ts
 * Author: Lead Developer (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Custom Element to dynamically toggle login/settings link based on auth state.
 * Traceability: Issue #311
 * Last Updated: 2026-06-30
 * ======================================================================== */

import { SessionManager } from '@pkd/protocol';

export class PharosNavAuth extends HTMLElement {
  private anchor: HTMLAnchorElement | null = null;

  connectedCallback() {
    this.anchor = this.querySelector('a');
    if (!this.anchor) {
      this.anchor = document.createElement('a');
      this.appendChild(this.anchor);
    }
    this.updateLink();
    window.addEventListener('pharos:session-change', this.handleSessionChange);
  }

  disconnectedCallback() {
    window.removeEventListener('pharos:session-change', this.handleSessionChange);
  }

  private handleSessionChange = (e: Event) => {
    const customEvent = e as CustomEvent<{ isAuthenticated: boolean }>;
    this.updateState(customEvent.detail.isAuthenticated);
  };

  private updateLink() {
    const isAuthed = SessionManager.isAuthenticated();
    this.updateState(isAuthed);
  }

  private updateState(isAuthed: boolean) {
    if (!this.anchor) return;
    const currentPath = window.location.pathname;

    if (isAuthed) {
      this.anchor.textContent = 'Settings';
      this.anchor.href = '/pharos-kitchen-design/settings';
      
      const isActive = currentPath === '/pharos-kitchen-design/settings' || currentPath === '/pharos-kitchen-design/settings/';
      if (isActive) {
        this.anchor.className = this.getAttribute('active-class') || '';
      } else {
        this.anchor.className = this.getAttribute('inactive-class') || '';
      }
    } else {
      this.anchor.textContent = 'Login';
      this.anchor.href = '/pharos-kitchen-design/login';
      
      const isActive = currentPath === '/pharos-kitchen-design/login' || currentPath === '/pharos-kitchen-design/login/';
      if (isActive) {
        this.anchor.className = this.getAttribute('active-class') || '';
      } else {
        this.anchor.className = this.getAttribute('inactive-class') || '';
      }
    }
  }
}

if (!customElements.get('pharos-nav-auth')) {
  customElements.define('pharos-nav-auth', PharosNavAuth);
}
