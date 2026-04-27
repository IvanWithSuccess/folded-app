# 📂 Folded Cloud

**Folded Cloud** is a powerful, multi-account Telegram-based cloud storage application. It turns your Telegram accounts into a unified, unlimited, and high-speed personal cloud storage system with a native OS integration.

![Folded Logo](Logo.png)

## ✨ Key Features

- **🚀 Unlimited Storage**: Utilize multiple Telegram accounts as a single, expandable storage cluster.
- **📦 Smart Chunking**: Automatically splits large files (up to any size) into binary chunks (1.9GB or 3.9GB for Premium) to bypass Telegram's file size limits.
- **📡 Native Streaming (WebDAV)**: Stream 4K movies and large files directly from Telegram servers without full downloading.
- **🖥️ OS Integration**: Mount your Folded Cloud as a real network drive on **macOS** and **Windows** (Finder/Explorer).
- **🔄 Background Sync**: Silent background engine (Crawler) that automatically indexes new files uploaded to "Saved Messages".
- **📝 Integrated Notes**: A simple and fast note-taking system with file attachments, synchronized via Telegram.
- **🛡️ Privacy Focused**: All sessions and metadata are stored locally on your machine in an encrypted-ready SQLite database.
- **🎨 Premium UI/UX**: Modern, responsive interface built with React and Tailwind CSS, providing a seamless file management experience.

## 🛠️ Technology Stack

- **Backend**: [Rust](https://www.rust-lang.org/) with [Tauri](https://tauri.app/)
- **Telegram Client**: [Grammers](https://github.com/Lonami/grammers) (Asynchronous Telegram API)
- **Database**: [SQLite](https://www.sqlite.org/) with [SQLx](https://github.com/launchbadge/sqlx)
- **Frontend**: [React](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Virtual Drive**: WebDAV protocol implementation for native OS mounting.

## 🏗️ Architecture

The project is designed with a modular architecture for high performance and maintainability:

- **Metadata Cache**: A high-performance SQLite-backed cache that manages virtual file systems and Telegram message mappings.
- **Cluster Orchestrator**: Handles the logic of splitting, distributing, and reassembling file chunks across multiple accounts.
- **Session Manager**: Securely manages multiple Telegram sessions and authentication states.
- **WebDAV Bridge**: Translates virtual file system calls into Telegram API requests for real-time streaming.

For a detailed breakdown of the codebase, see [**docs/structure.md**](src-tauri/docs/structure.md).

## 🚀 Getting Started

### Prerequisites

- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Node.js](https://nodejs.org/) (v18+)
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

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

## 🔒 Security

Folded Cloud stores your Telegram session files locally in `~/.folded/sessions/`. Metadata about your files is stored in `~/.folded/metadata_db.sqlite`. Your data remains your data—the application does not use any central servers.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Rust and Tauri.
