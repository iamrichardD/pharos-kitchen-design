#!/bin/bash
# ========================================================================
# Project: Pharos Kitchen Design (Project Prism)
# Component: DevSecOps / Git Hooks
# File: setup-hooks.sh
# Author: PHAROS_DEV_CORE
# Purpose: Installs Pharos-standard git hooks for the local repository.
# Traceability: RET-03, Issue #160
# ========================================================================

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$REPO_ROOT" ]; then
    echo "❌ Error: Not a git repository."
    exit 1
fi

HOOKS_DIR="$REPO_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# 1. Install pre-push hook
echo "🛡️  Installing Pharos Rigor Gate (pre-push)..."
cat > "$HOOKS_DIR/pre-push" <<EOF
#!/bin/bash
bash scripts/rigor-verify.sh
EOF

chmod +x "$HOOKS_DIR/pre-push"
echo "✅ Git hooks successfully installed."
