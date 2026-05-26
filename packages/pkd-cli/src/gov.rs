/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Governance Linter)
 * File: packages/pkd-cli/src/gov.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Implements the local governance linter to enforce SDLC standards.
 * Traceability: Issue #115 - Local Governance Linter
 * ======================================================================== */

use anyhow::{anyhow, Result};
use colored::*;
use ignore::WalkBuilder;
use regex::Regex;
use std::fs;
use std::path::{Path, PathBuf};

pub async fn handle_gov_lint() -> Result<()> {
    println!("{} Running Pharos Governance Linter...", "ℹ".blue());

    let mut violations = 0;
    let root = find_project_root()?;

    // GOV-001, 002, 003: Source File Headers
    violations += lint_source_headers(&root)?;

    // GOV-004, 005: ADR Standards
    violations += lint_adr_standards(&root)?;

    // GOV-006: SPM Mandate
    violations += lint_spm_mandate(&root)?;

    if violations > 0 {
        println!(
            "\n{} Governance audit failed with {} violations.",
            "✘".red(),
            violations
        );
        Err(anyhow!("Governance standards not met."))
    } else {
        println!(
            "\n{} Governance audit passed. Codebase is compliant.",
            "✔".green()
        );
        Ok(())
    }
}

fn find_project_root() -> Result<PathBuf> {
    let mut current = std::env::current_dir()?;
    while !current.join(".git").exists() {
        if let Some(parent) = current.parent() {
            current = parent.to_path_buf();
        } else {
            return Err(anyhow!(
                "Could not find project root (no .git directory found)."
            ));
        }
    }
    Ok(current)
}

fn lint_source_headers(root: &Path) -> Result<u32> {
    let mut violations = 0;
    let walker = WalkBuilder::new(root)
        .hidden(false)
        .git_ignore(true)
        .build();

    for entry in walker {
        let entry = entry?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
        if !["rs", "ts", "tsx", "js", "jsx", "astro", "json"].contains(&ext) {
            continue;
        }

        // Lean Shard Exception
        let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");
        if file_name.starts_with("shard_") && ext == "json" {
            continue;
        }

        // Standard Tooling Exemptions
        if file_name == "package-lock.json"
            || file_name == "SESSION_STATE.json"
            || file_name == "tsconfig.json"
            || file_name == "package.json"
        {
            continue;
        }

        if path.to_string_lossy().contains("kcl-catalog/metadata/") && ext == "json" {
            continue;
        }
        // Runtime Data Shards (explicit check)
        if path.to_string_lossy().contains("samples/") && ext == "json" {
            continue;
        }

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let first_15_lines: Vec<&str> = content.lines().take(15).collect();
        let header_blob = first_15_lines.join("\n");

        let mut file_violated = false;

        // GOV-001: Standard Prologue
        if !header_blob.to_lowercase().contains("pharos kitchen design") {
            println!(
                "{} {} - Missing Standard Prologue (GOV-001)",
                "✘".red(),
                path.display()
            );
            file_violated = true;
        }

        // GOV-002: FSL-1.1 License
        if !header_blob.to_lowercase().contains("license")
            || !header_blob.to_lowercase().contains("fsl-1.1")
        {
            println!(
                "{} {} - Missing FSL-1.1 License (GOV-002)",
                "✘".red(),
                path.display()
            );
            file_violated = true;
        }

        // GOV-003: Traceability
        if !header_blob.to_lowercase().contains("traceability") {
            println!(
                "{} {} - Missing Traceability (GOV-003)",
                "✘".red(),
                path.display()
            );
            file_violated = true;
        }

        if file_violated {
            violations += 1;
        }
    }

    Ok(violations)
}

fn lint_adr_standards(root: &Path) -> Result<u32> {
    let mut violations = 0;
    let adr_dir = root.join("docs/adr");
    if !adr_dir.exists() {
        return Ok(0);
    }

    let adr_regex = Regex::new(r"^\d{4}-.*\.md$").unwrap();
    let decision_log_path = root.join("docs/DECISION_LOG.md");
    let decision_log = if decision_log_path.exists() {
        fs::read_to_string(&decision_log_path)?
    } else {
        String::new()
    };

    for entry in fs::read_dir(adr_dir)? {
        let entry = entry?;
        let path = entry.path();
        let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("");

        if file_name == "README.md" || !path.is_file() {
            continue;
        }

        let mut adr_violated = false;

        // GOV-004: ADR Naming
        if !adr_regex.is_match(file_name) {
            println!(
                "{} {} - Invalid ADR filename (GOV-004). Must match \\d{{4}}-.*\\.md",
                "✘".red(),
                file_name
            );
            adr_violated = true;
        }

        // GOV-005: ADR Indexing
        if !decision_log.contains(file_name) {
            println!(
                "{} {} - ADR not indexed in docs/DECISION_LOG.md (GOV-005)",
                "✘".red(),
                file_name
            );
            adr_violated = true;
        }

        if adr_violated {
            violations += 1;
        }
    }

    Ok(violations)
}

fn lint_spm_mandate(root: &Path) -> Result<u32> {
    let mut violations = 0;
    let gemini_md = root.join("GEMINI.md");
    if !gemini_md.exists() {
        println!("{} GEMINI.md - Missing file", "✘".red());
        return Ok(1);
    }

    let content = fs::read_to_string(gemini_md)?;
    // GOV-006: SPM Mandate
    if !content.contains("Senior Program Manager (SPM)") {
        println!(
            "{} GEMINI.md - Missing SPM role definition (GOV-006)",
            "✘".red()
        );
        violations += 1;
    }

    Ok(violations)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_should_pass_when_prologue_is_correct() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.rs");
        let mut file = File::create(&file_path).unwrap();
        writeln!(
            file,
            "/* ========================================================================"
        )
        .unwrap();
        writeln!(file, " * Project: Pharos Kitchen Design (Project Prism)").unwrap();
        writeln!(file, " * License: FSL-1.1").unwrap();
        writeln!(file, " * Traceability: Issue #115").unwrap();
        writeln!(
            file,
            " * ======================================================================== */"
        )
        .unwrap();

        let violations = lint_source_headers(dir.path()).unwrap();
        assert_eq!(violations, 0);
    }

    #[test]
    fn test_should_fail_when_prologue_is_missing() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.rs");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "// Just a comment").unwrap();

        let violations = lint_source_headers(dir.path()).unwrap();
        assert!(violations > 0);
    }

    #[test]
    fn test_should_ignore_lean_shards() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("shard_123.json");
        let mut file = File::create(&file_path).unwrap();
        writeln!(file, "{{ \"data\": [] }}").unwrap();

        let violations = lint_source_headers(dir.path()).unwrap();
        assert_eq!(violations, 0);
    }
}
