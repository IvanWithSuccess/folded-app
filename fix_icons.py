import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace all currentColor with white globally
content = content.replace('stroke="currentColor"', 'stroke="white"')

# Now target Home and Download specifically
home_pattern = re.compile(r'function Home\(\) \{.*?(?=function Frame3\(\) \{)', re.DOTALL)
home_match = home_pattern.search(content)
if home_match:
    home_code = home_match.group(0).replace('stroke="white"', 'stroke="currentColor"')
    content = content[:home_match.start()] + home_code + content[home_match.end():]

download_pattern = re.compile(r'function Download\(\) \{.*?(?=function Frame5\(\) \{)', re.DOTALL)
download_match = download_pattern.search(content)
if download_match:
    download_code = download_match.group(0).replace('stroke="white"', 'stroke="currentColor"')
    content = content[:download_match.start()] + download_code + content[download_match.end():]

with open(file_path, "w") as f:
    f.write(content)

print("Icons fixed.")
