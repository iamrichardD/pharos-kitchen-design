<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Copywriting Redirection Report
 * File: docs/governance/REPORTS/2026-07-03-copywriting-redirection.md
 * Author: Lead Brand Strategist & Information Architect (via Antigravity)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Strategic redirection of copywriting from technical jargon to Commercial Kitchen Designer value.
 * Traceability: ADR-0048, ADR-0030
 * Last Updated: 2026-07-03
 * ======================================================================== -->

# Copywriting Redirection: Speaking the Language of Commercial Kitchen Designers

**Date:** 2026-07-03  
**Status:** Approved  
**Traceability:** ADR-0048, ADR-0030  
**Teams:** `PHAROS_STRATEGY_CORE`, `PHAROS_DEV_CORE`, `PHAROS_IA_CORE`  
**Roundtable Co-Leads:** Seth Godin, Kathy Sierra, Martin Fowler  
**Roundtable Contributors:** Kent Beck, Robert C. Martin (Uncle Bob), PHAROS_DEV_CORE, PHAROS_IA_CORE, PHAROS_STRATEGY_CORE  

---

## 1. 📊 Background & Context
We received direct, critical feedback regarding our Sprint 5.05 release blog post. The copy is overly technical—referencing concepts like "URL taxonomy", "mobile navigation overflow", and "client-side SessionManager." For our core audience of Commercial Kitchen Designers (replacing the previous term "Independent Kitchen Designers"), this developer-centric jargon is isolating and fails to convey the actual business and workflow value of Pharos.

This report documents our strategic roundtable discussion and defines a clear translation dictionary that maps our internal developer models to high-value, user-centered outcomes.

---

## 2. ⚔️ The Copywriting Roundtable

### Seth Godin (Brand & Narrative Connection)
> "We're speaking to a tribe of craftsmen who coordinate massive projects. They don't care about a 'client-side SessionManager' or a 'URL taxonomy'. When we use those words, we build a wall between us and them. It makes us look like we're showing off our code rather than understanding their pressure-cooker environment. We need to replace the outdated, isolated term 'Independent Kitchen Designer' with 'Commercial Kitchen Designer'—the true name of their profession. Our story must be about respect, clarity, and utility. Let's speak directly to their daily workflow."

### Kathy Sierra (User Cognitive Empathy)
> "Exactly. A designer in the middle of a high-stakes presentation with a client has a very limited cognitive budget. If they're trying to figure out what 'mobile navigation overflow' means, we've failed. We must translate the technology into what it lets them *do*. Don't talk about a 'SessionManager'—talk about saving their active planning session so they can close their laptop, walk into a client presentation, and immediately resume right where they left off. Focus on their flow state and their ability to get results."

### Martin Fowler (Simplification & Essential Domain Models)
> "We're seeing a classic gap between our internal implementation model and the external user model. Internally, yes, we built a 'URL taxonomy' with 'un-prefixed parameters' to simplify our routing engine. But the user model shouldn't expose those implementation details. To a Commercial Kitchen Designer, these are simply clean, intuitive web links and standard equipment specifications—voltage, phase, btu, and drains—that match the real-world manufacturer data sheets they use every day. We must bridge this gap by writing about the external user model."

### Robert C. Martin (Uncle Bob) (Ubiquitous Domain Language)
> > "This comes down to ubiquitous language. If our code and our customer-facing copy don't share a common domain vocabulary, we introduce confusion. The domain here is commercial kitchen design, not software engineering. The vocabulary must be dominated by layouts that work beautifully on tablets and phones while on-site, secure workspace access, and standard equipment specs. Let the code handle the details, but keep our public language clean and rooted in the domain."

### Kent Beck (Concrete Feedback Loops)
> "The feedback loop worked here. We pushed some copy, the critique showed us it was too nerdy, and we're stepping back to fix it. We don't need a massive committee process to rewrite the blog. Let's create a clear translation map, update the post immediately, and verify that the new copy connects directly with the work our designers do every day. Keep it simple and keep moving."

### PHAROS_IA_CORE & PHAROS_STRATEGY_CORE
> "We agree entirely. Moving forward, all marketing copy, blog posts, and user-facing updates will filter technical features through this translation lens. We will transition 'Independent Kitchen Designer' (IKD) to 'Commercial Kitchen Designer' across the entire communication stream."

---

## 3. 📖 Jargon Translation Dictionary

To keep all future copy aligned with our users' workflows, we will use the following translation standards:

| Developer Term | Commercial Kitchen Designer Translation |
| :--- | :--- |
| **Independent Kitchen Designer (IKD)** | **Commercial Kitchen Designer** |
| **Mobile navigation overflow** | Layout behaviors that work beautifully on tablets and phones while on-site. |
| **Client-side SessionManager** | Saving your active planning session and secure workspace access that stays active between client presentations. |
| **URL taxonomy / Un-prefixed parameters** | Clean, intuitive web links and standard equipment specifications (like voltage, phase, btu, drains) that match real-world manufacturer data sheets. |

---

## 4. 🚀 Action Plan & Verification
*   **Overwrite Blog Post:** Update `apps/marketing/src/content/updates/2026-07-03-responsive-flows-and-session-security.toon` with the revised text immediately.
*   **Update Retrospective:** Modify `docs/governance/REPORTS/2026-07-03-RETROSPECTIVE.md` to note this critique and the corrective action in the "Lessons for Agentic Continuity" section.
*   **No Code Changes:** No project code files are to be altered during this copywriting alignment.
