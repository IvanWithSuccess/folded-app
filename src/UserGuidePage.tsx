import React from 'react';
import { BookOpen, ArrowLeft, LogIn, UploadCloud, FolderPlus, Link as LinkIcon, Settings, Layers, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { Frame1, Frame71 } from './imports/Frame28/index.tsx';

export default function UserGuidePage() {
  return (
    <div className="bg-[#09090b] min-h-screen w-full flex flex-col items-center font-['Montserrat:Regular',sans-serif]">
      {/* Shared Header */}
      <div className="w-full max-w-[1440px] px-4 flex flex-col items-center">
        <Frame1 />
      </div>

      <main className="w-full max-w-[1000px] px-4 py-20 flex flex-col gap-24 flex-grow z-10 text-white">
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit mb-8">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
        
        {/* Header */}
        <div className="flex flex-col gap-6 border-b border-white/10 pb-12">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-orange-500/10 rounded-full">
              <BookOpen size={32} className="text-orange-400" />
            </div>
            <h1 className="font-['Montserrat:Black',sans-serif] font-black text-[32px] md:text-[48px] leading-tight tracking-tight">
              User Guide
            </h1>
          </div>
          <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70 max-w-[800px]">
            Welcome to Folded! This manual covers everything you need to know to master your new infinite personal cloud drive. Follow these guides to learn how to upload, share, and manage your files efficiently.
          </p>
        </div>

        {/* Section 1: Getting Started */}
        <section className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl">
              <LogIn className="text-white" size={24} />
            </div>
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[20px] md:text-[24px] text-white">
              1. Getting Started & Logging In
            </h2>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
            <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
              When you launch Folded for the first time, you will need to connect it to your Telegram account. Here is how to do it safely and quickly:
            </p>
            
            <ol className="list-decimal list-inside flex flex-col gap-4 font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70 ml-2">
              <li>Open the Folded application on your computer.</li>
              <li>A window will appear asking for your phone number or offering a QR code.</li>
              <li>Open the official Telegram app on your phone, go to Settings -> Devices -> Link Desktop Device.</li>
              <li>Scan the QR code shown in Folded.</li>
            </ol>

            <div className="w-full aspect-video bg-black/40 rounded-xl flex flex-col items-center justify-center border border-white/10 text-white/30 gap-2 mt-4">
              {/* Placeholder for Screenshot */}
              <span className="text-[14px] uppercase tracking-widest font-['Montserrat:SemiBold',sans-serif]">[ Insert Login Screenshot Here ]</span>
            </div>
          </div>
        </section>

        {/* Section 2: Managing Files */}
        <section className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-[#35c6ff]/10 p-3 rounded-xl">
              <UploadCloud className="text-[#35c6ff]" size={24} />
            </div>
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[20px] md:text-[24px] text-[#35c6ff]">
              2. Uploading & Managing Files
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <FolderPlus size={24} className="text-white/80" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Creating Folders</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                You can organize your files exactly like a normal hard drive. Just right-click in the empty space and select "New Folder". Name it whatever you like.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <UploadCloud size={24} className="text-white/80" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Drag & Drop</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                To upload files, simply drag them from your computer's desktop or file explorer and drop them directly into the Folded window. Uploads begin instantly.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <Search size={24} className="text-white/80" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Instant Search</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Use the search bar at the top to find any file across all your folders instantly. Folded caches file names so search is lightning fast.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-col gap-4">
              <Trash2 size={24} className="text-white/80" />
              <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Deleting Files</h3>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Select a file and press Delete. Folded will remove the file from the local view and delete the corresponding messages from your Telegram cloud.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3: Advanced Features */}
        <section className="flex flex-col gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/10 p-3 rounded-xl">
              <Settings className="text-purple-400" size={24} />
            </div>
            <h2 className="font-['Montserrat:SemiBold',sans-serif] font-semibold text-[20px] md:text-[24px] text-purple-400">
              3. Advanced Features
            </h2>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col gap-8">
            
            <div className="flex flex-col gap-3 border-l-2 border-purple-500/50 pl-6">
              <div className="flex items-center gap-2">
                <LinkIcon size={18} className="text-purple-400" />
                <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Generating Share Links</h3>
              </div>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Want to share a 10GB file with a friend? Right-click any uploaded file and select "Copy Share Link". This generates a special link that you can send to anyone. When they click it, it opens directly in Telegram!
              </p>
            </div>

            <div className="flex flex-col gap-3 border-l-2 border-purple-500/50 pl-6">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-purple-400" />
                <h3 className="font-['Montserrat:SemiBold',sans-serif] text-[18px]">Multi-Account Management</h3>
              </div>
              <p className="font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70">
                Folded allows you to mount multiple Telegram accounts. Open the Settings menu (gear icon) and click "Add Account". Each account will appear as a separate main folder in your virtual drive. You can seamlessly drag files between your work and personal accounts!
              </p>
            </div>

          </div>
        </section>

      </main>

      {/* Shared Footer */}
      <Frame71 />
    </div>
  );
}
