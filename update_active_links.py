import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. Add useLocation
if "useLocation" not in content:
    content = content.replace("import { Link } from 'react-router';", "import { Link, useLocation } from 'react-router';")

# 2. Change SVGs stroke to currentColor
content = content.replace('stroke="var(--stroke-0, #09090B)"', 'stroke="currentColor"')
content = content.replace('stroke="var(--stroke-0, #09090b)"', 'stroke="currentColor"')
content = content.replace('stroke="var(--stroke-0, white)"', 'stroke="currentColor"')

# 3. Rewrite Frame3
frame3_pattern = re.compile(r'function Frame3\(\) \{.*?(?=function HelpCircle\(\) \{)', re.DOTALL)
frame3_new = """function Frame3() {
  const location = useLocation();
  const isActive = location.pathname === "/";
  return (
    <Link to="/" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <Home />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Home</p>
    </Link>
  );
}

"""
content = frame3_pattern.sub(frame3_new, content)

# 4. Rewrite Frame5
frame5_pattern = re.compile(r'function Frame5\(\) \{.*?(?=function LifeBuoy\(\) \{)', re.DOTALL)
frame5_new = """function Frame5() {
  const location = useLocation();
  const isActive = location.pathname === "/download";
  return (
    <Link to="/download" className={`content-stretch flex gap-[6px] items-center justify-center px-[10px] py-[5px] relative rounded-[5px] shrink-0 w-full sm:w-auto cursor-pointer hover:opacity-80 transition-all ${isActive ? 'bg-white text-[#09090b]' : 'text-white'}`}>
      <Download />
      <p className="[word-break:break-word] font-['Montserrat:SemiBold',sans-serif] font-semibold leading-[normal] relative shrink-0 text-[15px] whitespace-nowrap">Download</p>
    </Link>
  );
}

"""
content = frame5_pattern.sub(frame5_new, content)

with open(file_path, "w") as f:
    f.write(content)

print("Updated active states successfully.")
