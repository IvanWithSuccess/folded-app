import React from 'react';
import { 
  HelpCircle, ArrowLeft, Database, Server, Smartphone, Zap, 
  FolderTree, Cloud, HardDrive, ArrowRight, ShieldCheck, 
  CheckCircle2, Box, Train, Key, Cpu, Scissors
} from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function HowItWorksPage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      <main className="w-full max-w-[1000px] px-4 py-20 flex flex-col gap-24 flex-grow z-10 text-white">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
        
        {/* Header */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-[#35c6ff]/10 rounded-full">
              <HelpCircle size={32} className="text-[#35c6ff]" />
            </div>
            <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[32px] md:text-[48px] leading-tight tracking-tight">
              The Magic Behind Folded
            </h1>
          </div>
          <p className="text-[18px] md:text-[22px] text-white/60 leading-relaxed max-w-[800px]">
            Have you ever wondered how we turned a messaging app into an infinite hard drive for your computer? Here is the full story, explained simply, step-by-step.
          </p>
        </div>

        {/* Section 1: The Core Philosophy */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-6">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] text-white">
              1. The Big Idea: Taming the Infinite Mess
            </h2>
            <div className="flex flex-col gap-4 font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
              <p>
                Imagine you have a magical, bottomless toy box (that's Telegram's <strong>"Saved Messages"</strong>). You can throw as many toys into it as you want, and it will never get full. It's completely free and exists reliably in the cloud.
              </p>
              <p>
                But there is a catch: when you have a million toys in one big pile, finding your favorite toy car is really, really hard. It's just a giant, messy, endless list of files.
              </p>
              <p>
                <strong>Folded is like a super-smart robot organizer.</strong> It connects to your magical toy box and instantly builds perfect shelves, drawers, and labels for everything. When you use Folded on your computer, it looks exactly like your normal folders (like Documents or Downloads), but underneath, the robot is secretly packing everything neatly into your infinite Telegram toy box.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="bg-[#1a1a1c] p-8 rounded-2xl flex flex-col items-center text-center gap-4 border border-red-500/20">
              <div className="flex gap-2 text-white/30 mb-2">
                <Database size={40} />
                <Database size={40} />
                <Database size={40} />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px] text-red-400">Without Folded</h3>
              <p className="text-white/60 text-[14px]">Files are dumped into one giant chat history. Hard to find, impossible to organize, and no folder structure.</p>
            </div>
            
            <div className="bg-[#35c6ff]/10 p-8 rounded-2xl flex flex-col items-center text-center gap-4 border border-[#35c6ff]/30">
              <FolderTree size={48} className="text-[#35c6ff] mb-2" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px] text-[#35c6ff]">With Folded</h3>
              <p className="text-[#35c6ff]/80 text-[14px]">Files are beautifully structured in native folders. Easy to drag, drop, rename, and search.</p>
            </div>
          </div>
        </section>

        {/* Section 2: Deep Dive into Concepts */}
        <section className="flex flex-col gap-12">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] text-white">
              2. How It Actually Works: The Technology
            </h2>
            <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
              To make a cloud drive feel exactly like a physical hard drive plugged into your computer, we had to use some of the most advanced engineering techniques available. Let's break them down.
            </p>
          </div>

          {/* Concept 1: Virtual File Systems */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-white/5 p-8 rounded-3xl border border-white/10">
            <div className="bg-yellow-400/10 p-4 rounded-2xl shrink-0">
              <Cpu size={40} className="text-yellow-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px] text-yellow-400">The Magic Trick: Virtual File Systems (VFS)</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Folded isn't just a window you click inside. It uses deep system integrations called <strong>FUSE</strong> (on macOS/Linux) or <strong>WinFSP</strong> (on Windows). 
              </p>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Think of it like a very convincing illusion. Folded tells your operating system: <em>"Hey, a brand new physical hard drive was just plugged in!"</em> Your computer believes it, and shows it in Finder or File Explorer. But when you double-click a folder, Folded instantly runs to Telegram, asks what's inside, and hands the answer back to your computer before you even blink. It takes up <strong>zero actual space</strong> on your real hard drive.
              </p>
            </div>
          </div>

          {/* Concept 2: File Chunking */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-white/5 p-8 rounded-3xl border border-white/10">
            <div className="bg-purple-400/10 p-4 rounded-2xl shrink-0">
              <Scissors size={40} className="text-purple-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px] text-purple-400">The Pizza Slicer: Handling Giant Files</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Telegram has a strict rule: you can only upload files up to 2GB (or 4GB with Premium). So, what happens if you want to store a massive 50GB 4K video?
              </p>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Enter the <strong>Chunking Engine</strong>. Imagine you have a giant pizza that won't fit in the delivery box. Folded acts like a pizza slicer: it perfectly cuts your 50GB file into tiny, invisible pieces and uploads them one by one. When you want to watch the video, Folded stitches the slices back together so fast that your media player thinks it's reading one solid file. You never see the slices; you just see your 50GB video.
              </p>
            </div>
          </div>

          {/* Concept 3: MTProto Protocol */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-white/5 p-8 rounded-3xl border border-white/10">
            <div className="bg-[#35c6ff]/10 p-4 rounded-2xl shrink-0">
              <Train size={40} className="text-[#35c6ff]" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px] text-[#35c6ff]">The High-Speed Train: MTProto</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Normal websites and cloud drives communicate using a regular "road" called HTTP. It works, but it can get stuck in traffic. 
              </p>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Folded doesn't use HTTP. Instead, it speaks Telegram's native language: <strong>MTProto</strong>. This is like a dedicated, high-speed underground bullet train built exclusively for Telegram data. It allows Folded to download and upload files in parallel (sending multiple trains at once) at maximum bandwidth, bypassing the usual internet traffic jams.
              </p>
            </div>
          </div>

          {/* Concept 4: Client-Side Security */}
          <div className="flex flex-col md:flex-row gap-8 items-start bg-white/5 p-8 rounded-3xl border border-white/10">
            <div className="bg-green-400/10 p-4 rounded-2xl shrink-0">
              <Key size={40} className="text-green-400" />
            </div>
            <div className="flex flex-col gap-3">
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px] text-green-400">Zero-Knowledge Security</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                "Wait, is it safe to store my personal files in a chat app?" Absolutely.
              </p>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Before a file ever leaves your computer, Folded locks it in a secure safe (encryption). The key to that safe never leaves your device. Even if someone were to hack Telegram's servers and look at your "Saved Messages", all they would see is useless, scrambled gibberish. We (the creators of Folded) have exactly zero access to your files. We don't have servers. It's just your computer talking securely to Telegram.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: The Data Flow Diagram */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] text-white">
              3. The Full Journey of a File
            </h2>
            <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
              Here is exactly what happens in the milliseconds after you drag and drop a file into your Folded drive.
            </p>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-gradient-to-r from-white/5 via-white/5 to-[#35c6ff]/5 p-8 md:p-12 rounded-3xl border border-white/10">
            
            {/* Step 1: User PC */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[200px]">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <HardDrive size={28} className="text-white" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[16px]">1. The Drop</h3>
              <p className="text-white/50 text-[12px]">You drag a file into the virtual drive. Your OS thinks it's a real disk.</p>
            </div>

            <div className="rotate-90 lg:rotate-0 text-white/20">
              <ArrowRight size={24} />
            </div>

            {/* Step 2: Slice & Lock */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[200px]">
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center border border-purple-500/40">
                <Box size={28} className="text-purple-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-purple-400">2. Slice & Lock</h3>
              <p className="text-white/50 text-[12px]">Folded encrypts the file and slices it into perfect 2GB or 4GB chunks.</p>
            </div>

            <div className="rotate-90 lg:rotate-0 text-white/20">
              <ArrowRight size={24} />
            </div>

            {/* Step 3: Fast Track */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[200px]">
              <div className="w-16 h-16 bg-[#35c6ff]/20 rounded-full flex items-center justify-center border border-[#35c6ff]/40 shadow-[0_0_20px_rgba(53,198,255,0.2)]">
                <Zap size={28} className="text-[#35c6ff]" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-[#35c6ff]">3. Fast Track</h3>
              <p className="text-white/50 text-[12px]">Chunks are shot through the MTProto bullet train at maximum network speed.</p>
            </div>

            <div className="rotate-90 lg:rotate-0 text-[#35c6ff]/40">
              <ArrowRight size={24} />
            </div>

            {/* Step 4: Telegram Cloud */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[200px]">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/40">
                <Cloud size={28} className="text-blue-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-blue-400">4. Cloud Storage</h3>
              <p className="text-white/50 text-[12px]">The pieces land safely in Telegram's massive, free, distributed servers.</p>
            </div>

          </div>
        </section>

        {/* Section 4: Why is this useful? */}
        <section className="flex flex-col gap-10 bg-[#1a1a1c] border border-white/10 rounded-3xl p-8 md:p-12 mt-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#35c6ff]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col gap-4 z-10">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] text-white">
              Why is this a game changer?
            </h2>
          </div>

          <div className="flex flex-col gap-6 z-10">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Never Pay for Cloud Storage Again</h4>
                <p className="text-white/60 leading-relaxed mt-1">Traditional clouds like Google Drive or Dropbox charge you monthly fees for just 100GB or 1TB of space. Telegram provides unlimited storage for free. Folded unlocks this raw potential so you can back up your entire computer without ever paying a subscription.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Multi-Account Superpowers</h4>
                <p className="text-white/60 leading-relaxed mt-1">Because Folded is so smart, you can connect multiple Telegram accounts at exactly the same time. You can drag a file from your work account directly into your personal account in the blink of an eye.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">It Just Works (Zero Learning Curve)</h4>
                <p className="text-white/60 leading-relaxed mt-1">You don't need to learn a new, clunky web interface. If you know how to copy and paste a file on your computer, you already know how to use Folded. It runs natively, quietly, and perfectly right inside your OS.</p>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
