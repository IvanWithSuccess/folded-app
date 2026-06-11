import React from "react";
import { Download as DownloadIcon, Terminal, Monitor, HardDrive, Cpu } from "lucide-react";

export default function Download() {
  const handleDownload = (platform: string) => {
    alert(`Downloading for ${platform} will start automatically once releases are published on GitHub.`);
  };

  return (
    <div className="bg-[#09090b] min-h-screen text-white pt-28 pb-20 font-['Montserrat',sans-serif]">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-gray-200 to-[#35c6ff] bg-clip-text text-transparent leading-tight">
          Download Folded Cloud
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
          Install Folded on your macOS device. You can download the pre-compiled DMG package or compile the application from source code.
        </p>
      </section>

      {/* Main Downloads */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* DMG Packages */}
          <div className="border border-white/10 rounded-2xl p-8 bg-white/[0.02] flex flex-col justify-between h-full">
            <div>
              <div className="bg-[#35c6ff]/10 p-3 rounded-lg text-[#35c6ff] w-max mb-6">
                <Monitor className="size-8" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Pre-compiled macOS Builds</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Simple DMG installers. Native support for both Apple Silicon and Intel Core architectures.
              </p>
            </div>
            <div className="space-y-4">
              <button
                onClick={() => handleDownload("macOS Apple Silicon (M1/M2/M3)")}
                className="w-full bg-white text-black hover:bg-gray-200 transition-colors font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 cursor-pointer"
              >
                <DownloadIcon className="size-5" />
                Download for Apple Silicon (M1/M2/M3)
              </button>
              <button
                onClick={() => handleDownload("macOS Intel")}
                className="w-full bg-[#09090b] text-white hover:bg-white/5 border border-white/10 transition-colors font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 cursor-pointer"
              >
                <DownloadIcon className="size-5" />
                Download for Intel Core
              </button>
              <p className="text-center text-[10px] text-gray-500 italic mt-2">
                *Because the app is a free hobby project, the bundle is not signed by an Apple Developer certificate. You may need to allow execution under {"System Settings > Privacy & Security"} the first time you run it.
              </p>
            </div>
          </div>

          {/* Build from source */}
          <div className="border border-white/10 rounded-2xl p-8 bg-white/[0.02] flex flex-col justify-between h-full">
            <div>
              <div className="bg-[#35c6ff]/10 p-3 rounded-lg text-[#35c6ff] w-max mb-6">
                <Terminal className="size-8" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Build from Source Code</h2>
              <p className="text-sm text-gray-400 leading-relaxed mb-6">
                Compile your own binary packages directly from the GitHub repository to guarantee full code transparency.
              </p>
            </div>
            <div className="bg-black/60 rounded-xl p-5 border border-white/5 font-mono text-xs text-gray-300 space-y-3">
              <div>
                <span className="text-gray-500"># 1. Clone the repository</span>
                <div className="text-[#35c6ff] mt-1">git clone https://github.com/IvanWithSuccess/folded-app.git</div>
                <div className="text-white">cd folded-app</div>
              </div>
              <div>
                <span className="text-gray-500"># 2. Install npm dependencies</span>
                <div className="text-[#35c6ff] mt-1">npm install</div>
              </div>
              <div>
                <span className="text-gray-500"># 3. Build the native package</span>
                <div className="text-[#35c6ff] mt-1">npx tauri build</div>
              </div>
              <div className="text-gray-500 text-[10px] border-t border-white/5 pt-2">
                The built .dmg file will be output to:
                <br />
                <span className="text-gray-300">src-tauri/target/release/bundle/dmg/</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* System Requirements */}
      <section className="max-w-4xl mx-auto px-6 border-t border-white/5 pt-16">
        <h3 className="text-2xl font-bold text-center mb-10">System Requirements</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex gap-4 items-start">
            <Monitor className="size-6 text-[#35c6ff] shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-white mb-1">Operating System</h4>
              <p className="text-xs text-gray-400 leading-relaxed">macOS 12 Monterey or later. Compatible with M1/M2/M3 Apple Silicon and Intel Core processors.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <Cpu className="size-6 text-[#35c6ff] shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-white mb-1">Build Environment</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Compiling from source code requires Rust (cargo 1.75+) and Node.js 18+ installed on your system.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <HardDrive className="size-6 text-[#35c6ff] shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-white mb-1">Disk Footprint</h4>
              <p className="text-xs text-gray-400 leading-relaxed">Around 150 MB for the application bundle. Virtual drive streaming consumes zero local storage space.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
