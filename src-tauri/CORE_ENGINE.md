# Folded Cloud: Core Engine Documentation

Welcome to the heart of Folded Cloud. This document describes the architecture and security principles of the underlying Rust engine that powers the application.

## Architecture Overview

The Folded Cloud Engine is designed as a standalone Rust library (`lib.rs`) that can be integrated into different frontends (like our Tauri-based GUI) or run as a CLI tool.

### Key Components

1. **Session Manager (`session_manager/`)**
   - Handles low-level communication with Telegram using the `grammers` library.
   - Manages multiple concurrent accounts.
   - Responsible for secure session storage and MTProto protocol handling.

2. **Metadata Cache (`cache/`)**
   - A high-performance SQLite-based index of your cloud files.
   - Synchronizes file trees from Telegram "Saved Messages" without downloading actual content.
   - Enables instant search and navigation across all connected accounts.

3. **Cluster Orchestrator (`cluster/`)**
   - The logic behind "Virtual Volumes".
   - Handles file slicing (chunking) for large files.
   - Manages mirrors and data distribution across multiple Telegram hubs.

4. **WebDAV Bridge (`webdav/`)**
   - Acts as a translator between the cloud engine and your Operating System.
   - Exposes the virtual cloud as a local network drive, allowing any app (Finder, VLC, Word) to read cloud files directly.

## Security & Privacy

We adhere to the **"Zero-Server"** principle:
- **Direct Connection**: All communication happens directly between your computer and Telegram's official servers (MTProto).
- **No Middlemen**: We do not operate any middle-man servers. Your IP address and data are never seen by us.
- **Local Keys**: Your session keys and database are stored strictly on your local machine.

## Technical Audit & Demonstration

To ensure transparency, we provide a standalone demonstration of the core engine. This allows security researchers and developers to verify the logic without the complexity of the GUI.

### Running the Core Demo

You can run the reference implementation of the core directly from the source:

```bash
cd src-tauri
cargo run --bin core-demo
```

**What the demo does:**
1. Initializes a local demo database.
2. Connects to the Session Manager.
3. Lists active cloud accounts and their root file structures.
4. Proves the integrity of the indexing logic.

---

## Developer Integration

The engine is exposed as a Rust crate named `folded`. You can import it into your own Rust projects:

```rust
use folded::{SessionManager, MetadataCache};

// Initialize the engine...
```

For bug reports or technical inquiries, please visit our [Issues page](https://github.com/IvanWithSuccess/folded-app/issues).
