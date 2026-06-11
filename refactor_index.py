import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Add import { Link } from 'react-router'
content = "import { Link } from 'react-router';\n" + content

# Replace Frame3 to use Link to="/"
frame3_pattern = re.compile(r'function Frame3\(\) \{\s*return \(\s*<div([^>]*?)>\s*<Home />\s*<p([^>]*?)>Home</p>\s*</div>\s*\);\s*\}', re.DOTALL)
content = frame3_pattern.sub(r'function Frame3() {\n  return (\n    <Link to="/"\1>\n      <Home />\n      <p\2>Home</p>\n    </Link>\n  );\n}', content)

# Replace Frame5 to use Link to="/download"
frame5_pattern = re.compile(r'function Frame5\(\) \{\s*return \(\s*<div([^>]*?)>\s*<Download />\s*<p([^>]*?)>Download</p>\s*</div>\s*\);\s*\}', re.DOTALL)
content = frame5_pattern.sub(r'function Frame5() {\n  return (\n    <Link to="/download"\1>\n      <Download />\n      <p\2>Download</p>\n    </Link>\n  );\n}', content)

# Export Frame1 and Frame71
content = content.replace("function Frame1() {", "export function Frame1() {")
content = content.replace("function Frame71() {", "export function Frame71() {")
content = content.replace("export default function Frame21() {", "export default function HomePage() {")

with open(file_path, "w") as f:
    f.write(content)

print("Refactored index.tsx")
