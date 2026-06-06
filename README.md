# 📂 Folded Cloud

[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC107?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust](https://img.shields.io/badge/Rust-1.75%2B-000000?logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![License](https://img.shields.io/badge/License-PolyForm_Shield-orange.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-macOS-blue?logo=apple&logoColor=white)](#)

**Folded Cloud** is a high-performance native macOS application that turns your Telegram accounts into a unified, distributed cluster of unlimited cloud storage with deep operating system integration.

The app allows you to mount your storage as a virtual network drive, providing instant read/write access to files and media streams directly through the native macOS Finder, without requiring you to pre-download files to your local machine.

---

## ⚙️ How It Works

The system is built on the principles of local metadata indexing and on-demand data streaming:

### 1. Intelligent Chunking
When uploading a file to the cloud, the app automatically splits it into optimized segments (up to 1.9 GB for regular accounts, and up to 3.9 GB for Telegram Premium). This bypasses Telegram's message size limit and ensures robust transfer of files of any size.

### 2. Local Meta-Index (SQLite)
Your entire directory structure, folders, and links between files and Telegram messages are cached locally in a SQLite database. Finding, sorting, and browsing your files is instantaneous since it requires no constant requests to the Telegram API.

### 3. Virtual Drive & Streaming (WebDAV Bridge)
An embedded WebDAV server emulates a network file system. When you play a video or open a document in Finder:
* The OS sends standard HTTP Range requests to the local bridge.
* The bridge maps the requested byte offsets to specific Telegram messages and chunks.
* The MTProto client requests the precise range directly from Telegram servers.
* Data streams on-the-fly, allowing you to play 4K video or skip around media instantly without downloading the whole file.

---

## 🌟 Key Features

* **🚀 Multi-account Cluster**: Merge multiple Telegram accounts into a single storage array. Each account acts as an independent storage node.
* **📤 WebDAV R/W Integration**: Mount the cloud as a local network drive with full read and write capabilities, allowing you to drag-and-drop files directly in Finder to upload them.
* **📡 On-Demand Streaming**: Play media, open documents, and view images without downloading them to your local disk first.
* **🔄 Autonomous Background Crawler**: A background worker scans your selected chats and "Saved Messages" to index newly found files automatically.
* **📝 Cloud Notes**: Text editor with file attachment support, storing notes directly on Telegram.
* **🖥️ System Tray Integration**: Runs as a background daemon, keeping the WebDAV bridge active even when the main app window is closed.

---

## 🛠️ Tech Stack

### Rust (Backend / Core Engine)
* **Tauri v2**: Lightweight and secure Electron alternative for the user interface and native OS integration.
* **Grammers**: High-performance asynchronous MTProto client for low-level interaction with Telegram servers.
* **SQLx + SQLite**: Secure and reliable local metadata storage with support for transactions and database migrations.
* **Axum**: Lightweight web framework implementing the local WebDAV server.

### TypeScript / React (Frontend)
* **React 18** + **Vite**: Ultra-fast UI build and reactive component updates.
* **Tailwind CSS 4**: Modern styling system utilizing design tokens and CSS variables.
* **Zustand**: Simple, lightweight state management.
* **Lucide React**: Clean and modern developer-friendly icons.

---

## 🚀 Installation & Setup

### System Requirements
* **Rust**: `rustc` and `cargo` version 1.75 or higher.
* **Node.js**: Version 18.0 or higher.
* **OS**: macOS 12+ (tested on both Apple Silicon and Intel).

### Step-by-Step Guide

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

4. **Build the production release**:
   ```bash
   npx tauri build
   ```
   *The built `.dmg` or `.app` bundle will be located in the `src-tauri/target/release/bundle/` directory.*

---

## 🔒 Security & Privacy

Privacy was a core design priority:
* **No Middlemen**: All API requests and file chunks go directly between your device and Telegram's servers. No third-party trackers or telemetry.
* **Local Session Storage**: Auth sessions (`~/.folded/sessions/`) and your SQLite index database (`~/.folded/metadata_db.sqlite`) are stored entirely on your local machine, secured by OS file permissions.
* **Session Encryption**: Authentication credentials and MTProto keys are fully protected by Telegram's native cryptographic protocols.

---

## 📄 License

This project is licensed under the PolyForm Shield License 1.0.0. 

Under this license, you are free to use, copy, modify, and distribute the software for any purpose **except** for creating a product or service that competes with Folded Cloud or any other product/service provided by the copyright holder (**IvanSuccess**).

For the full terms, please see the [LICENSE](file:///Users/ivan/.gemini/antigravity/scratch/folded-app/LICENSE) file.

