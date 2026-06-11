import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import imgFileExplorer from "../../imports/Frame28/05185548fab2f91d1b152b059813929b55bddbfa.png";
import imgMultiAccount from "../../imports/Frame28/3bd384c4cd47ce84af03b1cb1c432c2b5d063fcf.png";
import imgLiveBackup from "../../imports/Frame28/394c65866ae1c280eb7c5d72a36bb06178580e35.png";
import imgSystemIntegration from "../../imports/Frame28/8ddc3ef606a4e21eca13a9f7df47d2c148fa343c.png";

export default function Manual() {
  return (
    <div className="bg-[#09090b] min-h-screen text-white pt-28 pb-20 font-['Montserrat',sans-serif]">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-gray-200 to-[#35c6ff] bg-clip-text text-transparent leading-tight">
          User Manual
        </h1>
        <p className="text-base md:text-lg text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
          Step-by-step guides on configuring and getting the most out of Folded Cloud.
        </p>
      </section>

      {/* Tabs Menu */}
      <section className="max-w-6xl mx-auto px-6">
        <Tabs defaultValue="explorer" className="w-full">
          <TabsList className="bg-white/5 border border-white/10 rounded-xl mb-8 flex flex-wrap gap-1 p-1 max-w-full justify-center md:justify-start">
            <TabsTrigger value="explorer" className="px-5 py-2 text-xs md:text-sm font-semibold rounded-lg">
              File Explorer
            </TabsTrigger>
            <TabsTrigger value="accounts" className="px-5 py-2 text-xs md:text-sm font-semibold rounded-lg">
              Account Center
            </TabsTrigger>
            <TabsTrigger value="mirroring" className="px-5 py-2 text-xs md:text-sm font-semibold rounded-lg">
              Mirroring Manager
            </TabsTrigger>
            <TabsTrigger value="integration" className="px-5 py-2 text-xs md:text-sm font-semibold rounded-lg">
              macOS Integration
            </TabsTrigger>
          </TabsList>

          {/* 1. File Explorer Tab */}
          <TabsContent value="explorer" className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Built-In File Explorer</h2>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                  The file explorer interface in the Folded application provides a visual GUI to manage all your files stored in Telegram.
                </p>
                <div className="space-y-4">
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Directory Hierarchy</h4>
                    <p className="text-xs text-gray-400">Create nested folder structures at any level to keep your cloud organized.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Sort & Search</h4>
                    <p className="text-xs text-gray-400">Monomental local index search, sorting by size, type, title, or date added.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Bulk Operations</h4>
                    <p className="text-xs text-gray-400">Select multiple items to perform copy, paste, duplicate, or delete operations.</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-7 border border-white/10 rounded-2xl overflow-hidden bg-black/40 p-1">
                <img src={imgFileExplorer} alt="Folded File Explorer Interface" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          </TabsContent>

          {/* 2. Account Center Tab */}
          <TabsContent value="accounts" className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Account Management Center</h2>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                  Folded is designed as a distributed cluster of nodes. You can link multiple Telegram accounts under a single storage system.
                </p>
                <div className="space-y-4">
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Account Nodes</h4>
                    <p className="text-xs text-gray-400">Each account is added as an independent network drive. Authorization is performed securely via Telegram code.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Parallel Sync</h4>
                    <p className="text-xs text-gray-400">Drag-and-drop files between different accounts directly. The client transfers them between nodes instantly.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Storage Analytics</h4>
                    <p className="text-xs text-gray-400">Monitor storage quotas, number of uploaded files, and connection status for each drive node.</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-7 border border-white/10 rounded-2xl overflow-hidden bg-black/40 p-1">
                <img src={imgMultiAccount} alt="Folded Account Center Interface" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          </TabsContent>

          {/* 3. Mirroring Manager Tab */}
          <TabsContent value="mirroring" className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Mirroring Manager (Live Backup)</h2>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                  Set up real-time mirroring for local directories on your computer to sync directly to your Telegram storage.
                </p>
                <div className="space-y-4">
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Background Daemon</h4>
                    <p className="text-xs text-gray-400">A background file system watcher monitors selected folders and uploads new/modified files instantly.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Version History</h4>
                    <p className="text-xs text-gray-400">Since cloud space is infinite, Folded preserves full history of modifications instead of overwriting files.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Deletions Recovery</h4>
                    <p className="text-xs text-gray-400">Local deletions do not affect files in the cloud. Restore them anytime with one click.</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-7 border border-white/10 rounded-2xl overflow-hidden bg-black/40 p-1">
                <img src={imgLiveBackup} alt="Folded Mirroring Manager Interface" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          </TabsContent>

          {/* 4. macOS Integration Tab */}
          <TabsContent value="integration" className="space-y-8 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-6">
                <h2 className="text-2xl md:text-3xl font-bold text-white">Deep macOS Finder Integration</h2>
                <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                  The most powerful feature of Folded is mounting the storage as a native virtual WebDAV drive, bypassing the need to open the GUI application.
                </p>
                <div className="space-y-4">
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Native Finder Folder</h4>
                    <p className="text-xs text-gray-400">Every connected account is shown in Finder's sidebar. Drag files directly in Finder to upload them.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">Application Compatibility</h4>
                    <p className="text-xs text-gray-400">Open design templates in Photoshop, edit code in VS Code, or watch 4K videos directly from the mounted drive.</p>
                  </div>
                  <div className="border-l-2 border-[#35c6ff] pl-4 space-y-1">
                    <h4 className="font-semibold text-white">System Startup</h4>
                    <p className="text-xs text-gray-400">Enable auto-start on macOS boot. Folded runs as a background menu bar service, keeping the WebDAV bridge active.</p>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-7 border border-white/10 rounded-2xl overflow-hidden bg-black/40 p-1">
                <img src={imgSystemIntegration} alt="Folded Finder System Integration" className="w-full h-auto rounded-xl" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}
