import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Find all <FrameX /> usages
tags = re.findall(r'<Frame(\d+)', content)
tags = set(tags)

missing = []
for tag in tags:
    # Check if function FrameX( or export function FrameX( exists
    if not re.search(r'function Frame' + tag + r'\(', content):
        missing.append(tag)

if missing:
    print("MISSING FRAMES:", missing)
else:
    print("ALL FRAMES OK")
