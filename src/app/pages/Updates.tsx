import React from "react";
import { GitCommit, Tag, Calendar } from "lucide-react";

interface Release {
  version: string;
  date: string;
  type: "major" | "minor" | "patch";
  title: string;
  changes: string[];
}

const releasesData: Release[] = [
  {
    version: "v1.2.0",
    date: "June 2026",
    type: "minor",
    title: "Background Crawler & Streaming Improvements",
    changes: [
      "Added autonomous background crawler to automatically scan selected chats and 'Saved Messages' to index newly found files.",
      "Optimized WebDAV bridge: added support for Range Request headers for smooth scrub and stream of heavy video files (4K HDR) without delays.",
      "Implemented MTProto session auto-reconnection for Grammers client when experiencing network drops.",
      "Improved text editor: added Markdown syntax formatting support for cloud notes."
    ]
  },
  {
    version: "v1.1.0",
    date: "May 2026",
    type: "minor",
    title: "Mirroring Manager & Version History",
    changes: [
      "Launched Mirroring Manager (Live Backup) — real-time folder syncing from local directories to Telegram cloud in the background.",
      "Added file versioning: modifying files creates a new message copy in Telegram, allowing rollbacks from the client GUI.",
      "Implemented Telegram Premium quota detection: single file chunk size is automatically bumped to 3.9 GB when a premium subscription is active (1.9 GB default).",
      "Added native Drag & Drop support for folders in the mounted drive, recursing subfolders and directory structures."
    ]
  },
  {
    version: "v1.0.0",
    date: "April 2026",
    type: "major",
    title: "First Public Release (Base Engine)",
    changes: [
      "Implemented native mounting of Telegram account as a virtual WebDAV filesystem drive in Finder.",
      "Created Account Center with support for adding unlimited Telegram nodes.",
      "Developed a visual graphic file explorer supporting directories, sorting, and metadata filtering.",
      "Integrated SQLite local database cache for fast offline indexing of file paths.",
      "Secured encrypted MTProto authentication sessions stored locally on user device."
    ]
  }
];

export default function Updates() {
  return (
    <div className="bg-[#09090b] min-h-screen text-white pt-28 pb-20 font-['Montserrat',sans-serif]">
      {/* Header */}
      <section className="max-w-4xl mx-auto px-6 text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black mb-6 bg-gradient-to-r from-white via-gray-200 to-[#35c6ff] bg-clip-text text-transparent leading-tight">
          Release History
        </h1>
        <p className="text-lg md:text-xl text-gray-400 font-light max-w-2xl mx-auto leading-relaxed">
          Follow the development of Folded Cloud. Here you can find release changelogs, new features, and bug fixes.
        </p>
      </section>

      {/* Timeline */}
      <section className="max-w-3xl mx-auto px-6">
        <div className="relative border-l border-white/10 pl-6 ml-4 space-y-12">
          {releasesData.map((release, index) => (
            <div key={index} className="relative">
              {/* Dot */}
              <span className="absolute -left-[31px] top-1 bg-[#09090b] border-2 border-[#35c6ff] rounded-full size-4 flex items-center justify-center">
                <span className="bg-[#35c6ff] rounded-full size-1.5" />
              </span>

              {/* Version & Date Header */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <span className="flex items-center gap-1 text-xs font-bold font-mono px-2 py-1 bg-[#35c6ff]/10 text-[#35c6ff] border border-[#35c6ff]/20 rounded">
                  <Tag className="size-3" />
                  {release.version}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Calendar className="size-3" />
                  {release.date}
                </span>
                {release.type === "major" && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded">
                    Major Release
                  </span>
                )}
              </div>

              {/* Content Card */}
              <div className="border border-white/10 rounded-xl p-6 bg-white/[0.02] hover:border-white/20 transition-all duration-200">
                <h3 className="text-lg md:text-xl font-bold mb-4 text-white">
                  {release.title}
                </h3>
                <ul className="space-y-3 list-none pl-0">
                  {releasesData[index].changes.map((change, idx) => (
                    <li key={idx} className="flex gap-2 items-start text-sm md:text-base text-gray-400 leading-relaxed">
                      <GitCommit className="size-4 text-[#35c6ff] shrink-0 mt-1" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
