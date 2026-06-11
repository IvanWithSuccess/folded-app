import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Find all uppercase tags
tags = re.findall(r'<([A-Z][a-zA-Z0-9]+)', content)
tags = set(tags)

missing = []
for tag in tags:
    # Ignore built-in components like Link, Route, BrowserRouter
    if tag in ["Link", "Route", "BrowserRouter", "Routes"]:
        continue
    # Check if function Tag( or export function Tag( exists
    if not re.search(r'function ' + tag + r'\(', content):
        missing.append(tag)

if missing:
    print("MISSING COMPONENTS:", missing)
else:
    print("ALL COMPONENTS OK")
