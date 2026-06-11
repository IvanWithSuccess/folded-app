import re

# Update main.tsx
main_file = "src/main.tsx"
with open(main_file, "r") as f:
    main_content = f.read()

main_content = main_content.replace(
    'import StubPage from "./StubPage.tsx";',
    'import StubPage from "./StubPage.tsx";\nimport InstallMacOSPage from "./InstallMacOSPage.tsx";\nimport InstallWindowsPage from "./InstallWindowsPage.tsx";'
)

main_content = main_content.replace(
    '<Route path="/download" element={<DownloadPage />} />',
    '<Route path="/download" element={<DownloadPage />} />\n      <Route path="/install/macos" element={<InstallMacOSPage />} />\n      <Route path="/install/windows" element={<InstallWindowsPage />} />'
)

with open(main_file, "w") as f:
    f.write(main_content)

# Update DownloadPage.tsx
download_file = "src/DownloadPage.tsx"
with open(download_file, "r") as f:
    dl_content = f.read()

dl_content = dl_content.replace(
    "import { Apple, Monitor, Download as DownloadIcon, AlertTriangle, Info } from 'lucide-react';",
    "import { Apple, Monitor, Download as DownloadIcon, AlertTriangle, Info } from 'lucide-react';\nimport { Link } from 'react-router';"
)

macos_guide_old = """                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Guide</p>
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
                </div>"""

macos_guide_new = """                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Instructions</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>macOS may block Folded by default since it's an independent app. Don't worry, it's completely safe! Follow our detailed step-by-step guide to install the app correctly.</p>
                  <Link to="/install/macos" className="mt-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 px-4 rounded-lg text-center font-['Montserrat:SemiBold',sans-serif] hover:bg-orange-500/20 transition-all no-underline w-fit">
                    Read Installation Guide
                  </Link>
                </div>"""

windows_guide_old = """                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Guide</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>Windows might show a blue warning screen saying "Windows protected your PC". This is normal for new apps! To install safely:</p>
                  
                  <ol className="list-decimal list-outside ml-4 flex flex-col gap-2">
                    <li>Run the Folded installer file.</li>
                    <li>When the blue warning appears, click on the <strong>"More info"</strong> text link.</li>
                    <li>A new button will appear. Click <strong>"Run anyway"</strong>.</li>
                  </ol>
                </div>"""

windows_guide_new = """                <p className="font-['Montserrat:SemiBold',sans-serif] text-[16px] text-orange-400">Installation Instructions</p>
                <div className="text-white/70 leading-relaxed flex flex-col gap-3">
                  <p>Windows Defender SmartScreen might show a blue warning screen for new apps like Folded. This is normal! Follow our detailed guide to bypass it safely.</p>
                  <Link to="/install/windows" className="mt-2 bg-orange-500/10 text-orange-400 border border-orange-500/20 py-2.5 px-4 rounded-lg text-center font-['Montserrat:SemiBold',sans-serif] hover:bg-orange-500/20 transition-all no-underline w-fit">
                    Read Installation Guide
                  </Link>
                </div>"""

dl_content = dl_content.replace(macos_guide_old, macos_guide_new)
dl_content = dl_content.replace(windows_guide_old, windows_guide_new)

with open(download_file, "w") as f:
    f.write(dl_content)

print("UPDATED ROUTING AND DL PAGE")
