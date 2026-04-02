<!-- ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Forensics / Methodology
 * File: FORENSICS_WORKFLOW.md
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Defines the methodology for technical interface normalization.
 * Traceability: ADR 0005, ADR 0009
 * ======================================================================== -->

# Technical Methodology: Interface Normalization & Bridged Interoperability

## 1. Path Identification (Environment Parity)
Identify technical installation and cache paths to define the necessary parameters for software interoperability:
- `%PROGRAMDATA%` - Analyze local manifests or .sqlite/.xml caches for technical data.
- `%APPDATA%\...\Revit` - Identify user-specific configuration for interface alignment.
- `C:\Program Files (x86)\...` - Analyze core binaries to understand technical communication patterns.

## 2. Technical Analysis (.NET/Revit)
Methodology for defining the **Bridged-Interface**:
1.  **Interface Assemblies:** Identify assemblies responsible for parameter transmission (e.g., `ParameterMapping`, `BimUpdate`).
2.  **Method Mapping:** Analyze methods that interface with `Autodesk.Revit.DB` to understand how external data is normalized into BIM parameters.
3.  **MVM Alignment:** Define the **Minimum Viable Metadata (MVM)** required for independently created families to achieve 100% interoperability with existing industry schedules.

## 3. Workflow Diagram (Process Logic)
- **Input:** Technical Installation Root / Local Database.
- **Process A:** Extract technical parameters from local manifests.
- **Process B:** Identify interface requirements via assembly analysis.
- **Validation:** Compare extracted parameters against the **PKD Core Schema**.
- **Output:** Validated **`pkd-bridge`** interface map.
