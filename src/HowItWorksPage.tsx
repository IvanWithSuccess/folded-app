import React from 'react';
import { HelpCircle, ArrowLeft, Database, Lock, Server, Smartphone, Zap } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function HowItWorksPage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      <main className="w-full max-w-[1000px] px-4 py-20 flex flex-col gap-16 flex-grow z-10 text-white">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
        
        <div className="flex flex-col gap-6 border-b border-white/10 pb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#35c6ff]/10 rounded-full">
              <HelpCircle size={32} className="text-[#35c6ff]" />
            </div>
            <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[32px] md:text-[48px] leading-tight tracking-tight">
              How Folded Works
            </h1>
          </div>
          <p className="text-[18px] md:text-[22px] text-white/60 leading-relaxed max-w-[800px]">
            Discover the magic under the hood. Folded bridges your native operating system directly to Telegram's infinitely scalable infrastructure.
          </p>
        </div>

        {/* Section 1: The Core Concept */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              The Core Concept
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              Explain the fundamental idea behind Folded here. How does it turn Telegram's "Saved Messages" into a structured, native filesystem?
            </p>
          </div>

          <div className="w-full aspect-[21/9] bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-3">
            <Database size={48} className="opacity-50" />
            <span className="font-mono text-sm">Architecture Diagram Placeholder</span>
            <span className="text-xs">Import your diagram/image and place it here</span>
          </div>
        </section>

        {/* Section 2: Technology Stack grid */}
        <section className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              Technology Stack
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              Break down the technologies that power Folded. What makes it fast, native, and secure?
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tech Card 1 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-4 hover:bg-white/10 transition-all">
              <Zap size={28} className="text-yellow-400" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px]">High Performance Core</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Describe the core engine (e.g., Rust/C++/Go) used to interface with the Telegram API at lightning speeds.
              </p>
            </div>

            {/* Tech Card 2 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-4 hover:bg-white/10 transition-all">
              <Server size={28} className="text-[#35c6ff]" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px]">Telegram MTProto</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Explain how Folded securely connects to Telegram's data centers using their native, heavily encrypted MTProto protocol.
              </p>
            </div>

            {/* Tech Card 3 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-4 hover:bg-white/10 transition-all">
              <Smartphone size={28} className="text-green-400" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px]">Native OS Integration</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Explain the virtual filesystem technology (like FUSE for macOS/Linux or WinFSP for Windows) that mounts the drive natively.
              </p>
            </div>

            {/* Tech Card 4 */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col gap-4 hover:bg-white/10 transition-all">
              <Lock size={28} className="text-orange-400" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px]">Privacy & Encryption</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Detail how the user's data remains private. Mention that data goes directly to Telegram without any middleman servers.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Data Flow / Security */}
        <section className="flex flex-col gap-8 bg-gradient-to-br from-[#35c6ff]/10 to-transparent border border-[#35c6ff]/20 rounded-3xl p-8 md:p-12">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              Data Flow & Security
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              Visualize how a file moves from the user's computer, through Folded, directly into Telegram's encrypted cloud. Emphasize that Folded acts only as a bridge.
            </p>
          </div>

          <div className="w-full aspect-[16/9] bg-black/40 rounded-xl flex flex-col items-center justify-center border border-white/10 border-dashed text-white/30 gap-3">
            <span className="font-mono text-sm">Data Flow Visualization Placeholder</span>
          </div>
        </section>

      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
