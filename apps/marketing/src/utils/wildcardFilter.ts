/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Utilities
 * File: wildcardFilter.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Shared wildcard search matching and query application utilities.
 * Traceability: Issue #242, PR #250
 * Last Updated: 2026-06-15
 * ======================================================================== */

export function matchWildcard(text: string, pattern: string): boolean {
  const startTime = performance.now();
  try {
    const regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\\\*/g, '.*')
      .replace(/\\\+/g, '.+')
      .replace(/\\\?/g, '.')
      .replace(/\\\[/g, '[')
      .replace(/\\\]/g, ']');
    
    const regex = new RegExp(`^${regexPattern}$`, 'i');
    const result = regex.test(text);
    const duration = performance.now() - startTime;
    if (duration > 100) {
      console.warn(`[ReDoS Warden] Wildcard match took ${duration.toFixed(2)}ms, exceeding 100ms temporal limit.`);
      return false;
    }
    return result;
  } catch (e) {
    console.error("[ReDoS Warden] Regex compilation failed:", e);
    return false;
  }
}

export function applyFilter(query: string, targetSelector: string, postFilterCallback?: () => void) {
  const entries = document.querySelectorAll(targetSelector);
  const normalizedQuery = query.toLowerCase().trim();
  
  entries.forEach(entry => {
    const htmlEntry = entry as HTMLElement;
    const raw = htmlEntry.dataset.raw?.toLowerCase() || htmlEntry.innerText.toLowerCase() || '';
    let match = true;

    if (normalizedQuery.length > 0) {
      if (normalizedQuery.includes('=')) {
        const parts = normalizedQuery.split('=');
        const key = parts[0]?.trim();
        const value = parts[1]?.trim();
        
        if (key && value) {
          const isWildcard = value.includes('*') || value.includes('+') || value.includes('?') || value.includes('[');
          
          if (isWildcard) {
             const pattern = new RegExp(`${key}[:=]\\s?([^\\s]+)`, 'i');
             const fieldMatch = raw.match(pattern);
             match = (fieldMatch && fieldMatch[1]) ? matchWildcard(fieldMatch[1], value) : false;
          } else {
             match = raw.includes(`${key}: ${value}`) || 
                     raw.includes(`${key}=${value}`) || 
                     (raw.includes(`[${value.toUpperCase()}]`));
          }
        }
      } else {
        const isWildcard = normalizedQuery.includes('*') || normalizedQuery.includes('+') || normalizedQuery.includes('?') || normalizedQuery.includes('[');
        if (isWildcard) {
           match = matchWildcard(raw, `.*${normalizedQuery}.*`);
        } else {
           match = raw.includes(normalizedQuery);
        }
      }
    }

    htmlEntry.style.display = match ? 'block' : 'none';
    if (match) {
      htmlEntry.classList.add('animate-in', 'fade-in');
    } else {
      htmlEntry.classList.remove('animate-in', 'fade-in');
    }
  });

  if (postFilterCallback) {
    postFilterCallback();
  }
}
