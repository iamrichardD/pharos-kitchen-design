/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Marketing / Utilities / Date
 * File: apps/marketing/src/utils/date.ts
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Unified date parsing and formatting utility (SRP).
 * Traceability: Date formatting localization verification
 * ======================================================================== */

export function formatDate(rawDate: string | undefined, locale: string | undefined = undefined): string {
  let formattedDate = '2026-XX-XX';
  if (rawDate) {
    try {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        formattedDate = parsedDate.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });
      } else {
        formattedDate = rawDate;
      }
    } catch (e) {
      formattedDate = rawDate;
    }
  }
  return formattedDate;
}
