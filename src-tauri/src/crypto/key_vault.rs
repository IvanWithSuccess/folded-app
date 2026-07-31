use argon2::{password_hash::rand_core::OsRng, Argon2};
use rand::RngCore;
use zeroize::{Zeroize, ZeroizeOnDrop};

/// Secure key container that zeroizes memory on drop or explicit wipe.
#[derive(Zeroize, ZeroizeOnDrop)]
pub struct KeyVault {
    master_key: [u8; 32],
}

impl KeyVault {
    /// Create a KeyVault by deriving a 32-byte key from password and salt using Argon2id.
    pub fn derive(password: &str, salt: &[u8]) -> Result<Self, anyhow::Error> {
        let mut key = [0u8; 32];
        let argon2 = Argon2::default();


        argon2
            .hash_password_into(password.as_bytes(), salt, &mut key)
            .map_err(|e| anyhow::anyhow!("Argon2id key derivation error: {}", e))?;

        Ok(Self { master_key: key })
    }

    /// Creates a key vault from an existing 32-byte key.
    pub fn from_raw(key: [u8; 32]) -> Self {
        Self { master_key: key }
    }

    /// Access the raw key bytes for encryption/decryption operations.
    pub fn key(&self) -> &[u8; 32] {
        &self.master_key
    }

    /// Wipes key memory immediately.
    pub fn wipe(&mut self) {
        self.master_key.zeroize();
    }

    /// Helper to generate a random 16-byte salt for new vaults.
    pub fn generate_salt() -> [u8; 16] {
        let mut salt = [0u8; 16];
        OsRng.fill_bytes(&mut salt);
        salt
    }
}
