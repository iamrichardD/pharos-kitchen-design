# RET-03: Mid-Sprint Rigor Enforcer (Plan)

## 🎯 Objective
Enforce the "Small Stones Mandate" (ADR-0033) by requiring a manual rigor check for high-complexity tasks (ECT >= 4) before they are pushed to the remote repository.

## 🏗️ Architecture

### 1. `SESSION_CONTEXT.md` Specification
Each active task directory (or the project root during a session) should contain a `SESSION_CONTEXT.md` file. This file acts as a local state tracker for the current agentic or human session.

**Format:**
```markdown
# Session Context
- **Task ID**: #160
- **ECT**: 4
- **Auditor**: PHAROS_DEV_CORE
- **Status**: IN_PROGRESS
```

### 2. Implementation: Local Git Hook (`pre-push`)
A `pre-push` hook will be implemented to intercept the push command.

**Logic:**
1. Identify the current task context by searching for `SESSION_CONTEXT.md` in the workspace.
2. Parse the `ECT` value from the file.
3. If `ECT >= 4`:
   - Check if a "Rigor Check" marker exists (e.g., a specific line in `SESSION_CONTEXT.md` or a separate file).
   - If missing, prompt the user: `⚠️ HIGH COMPLEXITY DETECTED (ECT: 4). HAVE YOU COMPLETED THE MID-SPRINT RIGOR CHECK? (y/n)`
   - If the user answers 'n', abort the push.
   - If 'y', allow the push and record the confirmation in the context.

### 3. CLI Check (`pkd rigor verify`)
For automated environments (like agentic workflows), a CLI command will be added to the `pkd` binary to perform this check programmatically.

```bash
pkd rigor verify --context ./SESSION_CONTEXT.md
```

## 📅 Milestones
- [ ] Define `SESSION_CONTEXT.md` schema in `docs/adr/`.
- [ ] Implement `pre-push.sh` template in `scripts/hooks/`.
- [ ] Add `rigor` subcommand to `pkd-cli`.
- [ ] Integrate with `install.sh` to automatically install the hook.

## ⚠️ Constraints
- The hook must be "Agent-Aware" (handling non-interactive environments by checking for a `RIGOR_CHECK_PASSED=true` environment variable or marker).
- Minimal performance impact on the git workflow.
