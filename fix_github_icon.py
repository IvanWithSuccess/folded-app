import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

pattern = re.compile(r'function Github\(\) \{.*?(?=function Frame8\(\) \{)', re.DOTALL)
match = pattern.search(content)
if match:
    new_code = match.group(0).replace('stroke="white"', 'stroke="currentColor"')
    content = content[:match.start()] + new_code + content[match.end():]
    with open(file_path, "w") as f:
        f.write(content)
    print("Fixed Github icon")
