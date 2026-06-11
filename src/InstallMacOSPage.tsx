import React from 'react';
import { Apple, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function InstallMacOSPage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      <main className="w-full max-w-[800px] px-4 py-20 flex flex-col gap-12 flex-grow z-10 text-white">
        <Link to="/download" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit">
          <ArrowLeft size={20} />
          <span>Back to Downloads</span>
        </Link>
        
        <div className="flex items-center gap-4 border-b border-white/10 pb-8">
          <div className="p-4 bg-white/10 rounded-full">
            <Apple size={32} className="text-white" />
          </div>
          <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[32px] md:text-[48px] leading-tight tracking-tight">
            Installing on macOS
          </h1>
        </div>

        <p className="text-[18px] text-white/60 leading-relaxed">
          Since Folded is an independent app downloaded outside the Mac App Store, macOS may show a security prompt. It's completely safe. Just follow these simple steps to install the app.
        </p>

        {/* Placeholder Step 1 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 1: Move to Applications</h2>
          <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
            Drag and drop the Folded.app icon into your Applications folder.
          </p>
          <div className="w-full aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-2">
            <span className="font-mono text-sm">Screenshot Placeholder</span>
            <span className="text-xs">Import your image and use an &lt;img&gt; tag here</span>
          </div>
        </section>

        {/* Placeholder Step 2 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 2: Allow the App to Run</h2>
          <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
            Open the <strong>Terminal</strong> app (press <kbd className="bg-white/10 px-1.5 py-0.5 rounded text-[12px]">Cmd + Space</kbd> and type "Terminal"). Then, copy and paste this exact command and press Enter:
          </p>
          <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-[14px] text-[#35c6ff] break-all">
            sudo xattr -r -c /Applications/Folded.app
          </div>
          <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70 text-[14px] italic">
            Note: It may ask for your Mac password. Simply type it and press Enter — you won't see the letters as you type, which is normal!
          </p>
          <div className="w-full aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-2">
            <span className="font-mono text-sm">Screenshot Placeholder</span>
          </div>
        </section>
        
        {/* Placeholder Step 3 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 3: Launch Folded</h2>
          <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
            You can now safely launch Folded from your Applications folder or Launchpad!
          </p>
        </section>

      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
