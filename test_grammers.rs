use grammers_client::{Client, Config};
use grammers_session::MemorySession;

#[tokio::main]
async fn main() {
    let client = Client::connect(Config {
        session: MemorySession::new(),
        api_id: 1,
        api_hash: "123".to_string(),
        params: Default::default(),
    }).await.unwrap();
    client.sign_out().await.unwrap();
}
