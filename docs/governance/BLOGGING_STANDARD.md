<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance / Strategic Continuity
 * File: docs/governance/BLOGGING_STANDARD.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1
 * Purpose: Defines the blogging, metadata, RSS, and image automation standards.
 * Traceability: Issue #248
 * Last Updated: 2026-06-12
 * ======================================================================== -->

# Pharos Automated Blogging and Feed Standard

This document defines the automated pipeline, templates, metadata schemas, and image generation rules required to translate sprint metrics and developer updates into human-centric blog posts that are automatically distributed to Independent Kitchen Designers (IKDs) via RSS and Google Discover.

---

## 1. The Content Pipeline Flow

To automate our outbound messaging, we feed internal developer logs into the public marketing site using a structured three-tier translation pipeline:

```
[Daily Shard Logs] + [FRIDAY_HANDOFF.md]
                  │
                  ▼
   [Narrative & Prompt Compiler]
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
[Astro Blog Page]     [Nano Banana Prompts]
(RSS & JSON-LD)       (Header & Infographics)
```

1. **Source Aggregator:** Reads daily shard files (`.project/shards/*.toon`) and the weekly `FRIDAY_HANDOFF.md` to establish the raw facts of the sprint.
2. **Copy Extractor:** Synthesizes technical achievements into benefit-driven human stories. Raw metrics are stripped out of the narrative copy.
3. **Prompt Generator:** Maps sprint themes directly to generative image prompts for Google Nano Banana 2.0.

---

## 2. Google Nano Banana 2.0 Image Standards

To maintain visual appeal without losing content fidelity, we use Google Nano Banana 2.0 to generate a premium brand backdrop while leaving structural technical blueprints to crisp SVGs.

### A. Header Banner Template
- **Dimensions:** 1200 x 630 pixels (aspect ratio 1.91:1 for optimal social preview rendering).
- **Prompt Structure:**
  > `"A sleek, modern editorial banner for a software release, dark mode aesthetic, slate and neon orange accent lighting. Abstract wireframe representation of [Sprint Theme]. High-end tech styling, professional, clean layout, 1200x630."`
- **Output:** Uploaded to Cloudflare R2 and referenced via the `og:image` and `image` metadata tags.

### B. Technical Infographic Template
- **Dimensions:** 1200 x 600 pixels.
- **Prompt Structure:**
  > `"A technical schematic infographic illustrating three panels: [Panel 1 Topic], [Panel 2 Topic], and [Panel 3 Topic]. Modern dark-mode UI dashboard design, vibrant orange accents, crisp vector-like diagrams. Professional, state-of-the-art software architectural diagram, 1200x600."`

---

## 3. Feed & Metadata Delivery Specifications

To ensure posts are successfully injected into user news feeds (such as RSS readers and Google Discover), every published blog post must contain the following structured markers:

### A. RSS 2.0 & Atom Feed (XML)
Every post is automatically compiled into the site-wide `/feed.xml` with:
- `<title>`: Action-oriented, human-centric summary.
- `<description>`: A concise teaser describing the user value.
- `<content:encoded>`: The full HTML body content.
- `<enclosure>`: A direct link to the CDN-hosted header visual, specifying length and MIME type (e.g., `image/png`).

### B. Schema.org JSON-LD (Discover Optimization)
A `ld+json` script tag must be injected into the `<head>` of every update page to qualify for Google Discover:

```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "[Post Title]",
  "image": [
    "https://iamrichardd.com/pharos-kitchen-design/assets/updates/[sprint-image].png"
  ],
  "datePublished": "[YYYY-MM-DD]T19:30:00Z",
  "author": {
    "@type": "Organization",
    "name": "Pharos Kitchen Design",
    "url": "https://iamrichardd.com/pharos-kitchen-design/"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Pharos Kitchen Design",
    "logo": {
      "@type": "ImageObject",
      "url": "https://iamrichardd.com/pharos-kitchen-design/assets/logo.png"
    }
  },
  "description": "[Teaser text summarizing the IKD benefits]"
}
```

### C. Open Graph (OG) & Twitter Cards
- `og:title`: Standard title.
- `og:description`: Human benefit summary.
- `og:image`: CDN URL of the Nano Banana banner.
- `twitter:card`: `summary_large_image`.

---

## 4. Machine-Readable Data (webMCP Seam)

Per ADR-0051 and our architectural guidelines, we keep raw machine-readable metrics out of human-facing blog HTML. Instead:
- All sprint statistics (ECT counts, DORA metrics, variance, and logs) are stored in the core tracking database.
- These metrics are exposed dynamically to external agents and integrations via the **webMCP** protocol endpoints.
- External developers can query `/mcp/metrics` to fetch the structured JSON data without web scraping.
