import React from 'react';
import { Monitor, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function InstallWindowsPage() {
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
            <Monitor size={32} className="text-white" />
          </div>
          <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[32px] md:text-[48px] leading-tight tracking-tight">
            Installing on Windows
          </h1>
        </div>

        <p className="text-[18px] text-white/60 leading-relaxed">
          When installing new software on Windows, Microsoft Defender SmartScreen might block it temporarily. It's completely safe. Follow these steps to complete the installation.
        </p>

        {/* Placeholder Step 1 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 1: Run the Installer</h2>
          <p className="text-white/70 leading-relaxed text-[16px]">
            Double-click the .exe file you just downloaded.
          </p>
          <div className="w-full aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-2">
            <span className="font-mono text-sm">Screenshot Placeholder</span>
            <span className="text-xs">Import your image and use an &lt;img&gt; tag here</span>
          </div>
        </section>

        {/* Placeholder Step 2 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 2: Microsoft Defender SmartScreen</h2>
          <p className="text-white/70 leading-relaxed text-[16px]">
            Windows might show a blue warning screen saying "Windows protected your PC". To proceed, click the <strong>"More info"</strong> text link right below the description.
          </p>
          <div className="w-full aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-2">
            <span className="font-mono text-sm">Screenshot Placeholder</span>
          </div>
        </section>
        
        {/* Placeholder Step 3 */}
        <section className="flex flex-col gap-6">
          <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[24px]">Step 3: Run Anyway</h2>
          <p className="text-white/70 leading-relaxed text-[16px]">
            A new button will appear at the bottom right. Click <strong>"Run anyway"</strong> and follow the standard installation wizard.
          </p>
          <div className="w-full aspect-video bg-white/5 rounded-xl flex flex-col items-center justify-center border border-white/20 border-dashed text-white/30 gap-2">
            <span className="font-mono text-sm">Screenshot Placeholder</span>
          </div>
        </section>

      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
