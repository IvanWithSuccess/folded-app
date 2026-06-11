import React from 'react';
import { HelpCircle, ArrowLeft, Database, Lock, Server, Smartphone, Zap, FolderTree, Cloud, HardDrive, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function HowItWorksPage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      <main className="w-full max-w-[1000px] px-4 py-20 flex flex-col gap-20 flex-grow z-10 text-white">
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
            Have you ever wondered how we turned a messaging app into an infinite hard drive for your computer? Here is the full story, explained simply.
          </p>
        </div>

        {/* Section 1: The Concept (Explain like I'm 5) */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              The Big Idea
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              Imagine you have a magical, bottomless toy box (that's Telegram's <strong>"Saved Messages"</strong>). You can throw as many toys into it as you want, and it will never get full! It's completely free and exists in the cloud.
            </p>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              But there is a catch: when you have a million toys in one big pile, finding your favorite toy car is really, really hard. It's just a giant, messy list.
            </p>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              <strong>Folded is like a super-smart robot organizer.</strong> It connects to your magical toy box and instantly builds perfect shelves, drawers, and labels for everything. When you use Folded on your computer, it looks exactly like your normal folders (like Documents or Downloads), but underneath, the robot is secretly packing everything neatly into your infinite Telegram toy box.
            </p>
          </div>

          {/* Visual: Messy vs Organized */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/5 p-6 rounded-3xl border border-white/10">
            <div className="bg-[#1a1a1c] p-8 rounded-2xl flex flex-col items-center text-center gap-4 border border-red-500/20">
              <div className="flex gap-2 text-white/30 mb-2">
                <Database size={40} />
                <Database size={40} />
                <Database size={40} />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px] text-red-400">Without Folded</h3>
              <p className="text-white/60 text-[14px]">Files are dumped into one giant, endless chat history. Hard to find, impossible to organize.</p>
            </div>
            
            <div className="bg-[#35c6ff]/10 p-8 rounded-2xl flex flex-col items-center text-center gap-4 border border-[#35c6ff]/30">
              <FolderTree size={48} className="text-[#35c6ff] mb-2" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[20px] text-[#35c6ff]">With Folded</h3>
              <p className="text-[#35c6ff]/80 text-[14px]">Files are beautifully structured in native folders. Easy to drag, drop, rename, and search.</p>
            </div>
          </div>
        </section>

        {/* Section 2: How Data Flows (Visual UI) */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              How the Data Flows
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              When you drag a file into your Folded drive, it never touches our servers. In fact, we don't even have servers! Your computer talks directly to Telegram.
            </p>
          </div>

          {/* Visual: Data Flow Chart using Flexbox */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-gradient-to-r from-white/5 via-white/5 to-[#35c6ff]/5 p-8 md:p-12 rounded-3xl border border-white/10">
            
            {/* Step 1: User PC */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[250px]">
              <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center border border-white/20">
                <HardDrive size={36} className="text-white" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">1. Your Computer</h3>
              <p className="text-white/50 text-[13px]">You drop a file into the Folded virtual drive.</p>
            </div>

            <div className="rotate-90 lg:rotate-0 text-white/20">
              <ArrowRight size={40} />
            </div>

            {/* Step 2: Folded App */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[250px]">
              <div className="w-20 h-20 bg-[#35c6ff]/20 rounded-full flex items-center justify-center border border-[#35c6ff]/40 shadow-[0_0_30px_rgba(53,198,255,0.2)]">
                <ShieldCheck size={36} className="text-[#35c6ff]" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px] text-[#35c6ff]">2. Folded Engine</h3>
              <p className="text-white/50 text-[13px]">The file is instantly split into chunks and encrypted using Telegram's MTProto protocol.</p>
            </div>

            <div className="rotate-90 lg:rotate-0 text-[#35c6ff]/40">
              <ArrowRight size={40} />
            </div>

            {/* Step 3: Telegram Cloud */}
            <div className="flex flex-col items-center text-center gap-3 w-full lg:w-[250px]">
              <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/40">
                <Cloud size={36} className="text-blue-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px] text-blue-400">3. Telegram Cloud</h3>
              <p className="text-white/50 text-[13px]">The file is safely stored in your personal "Saved Messages" infinitely and for free.</p>
            </div>

          </div>
        </section>

        {/* Section 3: The Technology Stack */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col gap-4">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              The Technology Stack
            </h2>
            <p className="text-white/70 leading-relaxed text-[16px] md:text-[18px]">
              To make a cloud drive feel exactly like a physical hard drive plugged into your computer, we had to use some of the most advanced engineering techniques available.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4 hover:border-white/20 transition-all">
              <div className="bg-yellow-400/10 w-fit p-3 rounded-xl">
                <Zap size={28} className="text-yellow-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px]">Native OS Virtualization</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Folded isn't just a window you click inside. It uses deep system integrations to create a "Virtual Drive". When you open Finder on Mac or File Explorer on Windows, Folded tricks your computer into thinking a real, physical hard drive was just plugged in.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4 hover:border-white/20 transition-all">
              <div className="bg-blue-400/10 w-fit p-3 rounded-xl">
                <Server size={28} className="text-blue-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px]">MTProto Integration</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                Instead of talking to standard cloud servers, Folded communicates directly in Telegram's native language: <strong>MTProto</strong>. This is the same ultra-secure, hyper-fast protocol that makes your phone's messages sync instantly across the world.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4 hover:border-white/20 transition-all">
              <div className="bg-green-400/10 w-fit p-3 rounded-xl">
                <CheckCircle2 size={28} className="text-green-400" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px]">Zero-Knowledge Architecture</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                We have exactly zero access to your files. Folded is just a "translator" that runs on your personal computer. It translates your file-clicks into Telegram messages, meaning nobody (not even us) stands between you and your data.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4 hover:border-white/20 transition-all">
              <div className="bg-[#35c6ff]/10 w-fit p-3 rounded-xl">
                <Smartphone size={28} className="text-[#35c6ff]" />
              </div>
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[22px]">Seamless Multi-Account</h3>
              <p className="text-white/60 text-[15px] leading-relaxed">
                The engine can handle multiple Telegram accounts at exactly the same time. If one account gives you unlimited space, connecting two gives you... well, double unlimited. You can drag files between different accounts instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 4: Why is this useful? */}
        <section className="flex flex-col gap-10 bg-[#1a1a1c] border border-white/10 rounded-3xl p-8 md:p-12 mt-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#35c6ff]/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex flex-col gap-4 z-10">
            <h2 className="font-['Montserrat:SemiBold',sans-serif] text-[28px] md:text-[36px] text-white">
              Why is this a game changer?
            </h2>
          </div>

          <div className="flex flex-col gap-6 z-10">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Never Pay for Cloud Storage Again</h4>
                <p className="text-white/60 leading-relaxed">Traditional clouds charge you monthly for 100GB or 1TB. Telegram provides unlimited storage for free. Folded unlocks this potential so you can back up your entire computer without subscriptions.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">No Upload Limits</h4>
                <p className="text-white/60 leading-relaxed">Want to store a 50GB folder of home videos? Go ahead. By leveraging Telegram Premium accounts, you can upload massive 4GB individual files endlessly.</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="text-[#35c6ff] shrink-0 mt-1" size={24} />
              <div>
                <h4 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">It Just Works</h4>
                <p className="text-white/60 leading-relaxed">You don't need to learn a new interface. If you know how to copy and paste a file on your computer, you already know how to use Folded.</p>
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
