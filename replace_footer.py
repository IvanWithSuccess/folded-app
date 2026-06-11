import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# We need to replace everything from `function Frame73() {` to the end of `function Frame71() {`
pattern = re.compile(r"function Frame73\(\) \{.*?(?=export default function Frame21\(\) \{)", re.DOTALL)

new_footer = """function FooterLink({ href, children }: { href?: string, children: React.ReactNode }) {
  return (
    <a href={href || "#"} className="text-white/60 hover:text-[#35c6ff] transition-colors text-[15px] font-['Montserrat:Regular',sans-serif] cursor-pointer">
      {children}
    </a>
  );
}

function Frame71() {
  return (
    <footer className="bg-[#09090b] w-full flex flex-col items-center pt-24 pb-12 px-4 lg:px-[60px] z-20 relative">
      <div className="w-full max-w-[1320px] flex flex-col md:flex-row justify-between gap-12 md:gap-0">
        
        <div className="flex flex-col items-start gap-6 max-w-sm">
          <Group1 />
          <p className="font-['Montserrat:Regular',sans-serif] text-[15px] leading-[24px] text-white/60">
            Truly unlimited, convenient personal storage directly from your Telegram account. Designed for privacy and infinite scalability.
          </p>
        </div>

        <div className="flex flex-wrap md:flex-nowrap gap-16 md:gap-24">
          <div className="flex flex-col gap-4">
            <p className="font-['Montserrat:SemiBold',sans-serif] text-white text-[16px] mb-2">Product</p>
            <FooterLink>Home</FooterLink>
            <FooterLink>Download</FooterLink>
            <FooterLink>Updates</FooterLink>
            <FooterLink>GitHub</FooterLink>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-['Montserrat:SemiBold',sans-serif] text-white text-[16px] mb-2">Resources</p>
            <FooterLink>How it works</FooterLink>
            <FooterLink>Manual</FooterLink>
            <FooterLink>FAQ</FooterLink>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1320px] mt-20 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-['Montserrat:Regular',sans-serif] text-white/40 text-[14px]">
          © 2026 Folded. Unofficial Telegram Client.
        </p>
        <div className="flex flex-wrap gap-6">
          <FooterLink>Privacy Policy</FooterLink>
          <FooterLink>Terms of Service</FooterLink>
        </div>
      </div>
    </footer>
  );
}

"""

new_content = pattern.sub(new_footer, content)

with open(file_path, "w") as f:
    f.write(new_content)

print("Footer replaced successfully.")
