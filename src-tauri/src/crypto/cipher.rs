use chacha20poly1305::{
    aead::{Aead, KeyInit, OsRng},
    XChaCha20Poly1305, XNonce,
};
use rand::RngCore;

const NONCE_LEN: usize = 24;

/// Encrypts raw binary chunk data using XChaCha20-Poly1305 with a random 24-byte nonce.
/// The nonce is prepended to the ciphertext in the returned buffer.
pub fn encrypt_payload(key_bytes: &[u8; 32], plaintext: &[u8]) -> Result<Vec<u8>, anyhow::Error> {
    let cipher = XChaCha20Poly1305::new(key_bytes.into());
    let mut nonce_bytes = [0u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = XNonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext)
        .map_err(|e| anyhow::anyhow!("Encryption failure: {:?}", e))?;

    let mut output = Vec::with_capacity(NONCE_LEN + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);
    Ok(output)
}

/// Decrypts a binary payload (nonce + ciphertext) using XChaCha20-Poly1305.
pub fn decrypt_payload(key_bytes: &[u8; 32], encrypted_data: &[u8]) -> Result<Vec<u8>, anyhow::Error> {
    if encrypted_data.len() < NONCE_LEN {
        return Err(anyhow::anyhow!("Encrypted payload too short"));
    }

    let (nonce_bytes, ciphertext) = encrypted_data.split_at(NONCE_LEN);
    let cipher = XChaCha20Poly1305::new(key_bytes.into());
    let nonce = XNonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| anyhow::anyhow!("Decryption failed: invalid key or tampered payload"))?;

    Ok(plaintext)
}

/// Encrypts a string (e.g. filename or path) and returns URL-safe / hex representation.
pub fn encrypt_string(key_bytes: &[u8; 32], text: &str) -> Result<String, anyhow::Error> {
    let encrypted = encrypt_payload(key_bytes, text.as_bytes())?;
    Ok(hex::encode(encrypted))
}

/// Decrypts a hex string back to plaintext UTF-8 string.
pub fn decrypt_string(key_bytes: &[u8; 32], hex_text: &str) -> Result<String, anyhow::Error> {
    let bytes = hex::decode(hex_text).map_err(|e| anyhow::anyhow!("Hex decode error: {}", e))?;
    let decrypted = decrypt_payload(key_bytes, &bytes)?;
    let text = String::from_utf8(decrypted).map_err(|e| anyhow::anyhow!("UTF-8 decode error: {}", e))?;
    Ok(text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_payload_roundtrip() {
        let key = [7u8; 32];
        let original = b"Top secret data payload for Telegram storage";
        let encrypted = encrypt_payload(&key, original).unwrap();
        assert_ne!(encrypted, original);
        let decrypted = decrypt_payload(&key, &encrypted).unwrap();
        assert_eq!(decrypted, original);
    }

    #[test]
    fn test_string_roundtrip() {
        let key = [42u8; 32];
        let original_filename = "Personal_Document_2026.pdf";
        let enc_str = encrypt_string(&key, original_filename).unwrap();
        let dec_str = decrypt_string(&key, &enc_str).unwrap();
        assert_eq!(dec_str, original_filename);
    }
}
