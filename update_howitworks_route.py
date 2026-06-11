main_file = "src/main.tsx"
with open(main_file, "r") as f:
    main_content = f.read()

main_content = main_content.replace(
    'import StubPage from "./StubPage.tsx";',
    'import StubPage from "./StubPage.tsx";\nimport HowItWorksPage from "./HowItWorksPage.tsx";'
)

main_content = main_content.replace(
    '<Route path="/how-it-works" element={<StubPage title="How It Works" />} />',
    '<Route path="/how-it-works" element={<HowItWorksPage />} />'
)

with open(main_file, "w") as f:
    f.write(main_content)

print("UPDATED MAIN.TSX")
