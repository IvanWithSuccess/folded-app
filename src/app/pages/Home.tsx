import React from "react";
import { Link } from "react-router";

// Import icons
import { IconArrowRight } from "../components/icons";
import FAQ from "../components/FAQ";
import Comparison from "../components/Comparison";

// Import images
import imgLogo from "../../imports/Frame28/8db2f9ecea5ebe90a67ef819abf5dc64a0577460.png";
import imgHeroBg from "../../imports/Frame28/b763b0a0c62ed6189c17a21389dcf92691e56a9d.png";
import imgImage2 from "../../imports/Frame28/300377b171442aada5f191e6a0011644a0a79859.png";
import imgImage3 from "../../imports/Frame28/0dc125efbd9d0081a0c72414aa3f3a4750f3b58d.png";
import imgImage4 from "../../imports/Frame28/99884eaf0688491d48ce1207a2cd12b8ff8ee0e6.png";
import imgImage5 from "../../imports/Frame28/05ce510d761ab735224f9b21077dd1e7b8c7d3d2.png";
import imgFileExplorer from "../../imports/Frame28/05185548fab2f91d1b152b059813929b55bddbfa.png";
import imgMultiAccount from "../../imports/Frame28/3bd384c4cd47ce84af03b1cb1c432c2b5d063fcf.png";
import imgLiveBackup from "../../imports/Frame28/394c65866ae1c280eb7c5d72a36bb06178580e35.png";
import imgSystemIntegration from "../../imports/Frame28/8ddc3ef606a4e21eca13a9f7df47d2c148fa343c.png";

// Shared components matching Figma specifications
function Logo() {
  return (
    <div className="flex flex-col items-center select-none">
      <img alt="Folded Logo" src={imgLogo} className="w-[93.27px] h-[100.211px] object-contain mb-3" />
      <span className="font-['Montserrat',sans-serif] font-black text-[30px] tracking-widest text-white">FOLDED</span>
    </div>
  );
}

function DarkButton({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="bg-[#09090b] hover:bg-[#141416] border border-white/5 flex items-center justify-between px-[20px] py-[10px] rounded-[5px] cursor-pointer w-full max-w-[290px] transition-colors duration-150"
    >
      <span className="font-['Montserrat',sans-serif] font-semibold text-[15px] text-white whitespace-nowrap">{label}</span>
      <IconArrowRight />
    </Link>
  );
}

function WhiteButton({ label, to }: { label: string; to: string }) {
  return (
    <Link
      to={to}
      className="bg-white hover:bg-gray-200 flex items-center justify-between px-[20px] py-[10px] rounded-[5px] cursor-pointer w-full max-w-[290px] transition-colors duration-150"
    >
      <span className="font-['Montserrat',sans-serif] font-semibold text-[15px] text-[#09090b] whitespace-nowrap">{label}</span>
      <IconArrowRight color="#09090B" />
    </Link>
  );
}

export default function Home() {
  return (
    <div className="bg-[#09090b] w-full min-h-screen text-white font-['Montserrat',sans-serif] overflow-x-hidden">
      
      {/* ─── Section: Hero ─── */}
      <section className="relative w-full min-h-screen lg:h-[1024px] flex flex-col justify-center items-center overflow-hidden px-6 py-20">
        <div className="absolute inset-0 z-0 flex justify-center items-center pointer-events-none select-none">
          <img
            alt=""
            src={imgHeroBg}
            className="w-full max-w-7xl h-auto object-cover opacity-60 scale-110 lg:scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-[#09090b]" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center space-y-10 max-w-3xl">
          <Logo />
          <p className="font-light text-[16px] text-white tracking-wide leading-relaxed max-w-lg">
            Truly unlimited personal cloud storage, powered by your Telegram.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center items-center pt-4">
            <WhiteButton label="Get Started" to="/download" />
            <Link
              to="/how-it-works"
              className="font-semibold text-sm hover:underline py-2 text-gray-300 transition-colors"
            >
              Learn how it works →
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Section: What Is Folded? ─── */}
      <section className="bg-[#09090b] py-24 px-6 max-w-7xl mx-auto space-y-20 border-t border-white/5">
        {/* Header */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h2 className="text-[24px] md:text-[30px] font-semibold text-white">What is Folded?</h2>
          <p className="text-[16px] font-light text-white leading-relaxed">
            Folded is an unofficial Telegram client that transforms your account into a personal cloud drive.
          </p>
        </div>

        {/* Staggered Layout Adapted to be Responsive */}
        <div className="space-y-24 lg:space-y-36">
          
          {/* Row 1: The Premise */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">The Premise</h3>
              <div className="text-[16px] font-normal text-gray-300 leading-[22px] tracking-[0.32px] space-y-4">
                <p>Telegram gives every user unlimited, encrypted personal cloud storage — completely free.</p>
                <p>You can use it in groups, channels, and Saved Messages to store any kind of file. The only constraint: individual files can't exceed 2 GB for regular users, or 4 GB for Premium subscribers.</p>
                <p>It's arguably the most generous storage service in the world — yet it's severely underutilized.</p>
              </div>
            </div>
            <div className="lg:col-span-8 relative rounded-[10px] overflow-hidden border border-white/10 aspect-[837/491]">
              <img alt="" src={imgImage2} className="w-full h-full object-cover" />
              <div className="absolute inset-0 shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black] pointer-events-none" />
              <p className="absolute bottom-2 right-4 text-[10px] font-bold italic text-white/50">Illustration made by Telegram</p>
            </div>
          </div>

          {/* Row 2: The Problem */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 grid grid-cols-2 gap-4 order-2 lg:order-1">
              <div className="relative rounded-[10px] overflow-hidden border border-white/10 aspect-[334/491]">
                <img alt="" src={imgImage4} className="w-full h-full object-cover" />
                <div className="absolute inset-0 shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black] pointer-events-none" />
                <p className="absolute bottom-2 right-4 text-[10px] font-bold italic text-white/50">Illustration made by Telegram</p>
              </div>
              <div className="relative rounded-[10px] overflow-hidden border border-white/10 aspect-[335/491]">
                <img alt="" src={imgImage3} className="w-full h-full object-cover" />
                <div className="absolute inset-0 shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black] pointer-events-none" />
                <p className="absolute bottom-2 right-4 text-[10px] font-bold italic text-white/50">Illustration made by Telegram</p>
              </div>
            </div>
            <div className="lg:col-span-4 space-y-6 order-1 lg:order-2">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">The Problem</h3>
              <div className="text-[16px] font-normal text-gray-300 leading-[22px] tracking-[0.64px] space-y-4">
                <p>Storing files in Telegram isn't always convenient — they get buried in chats. And it's not always private: anyone with access to your device can easily browse those same files.</p>
                <p>Imagine a chat with thousands of files and messages — it quickly becomes an unmanageable mess. People lose track of their files, photos, and saved links.</p>
                <p>You have an incredibly powerful tool at your fingertips — but its implementation makes it nearly impossible to use effectively.</p>
              </div>
            </div>
          </div>

          {/* Row 3: The Solution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">The Solution</h3>
              <div className="text-[16px] font-normal text-gray-300 leading-[22px] tracking-[0.64px] space-y-4">
                <p>Using the official Telegram API, I built a client designed not to replace the official app — but to unlock the full potential of your account's storage.</p>
                <p>You get a familiar file explorer interface with complete, effortless control over your infinite personal cloud. Store files of any size and format, without limits.</p>
                <p>I've gone even further by integrating this cloud directly into your operating system — so you can use it just like any other folder on your computer.</p>
              </div>
            </div>
            <div className="lg:col-span-8 relative rounded-[10px] overflow-hidden border border-white/10 aspect-[838/491]">
              <img alt="" src={imgImage5} className="w-full h-full object-cover" />
              <div className="absolute inset-0 shadow-[inset_0px_0px_20px_20px_black] md:shadow-[inset_0px_0px_50px_50px_black] pointer-events-none" />
              <p className="absolute bottom-2 right-4 text-[10px] font-bold italic text-white/50">Illustration made by Telegram</p>
            </div>
          </div>

        </div>
      </section>

      {/* ─── Section: File Explorer ─── */}
      <section className="bg-gradient-to-t from-[#35c6ff] to-[#09090b] py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Header */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <h2 className="text-[24px] md:text-[30px] font-semibold text-white">What Does Folded Offer?</h2>
            <p className="text-[16px] font-light text-white leading-relaxed">
              Everything you'd expect from a file storage solution — and then some.
            </p>
          </div>

          {/* Intro Flex Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/10 pb-12">
            <div className="max-w-xl space-y-4">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">File Explorer</h3>
              <p className="text-[16px] font-normal text-white/90 leading-[22px] tracking-[0.64px]">
                A fully featured file manager for your entire Saved Messages filesystem. What was once a chat becomes a proper storage drive — with folders, navigation, and the works.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto shrink-0 pt-2">
              <DarkButton label="File Explorer Guide" to="/manual" />
              <DarkButton label="FAQ" to="/manual" />
            </div>
          </div>

          {/* Screenshot Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl max-w-6xl mx-auto bg-black/20 p-1">
            <img alt="Folded file explorer interface" className="w-full h-auto rounded-xl object-contain" src={imgFileExplorer} />
          </div>

          {/* Bullets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Full multi-level folder hierarchy.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Sort, filter, search, and group files by type.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Manage individual files, groups, and entire folders at once.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Copy, paste, duplicate, and move — everything you're used to.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section: Multi-Account ─── */}
      <section className="bg-[#35c6ff] py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Intro Flex Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/20 pb-12">
            <div className="max-w-xl space-y-4">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">Multi-Account</h3>
              <p className="text-[16px] font-normal text-white/90 leading-[22px] tracking-[0.64px]">
                Unlimited storage doesn't mean you're limited to one account. Add as many Telegram accounts as you like — each appears as its own separate drive.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto shrink-0 pt-2">
              <DarkButton label="Account Center Guide" to="/manual" />
              <DarkButton label="FAQ" to="/manual" />
            </div>
          </div>

          {/* Screenshot Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-w-6xl mx-auto bg-black/10 p-1">
            <img alt="Folded multi-account interface" className="w-full h-auto rounded-xl object-contain" src={imgMultiAccount} />
          </div>

          {/* Bullets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              True multi-account support — each account becomes a separate drive.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              Seamlessly work across multiple accounts at the same time.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              See the sync status for each account at a glance.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              View the total storage used on each drive at a glance.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section: Live Backup ─── */}
      <section className="bg-gradient-to-b from-[#35c6ff] to-[#004eff] py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Intro Flex Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/20 pb-12">
            <div className="max-w-xl space-y-4">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">Live Backup</h3>
              <p className="text-[16px] font-normal text-white/90 leading-[22px] tracking-[0.64px]">
                Set up automatic backups for specific folders and always have a fresh copy of your data in the cloud. No more worrying about accidental deletions or unwanted changes.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto shrink-0 pt-2">
              <DarkButton label="Mirroring Manager Guide" to="/manual" />
              <DarkButton label="FAQ" to="/manual" />
            </div>
          </div>

          {/* Screenshot Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-w-6xl mx-auto bg-black/10 p-1">
            <img alt="Folded live backup interface" className="w-full h-auto rounded-xl object-contain" src={imgLiveBackup} />
          </div>

          {/* Bullets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              Continuous backup of selected directories.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              Always-fresh data, synced directly to the cloud.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              Full version history — since storage is infinite, every change is preserved.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/30 pl-4">
              Roll back changes, restore files, and recover deleted data.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Section: System Integration ─── */}
      <section className="bg-gradient-to-b from-[#004eff] to-[#09090b] py-24 text-white">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          {/* Intro Flex Row */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-white/20 pb-12">
            <div className="max-w-xl space-y-4">
              <h3 className="text-[24px] md:text-[30px] font-semibold text-white">System Integration</h3>
              <p className="text-[16px] font-normal text-white/90 leading-[22px] tracking-[0.64px]">
                You don't need to open the app at all — just mount Folded as a virtual drive directly in your OS and use it like any other folder on your computer.
              </p>
            </div>
            <div className="flex flex-col gap-4 w-full md:w-auto shrink-0 pt-2">
              <DarkButton label="Integration Guide" to="/manual" />
              <DarkButton label="FAQ" to="/manual" />
            </div>
          </div>

          {/* Screenshot Container */}
          <div className="relative rounded-2xl overflow-hidden border border-white/20 shadow-2xl max-w-6xl mx-auto bg-black/20 p-1">
            <img alt="Folded system integration screenshot" className="w-full h-auto rounded-xl object-contain" src={imgSystemIntegration} />
          </div>

          {/* Bullets Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Full integration with your system's native file explorer.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              A folder with virtually infinite capacity — it literally never runs out of space.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Zero learning curve — just open and work with your files like you always have.
            </p>
            <p className="text-[16px] font-normal text-white leading-[22px] tracking-[0.64px] border-l-2 border-white/20 pl-4">
              Create shortcuts you can place anywhere on your system.
            </p>
          </div>
        </div>
      </section>

      {/* ─── NEW FEATURES BLOCKS (FAQ & Comparison) ─── */}
      <Comparison />
      <FAQ />

      {/* ─── Section: Get Started ─── */}
      <section className="bg-[#09090b] py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="max-w-xl space-y-4 text-center md:text-left">
            <h2 className="text-[24px] md:text-[30px] font-semibold text-white">How to Get Started</h2>
            <p className="text-[16px] font-light text-white leading-relaxed">
              Folded is a personal hobby project, so it isn't signed by Apple or Microsoft — but installation only takes a few simple steps.
            </p>
          </div>
          <div className="flex flex-col gap-4 w-full md:w-auto shrink-0 items-center">
            <WhiteButton label="Download" to="/download" />
            <WhiteButton label="Installation Guide" to="/manual" />
            <WhiteButton label="FAQ" to="/manual" />
          </div>
        </div>
      </section>

    </div>
  );
}
