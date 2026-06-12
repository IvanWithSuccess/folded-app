import re

# 1. Update index.tsx
index_file = "src/imports/Frame28/index.tsx"
with open(index_file, "r") as f:
    content = f.read()

content = content.replace(
    'const isActive = location.pathname === "/manual";',
    'const isActive = location.pathname === "/guide";'
)
content = content.replace(
    '<Link to="/manual"',
    '<Link to="/guide"'
)
content = content.replace(
    '>Manual</p>',
    '>User Guide</p>'
)
with open(index_file, "w") as f:
    f.write(content)


# 2. Update main.tsx
main_file = "src/main.tsx"
with open(main_file, "r") as f:
    content = f.read()

content = content.replace(
    '<Route path="/manual" element={<StubPage title="Manual" />} />',
    'import UserGuidePage from "./UserGuidePage.tsx";\n      <Route path="/guide" element={<UserGuidePage />} />'
)

with open(main_file, "w") as f:
    f.write(content)

print("Renamed routing and menu item.")
