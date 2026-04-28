# 📂 Folded Cloud

**Folded Cloud** is a professional, high-performance Telegram-based cloud storage application. It transforms your Telegram accounts into a unified, unlimited, and high-speed personal storage cluster with deep OS integration.

![Folded Logo](Logo.png)

## ✨ Key Features

- **🚀 Unified Storage Cluster**: Seamlessly combine multiple Telegram accounts into a single, massive storage pool.
- **📦 Intelligent Chunking**: Automatically fragments large files (up to any size) into optimized chunks (1.9GB or 3.9GB for Premium) to bypass platform limits.
- **📡 Instant Streaming (WebDAV)**: Stream 4K media and access massive files directly from Telegram servers via a virtual filesystem—no full download required.
- **🖥️ Native OS Integration**: Mount your Folded Cloud as a real network drive on **macOS** and **Windows** for direct access via Finder or Explorer.
- **🔄 Industrial Background Engine**: A high-efficiency Rust-based crawler that monitors and indexes "Saved Messages" in real-time.
- **📝 Secure Notes**: Integrated note-taking system with cloud-synced attachments, protected by Telegram's infrastructure.
- **🛡️ Privacy First**: All sessions, keys, and metadata are stored exclusively on your local machine in an encrypted-ready SQLite database.
- **🎨 Industrial Aesthetics**: A high-end, dark-mode "Industrial Design" interface built for power users.

## 🛠️ Technology Stack

- **Core**: [Rust](https://www.rust-lang.org/) + [Tauri v2](https://tauri.app/)
- **Telegram Engine**: [Grammers](https://github.com/Lonami/grammers) (Asynchronous MTProto implementation)
- **Data Persistence**: [SQLite](https://www.sqlite.org/) with [SQLx](https://github.com/launchbadge/sqlx)
- **Frontend**: [React 18](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS 4](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Virtual Drive**: Custom WebDAV bridge for low-latency filesystem emulation.

## 🏗️ Architecture

- **Metadata Engine**: A high-performance local indexer that maps virtual files to Telegram message nodes.
- **Cluster Orchestrator**: Manages multi-account distribution, chunking logic, and reassembly.
- **Session Manager**: Handles secure authentication, including 2FA and QR-based logins.
- **WebDAV Bridge**: Translates OS filesystem calls into asynchronous Telegram API requests for on-demand data retrieval.

## 🚀 Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://tauri.app/v2/guides/getting-started/prerequisites/) (`cargo install tauri-cli`)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-repo/folded.git
   cd folded
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run in development mode**:
   ```bash
   npm run tauri dev
   ```

4. **Build for production**:
   ```bash
   npm run tauri build
   ```

## 🔒 Security & Privacy

Folded Cloud is built on the principle of local-first data.
- **No External Servers**: The app communicates directly with Telegram servers.
- **Local Credentials**: Session files (`~/.folded/sessions/`) and your file index (`~/.folded/metadata_db.sqlite`) never leave your device.
- **Open Protocol**: Uses standard WebDAV for local OS mounting.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with 🦀 and ⚛️ for the open web.
