use folded::{SessionManager, MetadataCache, ClusterOrchestrator};
use std::sync::Arc;
use tokio::io::{self, AsyncBufReadExt, BufReader};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("--- Folded Cloud Core Demonstration ---");
    println!("This tool demonstrates the underlying Rust engine of Folded Cloud.");
    println!("---------------------------------------\n");

    // 1. Initialize the Metadata Cache (SQLite-based)
    let home = std::env::var("HOME")?;
    let db_path = format!("{}/.folded-cloud-demo.db", home);
    println!("[1/3] Initializing Metadata Cache at {}...", db_path);
    let cache = Arc::new(MetadataCache::new(&db_path).await?);

    // 2. Initialize the Session Manager (Telegram interactions)
    println!("[2/3] Setting up Session Manager...");
    let session_manager = Arc::new(SessionManager::new(
        26947469, // Demo API ID
        "731a222f9dd8b290db925a6a382159dd", // Demo API HASH
        &format!("{}/.folded-sessions-demo", home)
    ).await?);

    // 3. Load existing sessions
    session_manager.load_sessions().await?;
    let accounts = session_manager.get_active_accounts().await;

    if accounts.is_empty() {
        println!("\nNo active sessions found.");
        println!("To see the core in action, you would typically run a login flow here.");
        println!("Code snippet for researchers:");
        println!(r#"
            // Example of how the core requests a code:
            // let sign_in = client.request_qr_code().await?;
            // println!("Scan this QR or use phone auth...");
        "#);
    } else {
        println!("\n[3/3] Active accounts found: {}", accounts.len());
        for acc in accounts {
            println!(" - Account ID: {} (Status: {})", acc.id, acc.status);
            
            // Demonstrate listing from cache
            let files = cache.list_files(&acc.id, "/").await?;
            println!("   Total files in root index: {}", files.len());
            for f in files.iter().take(5) {
                println!("    * {} (ID: {})", f.name, f.id);
            }
            if files.len() > 5 {
                println!("    ... and {} more", files.len() - 5);
            }
        }
    }

    println!("\n---------------------------------------");
    println!("Demo completed successfully.");
    println!("The core engine is isolated, secure, and ready for integration.");
    Ok(())
}
