import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

replacements = {
    # Frame22
    "What does Folded offer?": "The Folded Experience",
    "You get absolutely all the essential file storage functionality and a bit more.": "Everything you expect from a premium cloud drive, engineered to perfection.",
    
    # Frame16
    "File Explorer</p>": "Native File Explorer</p>",
    "A built-in file manager for your entire Saved Messages file system. Just imagine: what used to be a simple chat will become a fully-fledged drive for storing your data.": "A powerful, built-in manager that transforms your Saved Messages from a simple chat into a fully-fledged, perfectly organized cloud drive.",
    
    # Frame17-20
    "A comprehensive, multi-level file approach to keep your files neatly organized.": "A comprehensive, multi-level folder structure to keep your data perfectly organized.",
    "Sort, filter, search, and segment your files by type instantly.": "Instantly sort, filter, and search through your files with lightning speed.",
    "Batch management of files, file groups, and folders with ease.": "Effortless batch management for files, groups, and entire directories.",
    "Copy, paste, duplicate, and move. Everything exactly as you are used to.": "Copy, paste, and move seamlessly—exactly the way you're used to.",
    
    # Frame29
    "Multi-Account</p>": "Seamless Multi-Account</p>",
    "Although the storage is unlimited, you are not restricted in the number of accounts. You can easily add multiple Telegram accounts, and each will be displayed as a separate drive.": "Why stop at one? Connect multiple Telegram accounts simultaneously, seamlessly utilizing each one as a completely independent drive.",
    
    # Frame30-33
    "Full multi-account support. Need to connect several accounts? No problem, now you have multiple drives.": "Unrestricted multi-account support. Need more drives? Just connect another account.",
    "Convenient operation across multiple accounts simultaneously without constantly logging out.": "Operate across all your accounts at once, without the friction of logging in and out.",
    "Real-time data synchronization status display for each connected account.": "Monitor the real-time synchronization status of every connected account instantly.",
    "Easily view the total storage size of all your files on each individual drive.": "Track the total storage footprint across each of your individual drives at a glance.",
    
    # Frame40
    "Live Backup</p>": "Continuous Live Backup</p>",
    "You can configure backups for specific directories to maintain an always up-to-date version of your data in the cloud. No more fearing that you might accidentally delete or incorrectly modify something.": "Automatically safeguard specific directories to ensure an always up-to-date version of your data lives securely in the cloud. Never fear accidental deletions again.",
    
    # Frame41-44
    "Continuous live backup of selected directories.": "Set up continuous, background live backups for your most important directories.",
    "Always a fresh version of your data directly in the cloud.": "Guarantee a perfectly fresh version of your data is always mirrored in the cloud.",
    "Version history. Since storage is unlimited, we can save the history of changes for directories and files.": "Unlimited version history. We save every iteration of your files because storage is infinite.",
    "Roll back changes, restore files, and recover deleted items effortlessly.": "Effortlessly roll back changes, restore previous versions, or recover deleted items.",
    
    # Frame51
    "System Integration</p>": "Deep System Integration</p>",
    "You don't even have to use the app. You can simply connect the virtual drive directly to your operating system.": "You don't even need to open the app. Connect your Telegram cloud as a virtual drive directly into your operating system for ultimate convenience.",
    
    # Frame52-55
    "Full integration with your native built-in file explorer.": "Flawless integration with your OS's native file explorer (Finder, Explorer).",
    "You get a folder with infinite capacity; it literally stretches.": "Unlock a local folder with genuinely infinite capacity that scales as you need it.",
    "No need to learn anything new - just pick it up and work with your files as usual.": "Zero learning curve. Manage your cloud data exactly as you would any local file.",
    "Create a shortcut and place it absolutely anywhere.": "Pin shortcuts anywhere on your system for instantaneous access to your cloud."
}

for old, new in replacements.items():
    content = content.replace(old, new)

with open(file_path, "w") as f:
    f.write(content)

print("Text replaced successfully.")
