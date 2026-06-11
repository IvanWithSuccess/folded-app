import React from "react";

interface FeatureRow {
  name: string;
  folded: string | React.ReactNode;
  telegram: string | React.ReactNode;
  others: string | React.ReactNode;
}

const checkIcon = (
  <span className="text-[#35c6ff] font-bold text-lg inline-flex items-center gap-1">
    ✓
  </span>
);
const crossIcon = <span className="text-red-500 font-bold text-lg">✗</span>;

const comparisonData: FeatureRow[] = [
  {
    name: "Total Storage Capacity",
    folded: <span className="text-white font-semibold">Unlimited (Free)</span>,
    telegram: <span className="text-gray-300">Unlimited (Free)</span>,
    others: <span className="text-gray-400">Paid (subscriptions for more GB)</span>,
  },
  {
    name: "OS Integration (Virtual Drive)",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">Yes, mounts in Finder</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">No, chat view only</span></div>,
    others: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-gray-400">Yes, via sync apps</span></div>,
  },
  {
    name: "Single File Size Limit",
    folded: <div className="text-white">No limits <span className="text-xs text-gray-400 block">(automatic chunking)</span></div>,
    telegram: <div className="text-gray-300">2 GB <span className="text-xs text-gray-500 block">(4 GB with Telegram Premium)</span></div>,
    others: <div className="text-gray-400">Limited by drive quota</div>,
  },
  {
    name: "Media Streaming (No Pre-Download)",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">Yes, in VLC / QuickTime</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">~ <span className="text-gray-400">In-app player only</span></div>,
    others: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-gray-400">Yes</span></div>,
  },
  {
    name: "Multi-Account (Drive aggregation)",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">Yes, multiple drives at once</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">No, profiles are separate</span></div>,
    others: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">No, single account drive</span></div>,
  },
  {
    name: "Live Backup (Folder Mirroring)",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">Automatic background sync</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">No, manual uploads</span></div>,
    others: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-gray-400">Yes, but consumes quota</span></div>,
  },
  {
    name: "Instant Search (Local Index)",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">Yes, SQLite cache</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">Slow remote server search</span></div>,
    others: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-gray-400">Yes</span></div>,
  },
  {
    name: "Privacy & Open Source",
    folded: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-white">100% local & open-source</span></div>,
    telegram: <div className="flex items-center justify-center gap-1">{checkIcon} <span className="text-gray-300">Client is open-source</span></div>,
    others: <div className="flex items-center justify-center gap-1">{crossIcon} <span className="text-gray-400">Closed source, telemetry</span></div>,
  },
];

export default function Comparison() {
  return (
    <section className="bg-gradient-to-b from-[#09090b] to-[#121214] py-20 px-6 border-t border-white/5 font-['Montserrat',sans-serif]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Feature Comparison
          </h2>
          <p className="text-base text-gray-400 font-light">
            Why Folded is much more than just a chat client or a traditional cloud drive.
          </p>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-hidden border border-white/10 rounded-xl bg-white/[0.01]">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="py-5 px-6 text-left text-sm font-semibold text-gray-400 w-1/3">
                  Feature
                </th>
                <th className="py-5 px-6 text-sm font-bold text-white bg-[#35c6ff]/10 border-x border-white/10 w-1/4">
                  Folded Cloud
                </th>
                <th className="py-5 px-6 text-sm font-semibold text-gray-300 w-1/4 border-r border-white/10">
                  Telegram App
                </th>
                <th className="py-5 px-6 text-sm font-semibold text-gray-400 w-1/4">
                  Other Clouds
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, index) => (
                <tr
                  key={index}
                  className="border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition-colors duration-150"
                >
                  <td className="py-5 px-6 text-left text-sm md:text-base font-medium text-white">
                    {row.name}
                  </td>
                  <td className="py-5 px-6 text-sm md:text-base font-semibold bg-[#35c6ff]/5 border-x border-white/5">
                    {row.folded}
                  </td>
                  <td className="py-5 px-6 text-sm md:text-base font-normal text-gray-300 border-r border-white/5">
                    {row.telegram}
                  </td>
                  <td className="py-5 px-6 text-sm md:text-base font-normal text-gray-400">
                    {row.others}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="grid grid-cols-1 gap-6 md:hidden">
          {comparisonData.map((row, index) => (
            <div
              key={index}
              className="border border-white/10 rounded-lg p-5 bg-white/[0.02]"
            >
              <h3 className="text-base font-bold text-white mb-4 border-b border-white/5 pb-2">
                {row.name}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Folded Cloud:</span>
                  <div className="text-right font-semibold">{row.folded}</div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Telegram App:</span>
                  <div className="text-right">{row.telegram}</div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Other Clouds:</span>
                  <div className="text-right">{row.others}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
