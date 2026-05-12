<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation / Governance
 * File: 0031-project-team-topology-agentic-orchestration.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Define the team topology keywords and agentic orchestration strategy.
 * Traceability: ADR-0017, ADR-0028, ADR-0030
 * Status: Accepted
 * ======================================================================== -->
# ADR-0031: Project Team Topology & Agentic Orchestration

*   **Status**: Accepted
*   **Date**: 2026-05-12
*   **Deciders**: Senior Pharos Program Manager (PRC), Pharos Meta-Architect (PMA)
*   **Traceability**: ADR-0017, ADR-0028, ADR-0030

## Context
Pharos Kitchen Design (Project Prism) operates in an "AI-First" development environment. To maintain engineering rigor, architectural consistency, and context efficiency across multiple AI agent sessions, a structured "Team Topology" is required. Legacy agile structures often lack the role-based isolation needed to prevent "Persona Schizophrenia"—where a single agent attempts to act as both Builder and Auditor, compromising objective verification.

## Decision
We will formalize a role-based Team Topology codified via "Team Keywords" in the project's foundational instructions (`GEMINI.md`).

1.  **Core Team Keywords**:
    *   **`PHAROS_STRATEGY_CORE`**: The Planning & Review authority. Composed of the PMA (Meta-Architect), SPM (Senior Program Manager), Senior PRC (Project Manager), Senior Engineer, Senior DevSecOps Engineer, and Senior DX Engineer.
    *   **`PHAROS_DEV_CORE`**: The Implementation authority. Composed of the Senior Engineer (Lead), Senior DevSecOps Engineer, and Senior DX Engineer.

2.  **Role-Based Isolation**:
    *   **The Builder/Auditor Mandate**: Per ADR-0017, the `PHAROS_DEV_CORE` (Builder) and the `PHAROS_STRATEGY_CORE` (Auditor) MUST be treated as separate logical entities. A task implemented by the Dev Core must be audited by the Strategy Core (or a fresh instance thereof) to ensure objectivity.

3.  **Agentic Compression**:
    *   Use of these keywords is mandated in project prompts to "hydrate" the current context with specific expert personas and mandates without exhausting the limited context window with repetitive roster definitions.

4.  **Governance Stability**:
    *   Changes to the membership or mandates of these core teams require a formal ADR update.

## Rationale
- **Context Efficiency**: Reducing the token overhead of roster definitions allows more space for complex technical logic in the conversation history.
- **Expertise Alignment**: Assigning specific domains (Security, DX, Infrastructure) to named personas ensures that "Shift-Left" requirements are consistently addressed by the most relevant agentic expertise.
- **Architectural Integrity**: Role isolation prevents the cognitive bias of an agent reviewing its own work, adhering to the "Crucible" standard of high-rigor peer review.

## Consequences
- **Prompt Precision**: Requires users and agents to be precise in their "Summoning" of teams (Inquiry vs. Directive).
- **Session Transitions**: Ensures that any new agent joining the project can instantly resolve the project's organizational structure by reading `GEMINI.md`.
- **Rigor Enforcement**: Automatically attaches high-rigor mandates (TDD, Fail-Fast) to the `PHAROS_DEV_CORE` keyword, making these standards a default invariant of implementation.
