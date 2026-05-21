#!/usr/bin/env bash
/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Governance
 * File: scripts/gen-adr.sh
 * Author: Pharos IA Core (Builder)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Automate the generation and indexing of ADRs.
 * Traceability: Issue #113
 * ======================================================================== */

set -e

TITLE=$1
if [ -z "$TITLE" ]; then
    echo "Usage: $0 <ADR Title>"
    exit 1
fi

# 1. Determine next ID
LAST_ID=$(ls docs/adr/*.md | grep -oE "[0-9]{4}" | sort -n | tail -n 1)
NEXT_ID=$(printf "%04d" $((10#$LAST_ID + 1)))

# 2. Create slug
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')
FILENAME="docs/adr/${NEXT_ID}-${SLUG}.md"
DATE=$(date +%Y-%m-%d)

# 3. Generate content
cat <<EOF > "$FILENAME"
<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Documentation
 * File: ${NEXT_ID}-${SLUG}.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: [Purpose]
 * Traceability: [Traceability]
 * Status: Proposed
 * ======================================================================== -->

# ADR ${NEXT_ID}: ${TITLE}

## Context
[Provide context for this decision]

## Decision
[Describe the decision being made]

## Rationale
[Explain why this decision was chosen over alternatives]

## Impact
- [List expected outcomes or constraints]
EOF

# 4. Append to DECISION_LOG.md
NEW_ENTRY="| **[ADR-${NEXT_ID}]** | ${DATE} | Proposed | [${TITLE}](${FILENAME}) |"

# Check if the table separator exists and add the new entry after the last row
LAST_ADR_LINE=$(grep -n "| \*\*\[ADR-" docs/DECISION_LOG.md | tail -n 1 | cut -d: -f1)

if [ -n "$LAST_ADR_LINE" ]; then
    sed -i "${LAST_ADR_LINE}a ${NEW_ENTRY}" docs/DECISION_LOG.md
else
    # Fallback to before the horizontal rule if no ADR lines found
    sed -i "/---/i ${NEW_ENTRY}" docs/DECISION_LOG.md
fi

echo "   [Governance] Created ADR: ${FILENAME}"
echo "   [Governance] Indexed in docs/DECISION_LOG.md"
