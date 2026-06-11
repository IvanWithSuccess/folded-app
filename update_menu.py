import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Make SVGs use currentColor
def make_current_color(component_name, text):
    pattern = re.compile(rf'function {component_name}\(\) \{{.*?(?=function Frame)', re.DOTALL)
    match = pattern.search(text)
    if match:
        code = match.group(0).replace('stroke="white"', 'stroke="currentColor"')
        text = text[:match.start()] + code + text[match.end():]
    return text

content = make_current_color("HelpCircle", content)
content = make_current_color("LifeBuoy", content)
content = make_current_color("GitMerge", content)

# Frame4 -> How it work
frame4_pattern = re.compile(r'function Frame4\(\) \{.*?(?=function Download\(\) \{)', re.DOTALL)
frame4_new = """function Frame4() {
  const location = useLocation();
  const isActive = location.pathname === "/how-it-works";
  return (
    <Link to="/how-it-works" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <HelpCircle />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">How it work</p>
    </Link>
  );
}

"""
content = frame4_pattern.sub(frame4_new, content)

# Frame6 -> Manual
frame6_pattern = re.compile(r'function Frame6\(\) \{.*?(?=function GitMerge\(\) \{)', re.DOTALL)
frame6_new = """function Frame6() {
  const location = useLocation();
  const isActive = location.pathname === "/manual";
  return (
    <Link to="/manual" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <LifeBuoy />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Manual</p>
    </Link>
  );
}

"""
content = frame6_pattern.sub(frame6_new, content)

# Frame7 -> Updates
frame7_pattern = re.compile(r'function Frame7\(\) \{.*?(?=function Github\(\) \{)', re.DOTALL)
frame7_new = """function Frame7() {
  const location = useLocation();
  const isActive = location.pathname === "/updates";
  return (
    <Link to="/updates" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <GitMerge />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Updates</p>
    </Link>
  );
}

"""
content = frame7_pattern.sub(frame7_new, content)

# Frame8 -> GitHub
frame8_pattern = re.compile(r'function Frame8\(\) \{.*?(?=function Frame9\(\) \{)', re.DOTALL)
frame8_new = """function Frame8() {
  return (
    <a href="https://github.com/folded-app/folded" target="_blank" rel="noopener noreferrer" className="content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all text-white">
      <Github />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">GitHub</p>
    </a>
  );
}

"""
content = frame8_pattern.sub(frame8_new, content)

with open(file_path, "w") as f:
    f.write(content)

print("Menu links updated.")
