import React from "react";
import { Cpu, Database, HardDrive, Shield } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="bg-[#09090b] min-h-screen text-white pt-28 pb-20 font-['Montserrat',sans-serif]">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 text-center mb-16 md:mb-24">
        <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-gray-200 to-[#35c6ff] bg-clip-text text-transparent leading-tight">
          How Folded Cloud Works
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
          Learn about the technologies powering virtual network drives, local metadata caching, and on-demand streaming.
        </p>
      </section>

      {/* Main Architecture Diagram / Steps */}
      <section className="max-w-5xl mx-auto px-6 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div className="space-y-6">
            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex gap-4 items-start">
                <div className="bg-[#35c6ff]/10 p-3 rounded-lg text-[#35c6ff]">
                  <Database className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">1. Local Metadata Cache (SQLite)</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Your entire directory structure, folder mappings, and links between files and Telegram messages are cached locally in a SQLite database. Finding, sorting, and browsing your files is instantaneous since it requires no constant requests to the Telegram API.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex gap-4 items-start">
                <div className="bg-[#35c6ff]/10 p-3 rounded-lg text-[#35c6ff]">
                  <Cpu className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">2. Intelligent Chunking</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    When uploading a file, the app automatically splits it into optimized segments (up to 1.9 GB for regular accounts, and up to 3.9 GB for Telegram Premium). This bypasses Telegram's single-file limits and ensures robust transfer of files of any size.
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02]">
              <div className="flex gap-4 items-start">
                <div className="bg-[#35c6ff]/10 p-3 rounded-lg text-[#35c6ff]">
                  <HardDrive className="size-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2">3. Virtual WebDAV Drive Bridge (OS Bridge)</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    An embedded Axum WebDAV server emulates a network file system. This allows you to mount your Telegram storage as a network folder and work with files directly inside macOS Finder.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative group rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-8 h-full flex flex-col justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#35c6ff]/10 to-transparent pointer-events-none" />
            <h4 className="text-xl font-bold mb-4 text-[#35c6ff]">On-Demand Streaming</h4>
            <p className="text-sm md:text-base text-gray-300 leading-relaxed mb-6">
              When you play a video or open a document in Finder, the OS sends standard HTTP Range requests to the local WebDAV bridge.
            </p>
            <div className="space-y-4 border-l-2 border-[#35c6ff]/30 pl-4 text-xs md:text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="bg-[#35c6ff] text-black font-bold size-5 rounded-full flex items-center justify-center shrink-0">1</span>
                <span>The OS Finder requests a specific byte range from the mounted WebDAV bridge.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#35c6ff] text-black font-bold size-5 rounded-full flex items-center justify-center shrink-0">2</span>
                <span>The bridge maps the byte offsets to specific Telegram messages and chunks.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#35c6ff] text-black font-bold size-5 rounded-full flex items-center justify-center shrink-0">3</span>
                <span>The MTProto client (Grammers) fetches the exact range directly from Telegram servers.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-[#35c6ff] text-black font-bold size-5 rounded-full flex items-center justify-center shrink-0">4</span>
                <span>The media streams on-the-fly, allowing you to skip around instantly without downloading the whole file.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="bg-white/[0.01] border-y border-white/5 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-[#35c6ff]/10 p-4 rounded-full w-max mx-auto text-[#35c6ff] mb-6">
            <Shield className="size-8" />
          </div>
          <h2 className="text-3xl font-bold mb-6">Absolute Privacy</h2>
          <p className="text-gray-300 leading-relaxed max-w-2xl mx-auto mb-8">
            Folded Cloud does not route your files through any third-party servers. All API requests and file transfers occur directly between your device and Telegram's servers. Authentication sessions (<code className="text-xs bg-white/10 px-2 py-1 rounded text-white font-mono">~/.folded/sessions/</code>) and your SQLite metadata cache are stored locally on your machine, fully protected by OS permissions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-3xl mx-auto">
            <div className="border border-white/5 rounded-lg p-5 bg-white/[0.01]">
              <h4 className="font-semibold text-white mb-2">No Middlemen</h4>
              <p className="text-xs text-gray-400">All data moves directly between your computer and Telegram's servers.</p>
            </div>
            <div className="border border-white/5 rounded-lg p-5 bg-white/[0.01]">
              <h4 className="font-semibold text-white mb-2">Local SQLite Cache</h4>
              <p className="text-xs text-gray-400">Your file structures and indexes remain entirely on your own disk.</p>
            </div>
            <div className="border border-white/5 rounded-lg p-5 bg-white/[0.01]">
              <h4 className="font-semibold text-white mb-2">MTProto Cryptography</h4>
              <p className="text-xs text-gray-400">Secured natively by Telegram's official cryptographic protocols.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
