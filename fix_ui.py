import re

file_path = "/Users/ivan/.gemini/antigravity/scratch/folded-app-website/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

# Replace padding
content = content.replace("py-[5px]", "py-[8px]")

# Replace Group
group_bad = re.compile(r'function Group\(\) \{.*?\n\}', re.DOTALL)
group_good = """function Group() {
  return (
    <div className="flex flex-col items-center gap-3 relative shrink-0">
      <div className="h-[100px] w-[93px] relative" data-name="image 1">
        <img alt="" className="absolute inset-0 object-contain pointer-events-none size-full" src={imgImage1} />
      </div>
      <p className="font-['Montserrat:Black',sans-serif] font-black leading-none text-[24px] md:text-[30px] text-white whitespace-nowrap">FOLDED</p>
    </div>
  );
}"""
content = group_bad.sub(group_good, content)

# Replace Group1
group1_bad = re.compile(r'function Group1\(\) \{.*?\n\}', re.DOTALL)
group1_good = """function Group1() {
  return (
    <div className="flex flex-col items-center gap-3 relative shrink-0">
      <div className="h-[100px] w-[93px] relative" data-name="image 1">
        <img alt="" className="absolute inset-0 object-contain pointer-events-none size-full" src={imgImage1} />
      </div>
      <p className="font-['Montserrat:Black',sans-serif] font-black leading-none text-[24px] md:text-[30px] text-white whitespace-nowrap">FOLDED</p>
    </div>
  );
}"""
content = group1_bad.sub(group1_good, content)

with open(file_path, "w") as f:
    f.write(content)
print("FIXED")
