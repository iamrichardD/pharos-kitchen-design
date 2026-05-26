/* ========================================================================
 * Project: Pharos Kitchen Design (Project Prism)
 * Component: Core / Lazy Loader
 * File: lazy_loader.rs
 * Author: Richard D. (https://github.com/iamrichardd)
 * License: FSL-1.1 (See LICENSE file for details)
 * Purpose: JIT shard retrieval and verification logic.
 * Traceability: Issue #124, Task 5.2.2
 * ======================================================================== */

use crate::models::metadata::RegistryShard;
use crate::security::verify_bytes;
use anyhow::{anyhow, Context, Result};
use std::collections::HashMap;
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;

/// Why: Abstraction for target-aware fetching (WASM vs Native).
/// Integrity: Allows mocking the network layer for high-rigor unit testing.
pub trait ShardFetcher: Send + Sync {
    fn fetch(&self, url: String) -> Pin<Box<dyn Future<Output = Result<Vec<u8>>> + Send>>;
}

pub struct LazyShardLoader {
    base_url: String,
    manifest: HashMap<String, String>, // Shard ID -> SHA256
    fetcher: Arc<dyn ShardFetcher>,
}

impl LazyShardLoader {
    /// Why: Primary entry point for production environments (Cloudflare R2).
    /// Integrity: Bootstraps with the SHA-256 manifest to enforce the high-rigor guard.
    pub fn new(
        base_url: String,
        manifest: HashMap<String, String>,
        fetcher: Arc<dyn ShardFetcher>,
    ) -> Self {
        Self {
            base_url,
            manifest,
            fetcher,
        }
    }

    /// Why: Atomic retrieval and verification of a data shard.
    /// Security: Validates the shard hash against the manifest BEFORE deserialization.
    /// Fail-Fast: Immediately errors if manifest mismatch or network failure occurs.
    pub async fn load_shard(&self, shard_id: &str) -> Result<RegistryShard> {
        let expected_hash = self.manifest.get(shard_id).ok_or_else(|| {
            anyhow!(
                "[Security] Shard ID {} not found in authoritative manifest.",
                shard_id
            )
        })?;

        let shard_url = format!("{}/shard_{}.json", self.base_url, shard_id);

        let bytes = self
            .fetcher
            .fetch(shard_url)
            .await
            .with_context(|| format!("Failed to fetch shard {}", shard_id))?;

        // High-Rigor Integrity: Verify BEFORE deserialization
        verify_bytes(&bytes, expected_hash).map_err(|e| {
            anyhow!(
                "[Security] Integrity check failed for shard {}: {}",
                shard_id,
                e
            )
        })?;

        let shard: RegistryShard = serde_json::from_slice(&bytes)
            .with_context(|| format!("Failed to deserialize shard {}", shard_id))?;

        Ok(shard)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sha2::Digest;
    use std::collections::BTreeMap;

    struct MockFetcher {
        data: HashMap<String, Vec<u8>>,
    }

    impl ShardFetcher for MockFetcher {
        fn fetch(&self, url: String) -> Pin<Box<dyn Future<Output = Result<Vec<u8>>> + Send>> {
            let res = self
                .data
                .get(&url)
                .cloned()
                .ok_or_else(|| anyhow!("404 Not Found: {}", url));
            Box::pin(async move { res })
        }
    }

    #[tokio::test]
    async fn test_should_load_shard_when_valid_manifest_and_data() {
        let mut manifest = HashMap::new();
        let shard_id = "test_shard";

        let shard = RegistryShard {
            shard_id: shard_id.to_string(),
            v: "1.0.0".to_string(),
            records: BTreeMap::new(),
        };
        let shard_bytes = serde_json::to_vec(&shard).unwrap();

        let mut hasher = sha2::Sha256::new();
        Digest::update(&mut hasher, &shard_bytes);
        let hash = hex::encode(Digest::finalize(hasher));

        manifest.insert(shard_id.to_string(), hash);

        let mut data = HashMap::new();
        data.insert(
            format!("https://cdn.example.com/shard_{}.json", shard_id),
            shard_bytes,
        );

        let fetcher = Arc::new(MockFetcher { data });
        let loader = LazyShardLoader::new("https://cdn.example.com".to_string(), manifest, fetcher);

        let result = loader.load_shard(shard_id).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().shard_id, shard_id);
    }

    #[tokio::test]
    async fn test_should_fail_fast_when_manifest_mismatch() {
        let mut manifest = HashMap::new();
        let shard_id = "bad_shard";
        manifest.insert(shard_id.to_string(), "wrong_hash".to_string());

        let shard = RegistryShard {
            shard_id: shard_id.to_string(),
            v: "1.0.0".to_string(),
            records: BTreeMap::new(),
        };
        let shard_bytes = serde_json::to_vec(&shard).unwrap();

        let mut data = HashMap::new();
        data.insert(
            format!("https://cdn.example.com/shard_{}.json", shard_id),
            shard_bytes,
        );

        let fetcher = Arc::new(MockFetcher { data });
        let loader = LazyShardLoader::new("https://cdn.example.com".to_string(), manifest, fetcher);

        let result = loader.load_shard(shard_id).await;
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Integrity check failed"));
    }

    #[tokio::test]
    async fn test_should_fail_fast_when_network_error() {
        let mut manifest = HashMap::new();
        manifest.insert("missing".to_string(), "some_hash".to_string());

        let fetcher = Arc::new(MockFetcher {
            data: HashMap::new(),
        });
        let loader = LazyShardLoader::new("https://cdn.example.com".to_string(), manifest, fetcher);

        let result = loader.load_shard("missing").await;
        assert!(result.is_err());
        assert!(format!("{:?}", result.unwrap_err()).contains("404 Not Found"));
    }
}
