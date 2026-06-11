import re

file_path = "/Users/ivan/Documents/antigravity/Folded website/Improve Telegram Client Design/src/imports/Frame28/index.tsx"
with open(file_path, "r") as f:
    content = f.read()

frame_code = """
function Frame() {
  return (
    <div className="bg-[#09090b] h-auto min-h-[800px] overflow-clip relative shrink-0 w-full flex flex-col items-center">
      <div className="absolute h-[842px] left-1/2 -translate-x-1/2 top-[calc(50%-10px)] w-[1206.327px] pointer-events-none">
        <img alt="" className="absolute inset-0 max-w-none object-cover size-full opacity-60" src={img202604292143111} />
      </div>
      <div className="w-full z-50">
        <Frame1 />
      </div>
      <div className="content-stretch flex flex-col gap-[60px] md:gap-[100px] items-center justify-center w-full z-10 mt-20 md:mt-32 px-4">
        <Frame13 />
      </div>
    </div>
  );
}

"""

if "function Frame(" not in content:
    content = content.replace("function Frame9() {", frame_code + "function Frame9() {")
    with open(file_path, "w") as f:
        f.write(content)
    print("Restored Frame")
else:
    print("Already there")
