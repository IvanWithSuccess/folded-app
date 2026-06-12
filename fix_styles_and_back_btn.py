import os
import re

files_to_update = [
    "src/DownloadPage.tsx",
    "src/InstallMacOSPage.tsx",
    "src/InstallWindowsPage.tsx",
    "src/StubPage.tsx",
    "src/HowItWorksPage.tsx"
]

back_btn_code = """
        <Link to="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors w-fit mb-8">
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </Link>
"""

# To make sure ArrowLeft and Link are imported:
def ensure_imports(content):
    if "import { Link }" not in content and "from 'react-router'" in content:
        content = content.replace("from 'react-router'", ", Link } from 'react-router'") # Not bulletproof but ok
    if "import { Link" not in content and "import {Link" not in content:
        content = "import { Link } from 'react-router';\n" + content
    
    if "ArrowLeft" not in content:
        content = "import { ArrowLeft } from 'lucide-react';\n" + content
    return content

for filepath in files_to_update:
    if not os.path.exists(filepath):
        continue
    with open(filepath, "r") as f:
        content = f.read()

    # 1. Fix the double text-[...] classes
    content = re.sub(r'text-\[16px\](.*?)(text-\[13px\]|text-\[14px\]|text-\[15px\]|text-\[18px\])', r'\1\2', content)

    # Make standard headers slightly smaller on subpages: text-[24px] instead of text-[30px]
    content = content.replace("text-[24px] md:text-[30px]", "text-[20px] md:text-[24px]")
    # Except main page titles, let's restore main titles to 32px/48px
    # Let's just fix the specific giant text. Actually, let's just make all headers standard.
    
    # 2. Add back button
    if "Back to Home" not in content:
        content = ensure_imports(content)
        # Find the main container to insert the back button
        if "<main" in content:
            content = re.sub(r'(<main[^>]*>)', r'\1\n' + back_btn_code, content, count=1)
        else:
            # For pages without <main>, usually inside the first large div after Frame1
            content = re.sub(r'(<Frame1 />\s*</div>\s*<div[^>]*>)', r'\1\n' + back_btn_code, content, count=1)
            # If still not found, try adding after the main flex container
            if "Back to Home" not in content:
                 content = re.sub(r'(w-full max-w-\[1000px\][^>]*>)', r'\1\n' + back_btn_code, content, count=1)

    with open(filepath, "w") as f:
        f.write(content)

print("Styles and back buttons updated.")
