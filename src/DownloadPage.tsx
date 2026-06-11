import React from 'react';
import { Apple, Monitor, Download as DownloadIcon, AlertTriangle, Info } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function DownloadPage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1200px] px-4 py-20 flex flex-col gap-24 flex-grow z-10 text-white">
        
        {/* Header Section */}
        <div className="flex flex-col items-center text-center gap-6">
          <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[40px] md:text-[60px] leading-tight tracking-tight">
            Get Folded
          </h1>
          <p className="text-[18px] md:text-[20px] text-white/60 max-w-2xl leading-relaxed">
            Choose your platform below to download the latest version. Enjoy infinite, secure cloud storage integrated directly into your OS.
          </p>
        </div>

        {/* Platforms Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
          
          {/* macOS Section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 flex flex-col gap-8 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 rounded-full">
                <Apple size={32} className="text-white" />
              </div>
              <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px]">macOS</h2>
            </div>
            
            <p className="text-white/70 leading-relaxed text-[16px]">
              Our Universal macOS app natively supports both Apple Silicon (M-series) and Intel processors.
            </p>

            <a href="https://github.com/IvanWithSuccess/folded-app/releases/download/v1.0.1/Folded_1.0.1_universal.dmg" className="bg-white text-black font-['Montserrat:SemiBold',sans-serif] py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all w-full text-[16px] cursor-pointer no-underline">
              <DownloadIcon size={20} />
              Download for macOS
            </a>

            <div className="bg-[#1a1a1c] border border-orange-500/30 rounded-xl p-6 flex gap-4 mt-auto">
              <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={24} />
              <div className="flex flex-col gap-4 text-[14px]">
                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Instructions</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>macOS may block Folded by default since it's an independent app. Don't worry, it's completely safe! Follow our detailed step-by-step guide to install the app correctly.</p>
                  <Link to="/install/macos" className="mt-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 px-4 rounded-lg text-center font-['Montserrat:SemiBold',sans-serif] hover:bg-orange-500/20 transition-all no-underline w-fit">
                    Read Installation Guide
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Windows Section */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 flex flex-col gap-8 relative overflow-hidden group hover:border-white/20 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/10 rounded-full">
                <Monitor size={32} className="text-white" />
              </div>
              <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px]">Windows</h2>
            </div>
            
            <p className="text-white/70 leading-relaxed text-[16px]">
              Available in three distinct architectures. Choose the one that matches your system type.
            </p>

            <div className="flex flex-col gap-3">
              <a href="https://github.com/IvanWithSuccess/folded-app/releases/download/v1.0.1/Folded_1.0.1_x64-setup.exe" className="bg-white text-black font-['Montserrat:SemiBold',sans-serif] py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all w-full text-[16px] cursor-pointer no-underline">
                <DownloadIcon size={20} />
                Download for x64 (Standard)
              </a>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://github.com/IvanWithSuccess/folded-app/releases/download/v1.0.1/Folded_1.0.1_arm64-setup.exe" className="bg-white/10 text-white/90 font-['Montserrat:Regular',sans-serif] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 border border-white/10 transition-all text-[14px] cursor-pointer no-underline">
                  <DownloadIcon size={16} />
                  ARM64
                </a>
                <a href="https://github.com/IvanWithSuccess/folded-app/releases/download/v1.0.1/Folded_1.0.1_x86-setup.exe" className="bg-white/10 text-white/90 font-['Montserrat:Regular',sans-serif] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 border border-white/10 transition-all text-[14px] cursor-pointer no-underline">
                  <DownloadIcon size={16} />
                  x86 (32-bit)
                </a>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-[13px] text-white/50">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>Not sure? Go to <strong>Settings &gt; System &gt; About</strong> to check your System Type.</p>
            </div>

            <div className="bg-[#1a1a1c] border border-orange-500/30 rounded-xl p-6 flex gap-4 mt-auto">
              <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={24} />
              <div className="flex flex-col gap-4 text-[14px]">
                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Instructions</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>Windows Defender SmartScreen might show a blue warning screen for new apps like Folded. This is normal! Follow our detailed guide to bypass it safely.</p>
                  <Link to="/install/windows" className="mt-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 px-4 rounded-lg text-center font-['Montserrat:SemiBold',sans-serif] hover:bg-orange-500/20 transition-all no-underline w-fit">
                    Read Installation Guide
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
