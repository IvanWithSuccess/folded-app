import React from 'react';
import { Apple, Monitor, Download as DownloadIcon, AlertTriangle, Info } from 'lucide-react';
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

            <button className="bg-white text-black font-['Montserrat:SemiBold',sans-serif] py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all w-full text-[16px] cursor-pointer">
              <DownloadIcon size={20} />
              Download for macOS
            </button>

            <div className="bg-[#1a1a1c] border border-orange-500/30 rounded-xl p-6 flex gap-4 mt-auto">
              <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={24} />
              <div className="flex flex-col gap-4 text-[14px]">
                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Guide</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>Since Folded is an independent app, macOS will block it by default. Don't worry, it's completely safe! Just follow these 3 simple steps:</p>
                  
                  <ol className="list-decimal list-outside ml-4 flex flex-col gap-2">
                    <li>Move <strong>Folded.app</strong> into your <strong>Applications</strong> folder.</li>
                    <li>Open the <strong>Terminal</strong> app (press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[12px]">Cmd + Space</kbd> and type "Terminal").</li>
                    <li>Copy and paste this exact command and press Enter:</li>
                  </ol>
                  
                  <div className="bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-[13px] text-[#35c6ff] select-all break-all">
                    sudo xattr -r -c /Applications/Folded.app
                  </div>
                  
                  <p className="text-[13px] text-white/50 italic">
                    (It may ask for your Mac password. Simply type it and press Enter — you won't see the letters as you type, which is normal!)
                  </p>
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
              <button className="bg-white text-black font-['Montserrat:SemiBold',sans-serif] py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-white/90 transition-all w-full text-[16px] cursor-pointer">
                <DownloadIcon size={20} />
                Download for x64 (Standard)
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-white/10 text-white/90 font-['Montserrat:Regular',sans-serif] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 border border-white/10 transition-all text-[14px] cursor-pointer">
                  <DownloadIcon size={16} />
                  ARM64
                </button>
                <button className="bg-white/10 text-white/90 font-['Montserrat:Regular',sans-serif] py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 border border-white/10 transition-all text-[14px] cursor-pointer">
                  <DownloadIcon size={16} />
                  x86 (32-bit)
                </button>
              </div>
            </div>
            
            <div className="flex items-start gap-3 text-[13px] text-white/50">
              <Info size={16} className="shrink-0 mt-0.5" />
              <p>Not sure? Go to <strong>Settings &gt; System &gt; About</strong> to check your System Type.</p>
            </div>

            <div className="bg-[#1a1a1c] border border-orange-500/30 rounded-xl p-6 flex gap-4 mt-auto">
              <AlertTriangle className="text-orange-400 shrink-0 mt-1" size={24} />
              <div className="flex flex-col gap-4 text-[14px]">
                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Guide</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>Windows might show a blue warning screen saying "Windows protected your PC". This is normal for new apps! To install safely:</p>
                  
                  <ol className="list-decimal list-outside ml-4 flex flex-col gap-2">
                    <li>Run the Folded installer file.</li>
                    <li>When the blue warning appears, click on the <strong>"More info"</strong> text link.</li>
                    <li>A new button will appear. Click <strong>"Run anyway"</strong>.</li>
                  </ol>
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
