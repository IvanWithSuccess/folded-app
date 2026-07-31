use crate::crypto::{decrypt_payload, encrypt_payload};
use crate::ledger::manifest::SnapshotManifest;

/// Encrypts a SnapshotManifest into an opaque binary blob for cloud storage.
pub fn pack_encrypted_snapshot(
    key_bytes: &[u8; 32],
    manifest: &SnapshotManifest,
) -> Result<Vec<u8>, anyhow::Error> {
    let json_bytes = serde_json::to_vec(manifest)?;
    encrypt_payload(key_bytes, &json_bytes)
}

/// Decrypts an opaque binary snapshot blob from cloud storage into a SnapshotManifest.
pub fn unpack_encrypted_snapshot(
    key_bytes: &[u8; 32],
    encrypted_blob: &[u8],
) -> Result<SnapshotManifest, anyhow::Error> {
    let decrypted_bytes = decrypt_payload(key_bytes, encrypted_blob)?;
    let manifest: SnapshotManifest = serde_json::from_slice(&decrypted_bytes)?;
    Ok(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ledger::manifest::FileNode;

    #[test]
    fn test_snapshot_pack_unpack() {
        let key = [99u8; 32];
        let manifest = SnapshotManifest::new(
            "device-macbook-pro".into(),
            1,
            vec![FileNode {
                relative_path: "documents/passwords.txt".into(),
                size: 1024,
                is_dir: false,
                modified_at: 1700000000,
                chunks: vec![],
            }],
        );

        let packed = pack_encrypted_snapshot(&key, &manifest).unwrap();
        let unpacked = unpack_encrypted_snapshot(&key, &packed).unwrap();

        assert_eq!(unpacked.snapshot_id, manifest.snapshot_id);
        assert_eq!(unpacked.files.len(), 1);
        assert_eq!(unpacked.files[0].relative_path, "documents/passwords.txt");
    }
}
