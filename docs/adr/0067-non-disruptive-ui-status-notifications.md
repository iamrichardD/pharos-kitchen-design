<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Architecture
 * File: 0067-non-disruptive-ui-status-notifications.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Mandating the Absolute Floating Toast Pattern to prevent layout shifts.
 * Traceability: Issue #311
 * Status: Proposed
 * ======================================================================== -->

# ADR 0067: Non-Disruptive UI Status Notifications

## Context
When loading states, validation errors, or asynchronous responses update on dynamic forms (e.g. login, register, submit), traditional inline alerts displace surrounding content. This causes cumulative layout shift (CLS), degrading the UX and leading to accidental clicks or visual disruption.

## Decision
Pharos will utilize an **"Absolute Floating Toast"** pattern for all dynamic form status notifications:

1.  **Overlay Position**: Status and error containers must be positioned absolutely relative to their parent card or viewport, floating above the regular content flow (e.g., using `absolute bottom-6 left-6 right-6 z-50`).
2.  **No Layout Displacement**: Under no circumstances should displaying a status notification modify the height, alignment, or padding of the container or push surrounding controls (like submit buttons) downward.
3.  **Auto-Dismiss Sentinels**: Status indicators must fade out or auto-dismiss after a hard limit of **5 seconds** of visibility, resetting the timeout if a newer state arrives.
4.  **Aesthetics**: Notifications must remain visually distinct and premium (e.g., solid background, border styling, subtle shadow, and monospace font for system diagnostic integrity).

## Rationale
- **Visual Stasis**: Eliminates shifting layout boxes and conforms to the core visual stability goal.
- **Improved Accessibility**: Prevents user fatigue by keeping control buttons statically placed so users do not click the wrong button due to shifts.
- **Clean Interface**: Offloads diagnostic logs to transient overlays rather than polluting form structures.

## Impact
- **UI Elements**: Forms within apps (such as `login.astro`) must implement the absolute positioned overlay.
- **Client Scripts**: `showStatus` functions must integrate state-preserving timer resets.

## Traceability
- [Issue #311](https://github.com/iamrichardd/pharos-kitchen-design/issues/311)
- [ADR-0012 (Design System)](0012-marketing-ia-and-design-system.md)
