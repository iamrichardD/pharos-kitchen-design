# Security Policy: Pharos Kitchen Design (Project Prism)

## 1. Security Philosophy: Shift-Left & Automated Audit
Security is not an afterthought in **Pharos Kitchen Design**. We prioritize **Shift-Left Security** during the research phase of every feature to identify attack vectors before code is written.

### Automated Vulnerability Detection
All code execution and testing MUST occur in an isolated **Podman environment**. Automated security scans are mandatory:
- **Rust Core:** `cargo audit` is run on every build to detect crate vulnerabilities.
- **Frontend/Web:** `npm audit` is run on every CI/CD deployment.
- **BIM Content:** Forensic GUID mappings are audited for potential data injection vectors.

## 2. Reporting a Vulnerability
If you discover a security vulnerability in Pharos Kitchen Design, please DO NOT report it publicly. Instead, follow these steps:
1.  **Direct Communication:** Send an email to Richard D. via the contact methods on [iamrichardd.com](https://iamrichardd.com).
2.  **Disclosure:** We aim to acknowledge reports within 48 hours and provide a fix or mitigation within 10 business days.
3.  **Bounty:** At this bootstrap stage, we offer public recognition (unless anonymity is requested) and priority feedback for independent designers.

## 3. Scope
This policy applies to:
- The **PKD Core** (Rust/WASM engine).
- The **PKD Bridge** (Legacy IPC logic).
- The **PKD Schema** (JSON-first source of truth).
- All official samples and documentation.

## 4. Unsupported Versions
Security patches are only released for the current **Stable** version (SemVer main branch). We do not support legacy versions of the POC.
