# 📂 Folded Git

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75%2B-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-PolyForm_Shield-orange.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows-blue?logo=apple&logoColor=white)](#)

**Folded Git** is a high-performance cross-platform desktop application (macOS & Windows) that turns your Telegram accounts into a secure, distributed version control system and unlimited cloud storage.

The app allows you to track code changes with Git-style commits and branching, create system snapshots, stream media on demand, and mount your cloud storage as a native virtual network drive via an embedded WebDAV bridge.

---

## ⚙️ How It Works

**Folded Git** combines Git version control primitives with MTProto Telegram cloud chunking:

### 1. Git-Style Version Control
* **Commits & History**: Create version snapshots of your code and project folders. View file diffs with side-by-side added (`+`) and deleted (`-`) line highlights.
* **Branching & Merging**: Create feature branches, switch HEAD commits, and resolve merge conflicts interactively inside the app.
* **Push & Pull**: Synchronize local commits with Telegram Cloud ("Saved Messages").

### 2. Intelligent Chunking & MTProto Transport
When pushing files or committing snapshots, Folded Git automatically splits large files into optimized chunks (up to 1.9 GB for regular accounts, and up to 3.9 GB for Telegram Premium). Data is transferred directly to Telegram servers using native MTProto clients.

### 3. Local Meta-Index (SQLite)
Repository states, commit histories, trees, and file hashes are indexed locally in a SQLite database (`metadata_db.sqlite`). Finding files, inspecting history, and computing diffs is instantaneous without making blocking network calls.

### 4. Virtual Network Drive & Streaming (WebDAV Bridge)
An embedded WebDAV server emulates a network drive (`Finder` on macOS, `File Explorer` on Windows):
* The OS sends standard HTTP Range requests to the local WebDAV bridge (`127.0.0.1:9876`).
* The bridge maps byte offsets to specific Telegram chunks.
* Data streams on the fly, allowing you to play 4K video or open large documents without pre-downloading entire files to disk.

---

## 🌟 Key Features

* **🔀 Full Git Version Control**: Commits, branch management, visual line diff viewer, checkout, rollbacks, and interactive conflict resolution.
* **🚀 Multi-Account Cluster**: Merge multiple Telegram accounts into a single storage cluster where each account acts as a node.
* **📤 Native WebDAV Mount**: Mount your storage as a local drive (`Finder` / `Explorer`) with direct drag-and-drop file transfers.
* **📡 On-Demand Media Streaming**: Play videos, preview audio, and open documents directly from Telegram Cloud.
* **📸 Snapshot Manager**: Create manual or scheduled system-wide snapshots (Hourly, Daily, Weekly, Monthly) with automated sequence tracking.
* **📋 Task Queue & Transfers**: Real-time progress monitoring for active file uploads, downloads, and background sync operations.
* **🖥️ System Tray & Background Daemon**: Runs silently in the system tray, keeping WebDAV mounts active when the main window is closed.

---

## 🛠️ Tech Stack

### Rust Engine (`src-tauri`)
* **Tauri v2**: Desktop framework for native OS integration and cross-platform window management.
* **Grammers**: Asynchronous MTProto client for direct communication with Telegram servers.
* **SQLx + SQLite**: High-performance local metadata index for commits, files, and settings.
* **Axum + dav-server**: WebDAV bridge implementation handling HTTP range requests and local drive emulation.

### Frontend (`src`)
* **React 18** + **TypeScript** + **Vite**: Reactive UI engine.
* **Tailwind CSS 4**: Modern styling with CSS variables and dark/light design system.
* **Lucide React**: Clean developer-friendly iconography.
* **Zustand**: Lightweight state management.

---

## 🚀 Installation & Building

### Pre-built Releases
Download ready-to-run installers for **macOS** (`.dmg`, `.app`) and **Windows** (`.exe`, `.msi`) directly from the [GitHub Releases](https://github.com/IvanWithSuccess/folded-app/releases) page.

### Building from Source

#### Prerequisites
* **Rust**: `rustc` and `cargo` 1.75 or higher.
* **Node.js**: Version 18.0 or higher.

#### Steps
1. **Clone the repository**:
   ```bash
   git clone https://github.com/IvanWithSuccess/folded-app.git
   cd folded-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npx tauri dev
   ```

4. **Build production binary**:
   ```bash
   npm run build && npx tauri build
   ```

---

## 🔒 Security & Privacy

* **Direct MTProto Connection**: Data transfers occur directly between your device and Telegram's official servers. No third-party relays or tracking servers.
* **Local Session Storage**: Authentication keys (`~/.folded/sessions/`) and SQLite indexes (`~/.folded/metadata_db.sqlite`) reside entirely on your machine.
* **Safe OS Unmounting**: Automatic ejection of stale network mounts on startup and shutdown to prevent system volume conflicts.
