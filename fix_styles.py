import os
import re

files_to_update = [
    "src/HowItWorksPage.tsx",
    "src/DownloadPage.tsx",
    "src/InstallMacOSPage.tsx",
    "src/InstallWindowsPage.tsx",
    "src/StubPage.tsx"
]

heading2_style = "font-['Montserrat:SemiBold',sans-serif] font-semibold text-[24px] md:text-[30px] text-white"
paragraph_style = "font-['Montserrat:Regular',sans-serif] font-normal leading-[22px] text-[16px] tracking-[0.64px] text-white/70"

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # Normalize paragraph styles
    # Replace common paragraph classes with the exact index.tsx styles
    content = re.sub(r'text-white/70 leading-relaxed text-\[16px\]( md:text-\[18px\])?', paragraph_style, content)
    content = re.sub(r'text-white/70 leading-relaxed(?![a-zA-Z-])', paragraph_style, content)
    
    # Normalize H2 styles
    content = re.sub(r"font-\['Montserrat:SemiBold',sans-serif\] text-\[28px\] md:text-\[36px\] text-white", heading2_style, content)
    content = re.sub(r"font-\['Montserrat:SemiBold',sans-serif\] text-\[24px\] md:text-\[32px\] text-white", heading2_style, content)

    # In DownloadPage.tsx:
    content = content.replace(
        "font-['Montserrat:SemiBold',sans-serif] text-[24px] md:text-[32px] text-white",
        heading2_style
    )

    with open(filepath, "w") as f:
        f.write(content)

print("Styles unified.")
