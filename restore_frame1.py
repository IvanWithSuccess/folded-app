import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

frame1_2_code = """
export function Frame2() {
  return (
    <div className="bg-white/5 border border-[rgba(255,255,255,0.1)] flex flex-wrap gap-[6px] items-center justify-center p-[6px] relative rounded-[10px] w-full lg:w-auto mt-4 lg:mt-0 z-50">
      <Frame3 />
      <Frame4 />
      <Frame5 />
      <Frame6 />
      <Frame7 />
      <Frame8 />
    </div>
  );
}

export function Frame1() {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between w-full max-w-[1320px] px-4 lg:px-[60px] py-[30px] mx-auto z-50 relative">
      <Group />
      <Frame2 />
    </div>
  );
}

"""

# Insert before Frame9
if "export function Frame1" not in content:
    content = content.replace("function Frame9() {", frame1_2_code + "function Frame9() {")
    with open(file_path, "w") as f:
        f.write(content)
    print("Restored Frame1 and Frame2")
else:
    print("Already there")
