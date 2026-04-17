/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Practices
 * File: PRACTICES.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Philosophical Constitution (Beck, Martin, Fowler)
 * Traceability: Task 4.6 (Issue #44)
 * ======================================================================== */

# Pharos Engineering Practices (The Crucible Constitution)

This document codifies the core engineering philosophies of the Pharos Kitchen Design (PKD) project. All contributions, automated audits, and human reviews are measured against these foundational mandates.

## 1. The Feedback & Economic Mandate (Kent Beck)
*Simplicity is the highest form of sophistication. We write code for humans to read and machines to execute.*

- **Test-Driven Design (TDD):** Every feature or bug fix MUST begin with a failing test case that defines the desired behavior and economic value. Tests are not "afterthoughts"; they are the "design specification." If a test is difficult to write, the design is flawed.
- **YAGNI (You Ain't Gonna Need It):** Implement only what is required for the current task. Do not add "hooks for the future" or "flexible abstractions" that are not currently exercised by a test.
- **Communication over Complexity:** Code that is clever but hard to read is a liability. Prefer explicit, readable logic over "brilliant" hacks.

## 2. The Structural Mandate (Robert C. Martin)
*Clean code is not written by followers of rules, but by practitioners of principles.*

- **SOLID Principles:** 
    - **Single Responsibility (SRP):** Each vertical slice or module must have exactly one reason to change.
    - **Dependency Inversion (DIP):** Depend on abstractions (the Truth Engine schemas), not on concretions (specific vendor APIs or UI frameworks).
- **Fail-Fast Sentinels:** System seams (FFI boundaries, API endpoints, persistence layers) MUST implement strict input validation and return informative errors immediately. A system that masks an error is a system that lies.
- **The Boy Scout Rule:** Always leave the code a little cleaner than you found it, but stay strictly within the scope of your vertical slice.

## 3. The Evolutionary Mandate (Martin Fowler)
*Any fool can write code that a computer can understand. Good programmers write code that humans can understand.*

- **Continuous Refactoring:** Refactoring is the act of improving the design of existing code without changing its observable behavior. It is an integral part of the development cycle, not a separate task.
- **Ubiquitous Language (DDD):** The codebase must use terms that reflect the domain of the Independent Kitchen Designer (IKD), not the jargon of the software engineer.
- **Vertical Slice Architecture (VSA):** We organize code by business capability, not by technical layer. This ensures that a change to a single feature doesn't ripple across unrelated silos.

## 4. The Mentorship Standard
*We do not just build software; we build engineers.*

- **Instructive Peer Review:** Code reviews are teaching moments. Every critique should explain the "Why" and the "How," referencing the principles in this document.
- **Transparency of Process:** The auditor's heuristics, the CI/CD pipelines, and the decision logs are open-source and publicly auditable.

---
### Compliance Check
Before submitting a PR, ask yourself:
1. Does this implementation have a corresponding test? (**Beck**)
2. Is there any "just-in-case" code I can remove? (**Beck**)
3. Does this change violate the Single Responsibility Principle? (**Martin**)
4. Have I implemented a "Fail-Fast Sentinel" at the system seam? (**Martin**)
5. Does the naming reflect the IKD domain language? (**Fowler**)
6. Is this the simplest design that fulfills the requirement? (**Fowler**)
