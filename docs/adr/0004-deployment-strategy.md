/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: 0004-deployment-strategy.md
 * Status: Approved
 * ======================================================================== */

# ADR 0004: Deployment Strategy & Hosting

## Context
Establishing a cost-efficient deployment for the Marketing Site and POC Demo for a bootstrap project.

## Decision
Selected **GitHub Pages** as the primary host for the Marketing Site (`iamrichardd.com/pharos-kitchen-design`) and the POC (`iamrichardd.com/pharos-kitchen-design/demo`). The slug was chosen to be descriptive for maximum SEO and AI Agent clarity.

## Rationale
Maximizes cost efficiency ($0/month) while leveraging the Astro + WASM tech stack. The descriptive slug (`pharos-kitchen-design`) provides high keyword relevance and entity clarity for search and AI discovery.

## Impact
- Development will focus on Static Site Generation (SSG).
- CI/CD will be handled via GitHub Actions.
- Unified domain under `iamrichardd.com`.
