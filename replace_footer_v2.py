import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# We replaced Frame71 previously with a big footer and FooterLink.
# We will match `function FooterLink(.*?)</style>`... wait, no style.
# From `function FooterLink` to the end of `function Frame71() { ... }`

pattern = re.compile(r"function FooterLink.*?function Frame71\(\) \{.*?\}\n", re.DOTALL)

new_footer = """function Frame71() {
  return (
    <footer className="bg-[#09090b] border-t border-white/5 relative w-full flex flex-col items-center py-[60px] md:py-[100px] px-4 z-20">
      <div className="flex flex-col gap-[60px] md:gap-[100px] items-center justify-center w-full max-w-[1440px]">
        
        <div className="flex flex-col gap-[30px] items-center justify-center w-full">
          <Group1 />
          <p className="font-['Montserrat:Light',sans-serif] font-light text-[16px] text-center text-white/60 max-w-[90%] md:max-w-md w-full">
            Truly unlimited, convenient personal storage directly from your Telegram account. Designed for privacy and infinite scalability.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-[12px] sm:gap-[24px] items-center justify-center w-full sm:w-auto">
          <Frame3 />
          <Frame4 />
          <Frame5 />
          <Frame6 />
          <Frame7 />
          <Frame8 />
        </div>

      </div>
    </footer>
  );
}
"""

new_content = pattern.sub(new_footer, content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Footer restored successfully.")
