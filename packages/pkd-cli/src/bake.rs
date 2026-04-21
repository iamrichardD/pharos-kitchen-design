/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Command-Line Interface (Bake Engine)
 * File: bake.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: Tantivy indexing and Zstd-compression for the Truth Engine.
 * Traceability: Issue #53 - ETL Bake
 * ======================================================================== */

use anyhow::{Result, anyhow};
use std::path::Path;
use tantivy::schema::*;
use tantivy::{Index, IndexWriter, doc};
use walkdir::WalkDir;
use std::fs::{File, self};
use tar::Builder;
use zstd::stream::write::Encoder;
use pkd_core::{PharosMetadata, PharosSchema};
use colored::*;

pub struct BakeEngine {
    schema: Schema,
    f_sku: Field,
    f_name: Field,
    f_manufacturer: Field,
    f_category: Field,
    f_voltage: Field,
    f_btu: Field,
    f_body: Field,
}

impl BakeEngine {
    pub fn new() -> Self {
        let mut schema_builder = Schema::builder();
        
        // Define Tantivy schema matching RFC 2378 attributes
        let f_sku = schema_builder.add_text_field("sku", STRING | STORED);
        let f_name = schema_builder.add_text_field("name", TEXT | STORED);
        let f_manufacturer = schema_builder.add_text_field("manufacturer", TEXT | STORED);
        let f_category = schema_builder.add_text_field("category", TEXT | STORED);
        let f_voltage = schema_builder.add_text_field("voltage", TEXT | STORED);
        let f_btu = schema_builder.add_text_field("btu", TEXT | STORED);
        let f_body = schema_builder.add_text_field("body", TEXT); // For full-text search across parameters

        Self {
            schema: schema_builder.build(),
            f_sku,
            f_name,
            f_manufacturer,
            f_category,
            f_voltage,
            f_btu,
            f_body,
        }
    }

    pub async fn run(&self, source: &Path, output: &Path) -> Result<()> {
        println!("{} Starting Bake Engine (Hybrid Hand-Off)...", "ℹ".blue());
        
        // 1. Validation Hard Gate: Validate all JSON files before indexing
        let mut files_to_index = Vec::new();
        let pharos_schema_json = include_str!("../../pkd-core/schema/pharos-schema.json");
        let pharos_schema: PharosSchema = serde_json::from_str(pharos_schema_json)?;

        for entry in WalkDir::new(source).into_iter().filter_map(|e| e.ok()) {
            if entry.path().extension().map_or(false, |ext| ext == "json") {
                let content = fs::read_to_string(entry.path())?;
                let metadata: PharosMetadata = serde_json::from_str(&content)
                    .map_err(|e| anyhow!("JSON Parsing Failure in {:?}: {}", entry.path(), e))?;

                // Validation Hard Gate (ADR-0023)
                if let Err(errors) = pkd_core::validator::SchemaValidator::validate_metadata(&pharos_schema, &metadata) {
                    println!("{} Validation FAILED for {:?}:", "✘".red(), entry.path());
                    for err in errors {
                        println!("  - {}", err.to_string().yellow());
                    }
                    return Err(anyhow!("Bake aborted: Integrity violation detected in source data."));
                }
                
                files_to_index.push((entry.path().to_path_buf(), metadata));
            }
        }

        println!("{} Validation complete. Indexing {} records...", "✔".green(), files_to_index.len());

        // 2. Tantivy Indexing
        let index_path = output.join("search-index");
        if index_path.exists() {
            fs::remove_dir_all(&index_path)?;
        }
        fs::create_dir_all(&index_path)?;

        let index = Index::create_in_dir(&index_path, self.schema.clone())?;
        let mut index_writer: IndexWriter = index.writer(50_000_000)?; // 50MB heap

        for (_, metadata) in files_to_index {
            let sku = metadata.parameters.get("PKD_ProductNumber")
                .or_else(|| metadata.parameters.get("PKD_ModelNumber"))
                .map(|v| v.to_string())
                .unwrap_or_else(|| metadata.metadata_id.clone());

            let name = metadata.name.clone();
            let mfr = metadata.parameters.get("PKD_Manufacturer").map(|v| v.to_string()).unwrap_or_default();
            let cat = metadata.parameters.get("PKD_MainCategory").map(|v| v.to_string()).unwrap_or_default();
            let volt = metadata.parameters.get("PKD_Voltage").map(|v| v.to_string()).unwrap_or_default();
            let btu = metadata.parameters.get("PKD_BTU").map(|v| v.to_string()).unwrap_or_default();
            
            // Full body search index
            let body = serde_json::to_string(&metadata.parameters)?;

            index_writer.add_document(doc!(
                self.f_sku => sku,
                self.f_name => name,
                self.f_manufacturer => mfr,
                self.f_category => cat,
                self.f_voltage => volt,
                self.f_btu => btu,
                self.f_body => body,
            ))?;
        }

        index_writer.commit()?;
        println!("{} Tantivy index created successfully.", "✔".green());

        // 3. Tar-and-Compress (search-index.tar.zst)
        let archive_path = output.join("search-index.tar.zst");
        println!("{} Compressing index into {:?}...", "ℹ".blue(), archive_path);
        
        let archive_file = File::create(&archive_path)?;
        let mut encoder = Encoder::new(archive_file, 3)?; // Compression level 3

        {
            let mut tar_builder = Builder::new(&mut encoder);
            tar_builder.append_dir_all("search-index", &index_path)?;
            tar_builder.finish()?;
        }

        encoder.finish()?;

        println!("{} Bake complete. Artifacts ready for promotion.", "✔".green());
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn test_should_create_index_and_archive_when_valid_json_provided() {
        let source_dir = TempDir::new().unwrap();
        let output_dir = TempDir::new().unwrap();
        
        // Create a valid Pharos JSON file with all mandatory parameters
        let valid_json = r#"{
            "pkd_prologue": { "project": "Pharos", "component": "Test", "file": "test.json", "author": "me", "license": "FSL-1.1", "purpose": "Testing", "traceability": "Issue-53" },
            "metadata_id": "PHX-TEST-001",
            "name": "Test Fryer",
            "schema_version": "1.0.0",
            "classification": { "omniclass_table_23": "23-33 11 11 11", "category": "Specialty Equipment" },
            "parameters": {
                "PKD_Manufacturer": "Frymaster",
                "PKD_ModelNumber": "TEST-100",
                "PKD_MainCategory": "Fryers",
                "PKD_TargetMarket": "Commercial",
                "PKD_Voltage": "208V",
                "PKD_Phase": 3,
                "PKD_Wattage": "4500W",
                "PKD_BTU": "0",
                "PKD_DrainConnection": "2\"",
                "PKD_DocLinks": [],
                "PKD_Industry": ["Foodservice"],
                "PKD_TargetRegions": ["US"],
                "PKD_AssetViews": {}
            },
            "lod_geometry_specs": { "100": { "type": "BoundingBox", "dimensions": { "width": "1", "depth": "1", "height": "1" }, "description": "test" } },
            "performance_metadata": { "estimated_rfa_size_kb": 1, "procedural_lod_enabled": true, "ghost_link_active": false }
        }"#;
        
        fs::write(source_dir.path().join("test.json"), valid_json).unwrap();

        let engine = BakeEngine::new();
        let result = engine.run(source_dir.path(), output_dir.path()).await;
        
        if let Err(e) = &result {
            println!("Bake Error: {}", e);
        }
        assert!(result.is_ok());
        assert!(output_dir.path().join("search-index.tar.zst").exists());
        assert!(output_dir.path().join("search-index").exists());
    }

    #[tokio::test]
    async fn test_should_fail_fast_when_invalid_json_provided() {
        let source_dir = TempDir::new().unwrap();
        let output_dir = TempDir::new().unwrap();
        
        // Missing mandatory fields
        let invalid_json = r#"{"name": "Incomplete"}"#;
        fs::write(source_dir.path().join("bad.json"), invalid_json).unwrap();

        let engine = BakeEngine::new();
        let result = engine.run(source_dir.path(), output_dir.path()).await;
        
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("Bake aborted") || err_msg.contains("JSON Parsing Failure"));
    }
}
