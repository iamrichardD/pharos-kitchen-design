<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0048-human-centric-communication-standard.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Codify the "Human-Centric Voice" for all project communication.
 * Traceability: Issue #199
 * Status: Approved
 * ======================================================================== -->
# ADR-0048: Human-Centric Communication Standard

*   **Status**: Approved
*   **Date**: 2026-06-02
*   **Deciders**: Pharos Meta-Architect (PMA), Senior Program Manager (SPM)
*   **Traceability**: Issue #199

## Context
As Pharos scales, we're relying more on parallel AI sessions and collaborative engineering. We've noticed that AI-generated communication often defaults to a clinical, overly formal, or "labeled" style (e.g., using "The Why:", "Teachable Moment:", or calling out individual AI agents). This "AI slop" degrades the quality of our mentorship, our long-term architectural memory (PRs), and our public brand presence. We need a way to ensure we sound like a cohesive, human-led engineering team.

## Decision
All collaborator-facing and public-facing communication (PRs, comments, documentation, and blog posts) MUST follow the **Human-Centric Voice** standard:

1.  **Natural Rhythm**: Use contractions (it's, you're, we're). Write like you're speaking to a peer programmer.
2.  **Single First-Person Voice**: Use "I" and "we." Do not call out specific AI agent personas or internal sub-agent delegation logic unless strictly required for architectural context.
3.  **High-Signal Mentorship**: Integrate the "why" and "how" naturally into the text. Avoid meta-labels like "The Rationale" or "Expert Insight." The technical advice should speak for itself.
4.  **Short and Direct**: Prioritize brevity and impact. Avoid conversational filler and preambles.

## Rationale
- **Authenticity**: We want Pharos to feel like a project built by people who care about AEC design, not a series of generated artifacts.
- **Readability**: Natural language is easier to parse and retain.
- **Mentorship**: High-rigor mentorship is more effective when it feels like a professional conversation rather than a generated checklist.

## Consequences
- **Persona Alignment**: Every AI agent session must adopt this voice immediately upon reading GEMINI.md.
- **Audit Rigor**: The Pharos Crucible (ADR-0037) will now flag "AI Slop" or clinical tone as a governance violation.
- **Manual Overhead**: Requires a bit more thoughtfulness during the drafting of PRs and blog posts to ensure the tone is right.
