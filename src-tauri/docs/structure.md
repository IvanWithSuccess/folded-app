# Project Structure: Folded

This document describes the organization of the Folded application backend (Rust).

## Folder Structure

### `src-tauri/src/`
- **`main.rs`**: Entry point of the Tauri application. Initializes the tray icon, state, and registers commands.
- **`cache/`**: Metadata cache system (SQLite). Responsible for local tracking of files, folders, and synchronization state.
  - `mod.rs`: Main entry point for the cache module. Currently contains all cache logic (planned for refactoring).
- **`cluster/`**: Core logic for interacting with Telegram as a storage provider.
  - `mod.rs`: Entry point for the cluster module.
  - `hubs.rs`: Management of storage hubs (Telegram channels/chats).
  - `ops.rs`: High-level operations (upload, download, delete).
  - `sync.rs`: Synchronization logic between Telegram and local cache.
  - `task_manager.rs`: Background task execution (e.g., scheduled uploads/mirrors).
  - `types.rs`: Shared types for the cluster module.
  - `utils.rs`: Helper functions for Telegram interactions.
  - `mirrors.rs`: Logic for mirroring local directories to Telegram.
  - `notes.rs`: Storage and management of encrypted notes.
- **`commands/`**: Tauri command handlers (exposed to the frontend).
  - `auth.rs`: Authentication-related commands.
  - `cluster.rs`: Commands for managing hubs and cluster state.
  - `fs.rs`: File system operations (list, create folder, move, etc.).
  - `mirrors.rs`: Commands for managing mirroring rules.
  - `notes.rs`: Commands for managing encrypted notes.
  - `settings.rs`: Commands for app settings.
  - `system.rs`: General system commands (sharing, stats, etc.).
  - `versions.rs`: Commands for file versioning and history.
  - `cache.rs`: Commands for cache maintenance.
  - `mod.rs`: Command registration and exports.
- **`os_integration/`**: Operating system specific integrations (e.g., file explorer shortcuts).
- **`session_manager/`**: Management of Telegram sessions and authentication state.
- **`webdav/`**: WebDAV server implementation to allow mounting Folded as a network drive.
  - `fs.rs`: WebDAV file system backend implementation.

## Key Components

### Metadata Cache (`cache/`)
The metadata cache is the heart of Folded's "virtual file system". It maps file and folder structures to Telegram messages (chunks). It supports:
- **Versioning**: Storing multiple versions of the same file name.
- **Soft-Delete**: Marking items as deleted without immediately removing them from Telegram.
- **Mirroring**: Automatically uploading local changes to specific Telegram folders.

### Cluster Engine (`cluster/`)
The cluster engine handles the low-level Telegram API calls (via `grammers`). It breaks files into chunks, encrypts them, and uploads them to "Storage Hubs".

### WebDAV Server (`webdav/`)
The WebDAV server provides a standard interface for the OS to interact with Folded. This allows users to use Folded just like a normal folder on their computer.
